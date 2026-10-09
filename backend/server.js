require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dbHelper = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dental-secret-key-12345';

const publicDir = fs.existsSync(path.join(__dirname, '../public'))
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../frontend');

app.use(express.json());
app.use(cookieParser());
app.use(express.static(publicDir));

// CORS & Preflight handling
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Normalize route prefix for serverless environments (handles both /api/* and /*)
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/static') && !req.url.startsWith('/favicon.ico')) {
    const apiPrefixes = [
      '/auth', '/dentists', '/patients', '/appointments', '/treatments',
      '/treatment-plans', '/invoices', '/payments', '/leads', '/follow-ups',
      '/prescriptions', '/stock', '/dentist-availability', '/stats',
      '/ai-notes-helper', '/ai-optimize-treatment-plan', '/users', '/health'
    ];
    if (apiPrefixes.some(p => req.url === p || req.url.startsWith(p + '/') || req.url.startsWith(p + '?'))) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Health check endpoints
app.get('/api', (req, res) => res.json({ status: 'ok', service: 'Dental Clinic Management API' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', isMySQL: dbHelper.isMySQL, timestamp: new Date().toISOString() }));

// --- Authentication Middleware ---
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied. Please log in.' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.clearCookie('token');
    res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }
    next();
  };
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, firstName, lastName, phone } = req.body;
  if (!email || !password || !role || !firstName || !lastName) {
    return res.status(400).json({ error: 'All mandatory fields are required.' });
  }

  try {
    const existing = await dbHelper.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered.' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await dbHelper.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)`,
      [email, hash, role, firstName, lastName, phone]
    );

    // If registered as patient, auto-create a patient record linked to user
    if (role === 'patient') {
      await dbHelper.run(
        `INSERT INTO patients (user_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)`,
        [result.id, firstName, lastName, email, phone]
      );
    } else if (role === 'dentist') {
      await dbHelper.run(
        `INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES (?, 'General Dentistry', 'LIC-TBD', '#3b82f6')`,
        [result.id]
      );
    }

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const user = await dbHelper.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPass = bcrypt.compareSync(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: 'Invalid email or password.' });

    // Link patient/dentist ID if relevant
    let relatedId = null;
    if (user.role === 'patient') {
      const patient = await dbHelper.get('SELECT id FROM patients WHERE user_id = ?', [user.id]);
      if (patient) relatedId = patient.id;
    } else if (user.role === 'dentist') {
      const dentist = await dbHelper.get('SELECT id FROM dentists WHERE user_id = ?', [user.id]);
      if (dentist) relatedId = dentist.id;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: `${user.first_name} ${user.last_name}`, relatedId },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in prod (HTTPS)
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`,
      relatedId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Password Reset Memory Store & Routes ---
const resetCodesStore = new Map();

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please enter your account email address.' });
  }

  try {
    const user = await dbHelper.get('SELECT id, email, first_name FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodesStore.set(email.trim().toLowerCase(), {
      code,
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes validity
    });

    console.log(`[Password Reset] Verification code for ${email}: ${code}`);

    res.json({
      message: `Verification code generated successfully for ${user.first_name}.`,
      resetCode: code
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = resetCodesStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'No reset code requested for this email. Please request a code first.' });
  }

  if (Date.now() > record.expires) {
    resetCodesStore.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
  }

  if (record.code !== resetCode.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your code and try again.' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    await dbHelper.run('UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)', [hash, cleanEmail]);
    resetCodesStore.delete(cleanEmail);

    res.json({ message: 'Password updated successfully! You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    res.json({ loggedIn: true, user: verified });
  } catch (err) {
    res.clearCookie('token');
    res.status(401).json({ loggedIn: false });
  }
});

// --- Patient Routes ---
app.get('/api/patients', authenticateToken, requireRole(['admin', 'dentist', 'staff']), async (req, res) => {
  try {
    const queryStr = req.query.q;
    let patients;
    
    let query = `SELECT DISTINCT p.* FROM patients p`;
    let conditions = [];
    let params = [];
    
    if (req.user.role === 'dentist' && req.query.assignedOnly === 'true') {
      conditions.push(`(p.id IN (SELECT patient_id FROM appointments WHERE dentist_id = ?) OR p.id IN (SELECT patient_id FROM treatment_plans WHERE dentist_id = ?))`);
      params.push(req.user.relatedId, req.user.relatedId);
    }
    
    if (queryStr) {
      conditions.push(`(p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)`);
      params.push(`%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`);
    }
    
    if (conditions.length) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    query += ` ORDER BY p.last_name ASC`;
    patients = await dbHelper.query(query, params);
    
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Patient 360 View: Fetch all details about a single patient
app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  const patientId = req.params.id;
  
  // Patients can only access their own profile
  if (req.user.role === 'patient' && String(req.user.relatedId) !== String(patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const patient = await dbHelper.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    // Fetch medical records/allergies already in profile, plus appointments
    const appointments = await dbHelper.query(
      `SELECT a.*, u.first_name AS dentist_first, u.last_name AS dentist_last 
       FROM appointments a 
       JOIN dentists d ON a.dentist_id = d.id 
       JOIN users u ON d.user_id = u.id 
       WHERE a.patient_id = ? 
       ORDER BY a.start_time DESC`,
      [patientId]
    );

    // Fetch treatment plans
    const treatmentPlans = await dbHelper.query(
      `SELECT tp.*, u.first_name AS dentist_first, u.last_name AS dentist_last
       FROM treatment_plans tp
       JOIN dentists d ON tp.dentist_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE tp.patient_id = ?
       ORDER BY tp.created_at DESC`,
      [patientId]
    );

    // For each plan, fetch items
    for (let plan of treatmentPlans) {
      plan.items = await dbHelper.query(
        `SELECT tpi.*, t.name AS treatment_name 
         FROM treatment_plan_items tpi
         JOIN treatments t ON tpi.treatment_id = t.id
         WHERE tpi.treatment_plan_id = ?`,
        [plan.id]
      );
    }

    // Fetch invoices and payments
    const invoices = await dbHelper.query(
      `SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC`,
      [patientId]
    );

    res.json({
      patient,
      appointments,
      treatmentPlans,
      invoices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { firstName, lastName, email, phone, dateOfBirth, gender, address, allergies, notes } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name required.' });

  try {
    const result = await dbHelper.run(
      `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, gender, address, medical_allergies, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, phone, dateOfBirth, gender, address, allergies, notes]
    );
    res.status(201).json({ id: result.id, message: 'Patient profile created.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/patients/:id', authenticateToken, requireRole(['admin', 'staff', 'dentist']), async (req, res) => {
  const { firstName, lastName, email, phone, dateOfBirth, gender, address, allergies, notes } = req.body;
  try {
    await dbHelper.run(
      `UPDATE patients SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, gender = ?, address = ?, medical_allergies = ?, notes = ? WHERE id = ?`,
      [firstName, lastName, email, phone, dateOfBirth, gender, address, allergies, notes, req.params.id]
    );
    res.json({ message: 'Patient profile updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/patients/:id', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const patientId = req.params.id;
  try {
    const patient = await dbHelper.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // 1. Delete treatment plan items & treatment plans
    const plans = await dbHelper.query('SELECT id FROM treatment_plans WHERE patient_id = ?', [patientId]);
    for (const plan of plans) {
      await dbHelper.run('DELETE FROM treatment_plan_items WHERE treatment_plan_id = ?', [plan.id]);
    }
    await dbHelper.run('DELETE FROM treatment_plans WHERE patient_id = ?', [patientId]);

    // 2. Delete payments & invoices
    const invoices = await dbHelper.query('SELECT id FROM invoices WHERE patient_id = ?', [patientId]);
    for (const inv of invoices) {
      await dbHelper.run('DELETE FROM payments WHERE invoice_id = ?', [inv.id]);
    }
    await dbHelper.run('DELETE FROM invoices WHERE patient_id = ?', [patientId]);

    // 3. Delete appointments
    await dbHelper.run('DELETE FROM appointments WHERE patient_id = ?', [patientId]);

    // 4. Delete prescriptions
    await dbHelper.run('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);

    // 5. Delete follow-ups
    await dbHelper.run('DELETE FROM follow_ups WHERE patient_id = ?', [patientId]);

    // 6. Delete the patient record
    await dbHelper.run('DELETE FROM patients WHERE id = ?', [patientId]);

    // 7. If linked to a user account with role 'patient', delete the linked user account as well
    if (patient.user_id) {
      await dbHelper.run('DELETE FROM users WHERE id = ? AND role = ?', [patient.user_id, 'patient']);
    }

    res.json({ message: 'Patient and all associated records deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Dentist Routes ---
app.get('/api/dentists', authenticateToken, async (req, res) => {
  try {
    const dentists = await dbHelper.query(
      `SELECT d.id, u.first_name, u.last_name, d.specialization, d.color_code 
       FROM dentists d 
       JOIN users u ON d.user_id = u.id`
    );
    res.json(dentists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Appointment Routes ---
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === 'patient') {
      appointments = await dbHelper.query(
        `SELECT a.*, u.first_name AS dentist_first, u.last_name AS dentist_last 
         FROM appointments a
         JOIN dentists d ON a.dentist_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE a.patient_id = ? ORDER BY a.start_time ASC`,
        [req.user.relatedId]
      );
    } else {
      appointments = await dbHelper.query(
        `SELECT a.*, p.first_name AS patient_first, p.last_name AS patient_last, p.phone AS patient_phone,
                u.first_name AS dentist_first, u.last_name AS dentist_last, d.color_code
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN dentists d ON a.dentist_id = d.id
         JOIN users u ON d.user_id = u.id
         ORDER BY a.start_time ASC`
      );
    }
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patientId, dentistId, startTime, endTime, notes } = req.body;
  if (!dentistId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Dentist, start time, and end time are required.' });
  }

  let finalPatientId = patientId;

  // Patients booking for themselves
  if (req.user.role === 'patient') {
    finalPatientId = req.user.relatedId;
  }

  if (!finalPatientId) {
    return res.status(400).json({ error: 'Patient ID is required.' });
  }

  try {
    // Check dentist availability
    const apptDate = new Date(startTime);
    const dayOfWeek = apptDate.getDay();
    const apptTimeStr = String(apptDate.getHours()).padStart(2, '0') + ':' + String(apptDate.getMinutes()).padStart(2, '0');
    
    const hasAnyAvail = await dbHelper.get(
      `SELECT id FROM dentist_availability WHERE dentist_id = ?`,
      [dentistId]
    );
    
    if (hasAnyAvail) {
      const avail = await dbHelper.query(
        `SELECT * FROM dentist_availability WHERE dentist_id = ? AND day_of_week = ?`,
        [dentistId, dayOfWeek]
      );
      if (!avail || avail.length === 0) {
        return res.status(400).json({ error: 'The dentist is off-duty on this day.' });
      }
      const match = avail.find(s => apptTimeStr >= s.start_hour && apptTimeStr < s.end_hour);
      if (!match) {
        return res.status(400).json({ error: 'The dentist is not scheduled to work during this time slot.' });
      }
    }

    // Check dentist conflict
    const conflict = await dbHelper.get(
      `SELECT id FROM appointments 
       WHERE dentist_id = ? AND status = 'scheduled'
       AND ((start_time < ? AND end_time > ?) OR (start_time >= ? AND start_time < ?))`,
      [dentistId, endTime, startTime, startTime, endTime]
    );

    if (conflict) {
      return res.status(409).json({ error: 'The dentist has a scheduling conflict at this time.' });
    }

    const initialStatus = req.user.role === 'patient' ? 'pending' : 'scheduled';
    const result = await dbHelper.run(
      `INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [finalPatientId, dentistId, startTime, endTime, initialStatus, notes]
    );

    res.status(201).json({ id: result.id, message: 'Appointment booked successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  const { status, startTime, endTime, notes } = req.body;
  
  try {
    const appt = await dbHelper.get('SELECT patient_id, dentist_id FROM appointments WHERE id = ?', [req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    // Patients can only cancel their own appointments
    if (req.user.role === 'patient' && String(req.user.relatedId) !== String(appt.patient_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (req.user.role === 'patient') {
      // Patients can only cancel appointments
      if (status !== 'cancelled') {
        return res.status(400).json({ error: 'Patients can only cancel appointments.' });
      }
      await dbHelper.run(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    } else {
      // Staff/Dentist/Admin can update everything
      if (startTime && endTime) {
        // Check dentist availability
        const apptDate = new Date(startTime);
        const dayOfWeek = apptDate.getDay();
        const apptTimeStr = String(apptDate.getHours()).padStart(2, '0') + ':' + String(apptDate.getMinutes()).padStart(2, '0');
        
        const hasAnyAvail = await dbHelper.get(
          `SELECT id FROM dentist_availability WHERE dentist_id = ?`,
          [appt.dentist_id]
        );
        
        if (hasAnyAvail) {
          const avail = await dbHelper.query(
            `SELECT * FROM dentist_availability WHERE dentist_id = ? AND day_of_week = ?`,
            [appt.dentist_id, dayOfWeek]
          );
          if (!avail || avail.length === 0) {
            return res.status(400).json({ error: 'The dentist is off-duty on this day.' });
          }
          const match = avail.find(s => apptTimeStr >= s.start_hour && apptTimeStr < s.end_hour);
          if (!match) {
            return res.status(400).json({ error: 'The dentist is not scheduled to work during this time slot.' });
          }
        }

        // Check conflict excluding current appointment
        const conflict = await dbHelper.get(
          `SELECT id FROM appointments 
           WHERE dentist_id = ? AND status = 'scheduled' AND id != ?
           AND ((start_time < ? AND end_time > ?) OR (start_time >= ? AND start_time < ?))`,
          [appt.dentist_id, req.params.id, endTime, startTime, startTime, endTime]
        );
        if (conflict) {
          return res.status(409).json({ error: 'The dentist has a scheduling conflict at this time.' });
        }

        await dbHelper.run(
          `UPDATE appointments SET start_time = ?, end_time = ?, status = ?, notes = ? WHERE id = ?`,
          [startTime, endTime, status || 'scheduled', notes, req.params.id]
        );
      } else {
        await dbHelper.run(
          `UPDATE appointments SET status = ?, notes = ? WHERE id = ?`,
          [status, notes, req.params.id]
        );
      }
    }

    res.json({ message: 'Appointment updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Dentist Availability ---
app.get('/api/dentists/:id/availability', authenticateToken, async (req, res) => {
  try {
    const list = await dbHelper.query(
      `SELECT * FROM dentist_availability WHERE dentist_id = ? ORDER BY day_of_week ASC`,
      [req.params.id]
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dentists/:id/availability', authenticateToken, requireRole(['admin']), async (req, res) => {
  const dentistId = req.params.id;
  const { shifts } = req.body; // Array of { dayOfWeek: INT, startHour: STRING, endHour: STRING }
  
  try {
    await dbHelper.run(`DELETE FROM dentist_availability WHERE dentist_id = ?`, [dentistId]);
    
    if (shifts && shifts.length) {
      for (const s of shifts) {
        await dbHelper.run(
          `INSERT INTO dentist_availability (dentist_id, day_of_week, start_hour, end_hour) VALUES (?, ?, ?, ?)`,
          [dentistId, s.dayOfWeek, s.startHour, s.endHour]
        );
      }
    }
    
    res.json({ message: 'Dentist availability updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Treatments (Catalog) ---
app.get('/api/treatments', authenticateToken, async (req, res) => {
  try {
    const treatments = await dbHelper.query(`SELECT * FROM treatments ORDER BY name ASC`);
    res.json(treatments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plans', authenticateToken, async (req, res) => {
  try {
    let plans;
    if (req.user.role === 'dentist') {
      plans = await dbHelper.query(
        `SELECT tp.*, p.first_name AS patient_first, p.last_name AS patient_last FROM treatment_plans tp
         JOIN patients p ON tp.patient_id = p.id
         WHERE tp.dentist_id = ? ORDER BY tp.created_at DESC`,
        [req.user.relatedId]
      );
    } else if (req.user.role === 'patient') {
      plans = await dbHelper.query(
        `SELECT tp.*, u.first_name AS dentist_first, u.last_name AS dentist_last FROM treatment_plans tp
         JOIN dentists d ON tp.dentist_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE tp.patient_id = ? ORDER BY tp.created_at DESC`,
        [req.user.relatedId]
      );
    } else {
      plans = await dbHelper.query(
        `SELECT tp.*, p.first_name AS patient_first, p.last_name AS patient_last,
                u.first_name AS dentist_first, u.last_name AS dentist_last
         FROM treatment_plans tp
         JOIN patients p ON tp.patient_id = p.id
         JOIN dentists d ON tp.dentist_id = d.id
         JOIN users u ON d.user_id = u.id
         ORDER BY tp.created_at DESC`
      );
    }
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Treatment Plans ---
app.post('/api/plans', authenticateToken, requireRole(['admin', 'dentist']), async (req, res) => {
  const { patientId, dentistId, title, items } = req.body;
  if (!patientId || !dentistId || !title || !items || !items.length) {
    return res.status(400).json({ error: 'Patient, dentist, plan title, and treatment items are required.' });
  }

  try {
    let totalCost = 0.0;
    items.forEach(item => { totalCost += parseFloat(item.cost || 0); });

    // 1. Create plan
    const planResult = await dbHelper.run(
      `INSERT INTO treatment_plans (patient_id, dentist_id, title, status, total_cost) VALUES (?, ?, 'active', ?)`,
      [patientId, dentistId, title, totalCost]
    );
    const planId = planResult.id;

    // 2. Insert items
    const stmtItem = dbHelper.db.prepare(
      `INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_number, notes, cost, status) VALUES (?, ?, ?, ?, ?, 'pending')`
    );
    items.forEach(item => {
      stmtItem.run(planId, item.treatmentId, item.toothNumber, item.notes, item.cost);
    });
    stmtItem.finalize();

    res.status(201).json({ id: planId, message: 'Treatment plan created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle treatment item status (completed/pending)
app.put('/api/plans/items/:itemId', authenticateToken, requireRole(['admin', 'dentist']), async (req, res) => {
  const itemId = req.params.itemId;
  const { status } = req.body; // 'completed' or 'pending'

  try {
    const item = await dbHelper.get(
      `SELECT tpi.*, tp.patient_id, tp.id AS plan_id FROM treatment_plan_items tpi
       JOIN treatment_plans tp ON tpi.treatment_plan_id = tp.id 
       WHERE tpi.id = ?`,
      [itemId]
    );
    if (!item) return res.status(404).json({ error: 'Treatment plan item not found.' });

    await dbHelper.run(`UPDATE treatment_plan_items SET status = ? WHERE id = ?`, [status, itemId]);

    // If item completed, auto-generate an unpaid invoice for this specific treatment item
    if (status === 'completed') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
      
      const invoiceResult = await dbHelper.run(
        `INSERT INTO invoices (treatment_plan_id, patient_id, amount_due, discount, tax, total_amount, amount_paid, status, due_date) 
         VALUES (?, ?, ?, 0.0, 0.0, ?, 0.0, 'unpaid', ?)`,
        [item.plan_id, item.patient_id, item.cost, item.cost, dueDate.toISOString().split('T')[0]]
      );
      
      return res.json({ message: 'Item completed. Invoice generated.', invoiceId: invoiceResult.id });
    }

    res.json({ message: 'Item status updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Invoicing & Payments ---
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    let invoices;
    if (req.user.role === 'patient') {
      invoices = await dbHelper.query(
        `SELECT i.*, tp.title AS plan_title FROM invoices i
         LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
         WHERE i.patient_id = ? ORDER BY i.created_at DESC`,
        [req.user.relatedId]
      );
    } else {
      invoices = await dbHelper.query(
        `SELECT i.*, p.first_name, p.last_name, tp.title AS plan_title 
         FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
         ORDER BY i.created_at DESC`
      );
    }
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch detailed single invoice
app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await dbHelper.get(
      `SELECT i.*, p.first_name, p.last_name, p.phone, p.email, p.address 
       FROM invoices i 
       JOIN patients p ON i.patient_id = p.id 
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    // Patients can only see their own invoices
    if (req.user.role === 'patient' && String(req.user.relatedId) !== String(invoice.patient_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payments = await dbHelper.query(
      `SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ invoice, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a payment to an invoice
app.post('/api/invoices/:id/payments', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const invoiceId = req.params.id;
  const { amount, paymentMethod, transactionRef } = req.body;

  if (!amount || amount <= 0 || !paymentMethod) {
    return res.status(400).json({ error: 'Valid payment amount and method are required.' });
  }

  try {
    const invoice = await dbHelper.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const maxCollect = invoice.total_amount - invoice.amount_paid;
    if (amount > maxCollect) {
      return res.status(400).json({ error: `Payment exceeds balance due. Max payable is $${maxCollect}` });
    }

    // 1. Record payment
    await dbHelper.run(
      `INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref) VALUES (?, ?, ?, ?)`,
      [invoiceId, amount, paymentMethod, transactionRef]
    );

    // 2. Update invoice amount_paid and status
    const newPaid = invoice.amount_paid + parseFloat(amount);
    let newStatus = 'partially_paid';
    if (newPaid >= invoice.total_amount) {
      newStatus = 'paid';
    }

    await dbHelper.run(
      `UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?`,
      [newPaid, newStatus, invoiceId]
    );

    res.status(201).json({ message: 'Payment recorded successfully.', newPaid, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CRM & Leads Routes ---
app.get('/api/leads', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const leads = await dbHelper.query(`SELECT * FROM leads ORDER BY created_at DESC`);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { firstName, lastName, email, phone, source } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required.' });

  try {
    const result = await dbHelper.run(
      `INSERT INTO leads (first_name, last_name, email, phone, source, status) VALUES (?, ?, ?, ?, ?, 'new')`,
      [firstName, lastName, email, phone, source]
    );
    res.status(201).json({ id: result.id, message: 'CRM Lead created.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { status, email, phone } = req.body;
  try {
    await dbHelper.run(
      `UPDATE leads SET status = ?, email = ?, phone = ? WHERE id = ?`,
      [status, email, phone, req.params.id]
    );

    // If converted to patient, auto-create patient profile
    if (status === 'converted') {
      const lead = await dbHelper.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
      const exist = await dbHelper.get('SELECT id FROM patients WHERE email = ?', [lead.email]);
      if (!exist) {
        await dbHelper.run(
          `INSERT INTO patients (first_name, last_name, email, phone, notes) VALUES (?, ?, ?, ?, ?)`,
          [lead.first_name, lead.last_name, lead.email, lead.phone, `Converted from Lead Source: ${lead.source}`]
        );
      }
    }

    res.json({ message: 'Lead updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-ups
app.get('/api/followups', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const followups = await dbHelper.query(
      `SELECT f.*, p.first_name AS pat_first, p.last_name AS pat_last,
              l.first_name AS lead_first, l.last_name AS lead_last,
              u.first_name AS staff_first, u.last_name AS staff_last
       FROM follow_ups f
       LEFT JOIN patients p ON f.patient_id = p.id
       LEFT JOIN leads l ON f.lead_id = l.id
       LEFT JOIN users u ON f.assigned_to = u.id
       ORDER BY f.scheduled_date ASC`
    );
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/followups', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { patientId, leadId, assignedTo, scheduledDate, notes } = req.body;
  try {
    await dbHelper.run(
      `INSERT INTO follow_ups (patient_id, lead_id, assigned_to, scheduled_date, notes, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [patientId || null, leadId || null, assignedTo || req.user.id, scheduledDate, notes]
    );
    res.status(201).json({ message: 'Follow-up task scheduled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/followups/:id', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { status, notes } = req.body;
  try {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    await dbHelper.run(
      `UPDATE follow_ups SET status = ?, notes = ?, completed_at = ? WHERE id = ?`,
      [status, notes, completedAt, req.params.id]
    );
    res.json({ message: 'Follow-up updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Prescriptions Routes ---
app.get('/api/prescriptions', authenticateToken, async (req, res) => {
  try {
    const list = await dbHelper.query(
      `SELECT pr.*, 
              p.first_name AS pat_first, p.last_name AS pat_last,
              u.first_name AS dent_first, u.last_name AS dent_last
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN dentists d ON pr.dentist_id = d.id
       JOIN users u ON d.user_id = u.id
       ORDER BY pr.created_at DESC`
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prescriptions', authenticateToken, requireRole(['admin', 'dentist']), async (req, res) => {
  const { patientId, dentistId, medication, dosage, instructions } = req.body;
  if (!patientId || !dentistId || !medication) {
    return res.status(400).json({ error: 'Patient, dentist, and medication are required.' });
  }
  try {
    const result = await dbHelper.run(
      `INSERT INTO prescriptions (patient_id, dentist_id, medication, dosage, instructions, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId, dentistId, medication, dosage || '', instructions || '', new Date().toISOString()]
    );
    res.status(201).json({ id: result.id, message: 'Prescription written successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/prescriptions/:id', authenticateToken, requireRole(['admin', 'dentist']), async (req, res) => {
  try {
    await dbHelper.run(`DELETE FROM prescriptions WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Prescription deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Treatments Catalog (Service Packages) Routes ---
app.post('/api/treatments', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { name, description, baseCost } = req.body;
  if (!name || baseCost === undefined) {
    return res.status(400).json({ error: 'Treatment name and base cost are required.' });
  }
  try {
    const result = await dbHelper.run(
      `INSERT INTO treatments (name, description, base_cost) VALUES (?, ?, ?)`,
      [name, description || '', baseCost]
    );
    res.status(201).json({ id: result.id, message: 'Service added to catalog.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/treatments/:id', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { name, description, baseCost } = req.body;
  if (!name || baseCost === undefined) {
    return res.status(400).json({ error: 'Treatment name and base cost are required.' });
  }
  try {
    await dbHelper.run(
      `UPDATE treatments SET name = ?, description = ?, base_cost = ? WHERE id = ?`,
      [name, description || '', baseCost, req.params.id]
    );
    res.json({ message: 'Service updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/treatments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await dbHelper.run(`DELETE FROM treatments WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Service removed from catalog.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Medical Stock Inventory Routes ---
app.get('/api/stock', authenticateToken, requireRole(['admin', 'staff', 'dentist']), async (req, res) => {
  try {
    const list = await dbHelper.query(`SELECT * FROM stock ORDER BY item_name ASC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  const { itemName, category, quantity, unit, reorderLevel } = req.body;
  if (!itemName || quantity === undefined) {
    return res.status(400).json({ error: 'Item name and quantity are required.' });
  }
  try {
    const result = await dbHelper.run(
      `INSERT INTO stock (item_name, category, quantity, unit, reorder_level, last_updated) VALUES (?, ?, ?, ?, ?, ?)`,
      [itemName, category || 'Consumables', quantity, unit || 'pcs', reorderLevel || 10, new Date().toISOString()]
    );
    res.status(201).json({ id: result.id, message: 'Stock item added.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stock/:id', authenticateToken, requireRole(['admin', 'staff', 'dentist']), async (req, res) => {
  const { itemName, category, quantity, unit, reorderLevel } = req.body;
  if (!itemName || quantity === undefined) {
    return res.status(400).json({ error: 'Item name and quantity are required.' });
  }
  try {
    await dbHelper.run(
      `UPDATE stock SET item_name = ?, category = ?, quantity = ?, unit = ?, reorder_level = ?, last_updated = ? WHERE id = ?`,
      [itemName, category || 'Consumables', quantity, unit || 'pcs', reorderLevel || 10, new Date().toISOString(), req.params.id]
    );
    res.json({ message: 'Stock level updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stock/:id', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    await dbHelper.run(`DELETE FROM stock WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Stock item removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- User Management Routes (Admin Only) ---
app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await dbHelper.query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.created_at,
              d.id AS dentist_id, d.specialization, d.license_number, d.color_code
       FROM users u
       LEFT JOIN dentists d ON u.id = d.user_id
       ORDER BY u.role, u.last_name, u.first_name`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { email, password, role, firstName, lastName, phone, specialization, licenseNumber, colorCode } = req.body;
  if (!email || !password || !role || !firstName || !lastName) {
    return res.status(400).json({ error: 'All mandatory fields (email, password, role, first name, last name) are required.' });
  }

  try {
    const existing = await dbHelper.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered.' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await dbHelper.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hash, role, firstName, lastName, phone, new Date().toISOString()]
    );

    const newUserId = result.id;

    if (role === 'dentist') {
      await dbHelper.run(
        `INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES (?, ?, ?, ?)`,
        [newUserId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
      );
    } else if (role === 'patient') {
      await dbHelper.run(
        `INSERT INTO patients (user_id, first_name, last_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [newUserId, firstName, lastName, email, phone, new Date().toISOString()]
      );
    }

    res.status(201).json({ id: newUserId, message: 'User account created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const userId = req.params.id;
  const { email, password, role, firstName, lastName, phone, specialization, licenseNumber, colorCode } = req.body;

  if (!email || !role || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, role, first name, and last name are required.' });
  }

  try {
    const user = await dbHelper.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Check email uniqueness if email has changed
    if (email !== user.email) {
      const existing = await dbHelper.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing) return res.status(400).json({ error: 'Email already registered to another user.' });
    }

    const prevRole = user.role;

    // Update main user record
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      await dbHelper.run(
        `UPDATE users SET email = ?, password_hash = ?, role = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
        [email, hash, role, firstName, lastName, phone, userId]
      );
    } else {
      await dbHelper.run(
        `UPDATE users SET email = ?, role = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
        [email, role, firstName, lastName, phone, userId]
      );
    }

    // Role record lifecycle management
    if (prevRole !== role) {
      // Clean up previous role mappings
      if (prevRole === 'dentist') {
        await dbHelper.run('DELETE FROM dentists WHERE user_id = ?', [userId]);
      } else if (prevRole === 'patient') {
        await dbHelper.run('UPDATE patients SET user_id = NULL WHERE user_id = ?', [userId]);
      }

      // Add new role mappings
      if (role === 'dentist') {
        await dbHelper.run(
          `INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES (?, ?, ?, ?)`,
          [userId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
        );
      } else if (role === 'patient') {
        // Check if there is an existing patient record with the same email
        const existingPat = await dbHelper.get('SELECT id FROM patients WHERE email = ?', [email]);
        if (existingPat) {
          await dbHelper.run('UPDATE patients SET user_id = ? WHERE id = ?', [userId, existingPat.id]);
        } else {
          await dbHelper.run(
            `INSERT INTO patients (user_id, first_name, last_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, firstName, lastName, email, phone, new Date().toISOString()]
          );
        }
      }
    } else {
      // Update existing role details
      if (role === 'dentist') {
        const hasDentist = await dbHelper.get('SELECT id FROM dentists WHERE user_id = ?', [userId]);
        if (hasDentist) {
          await dbHelper.run(
            `UPDATE dentists SET specialization = ?, license_number = ?, color_code = ? WHERE user_id = ?`,
            [specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5', userId]
          );
        } else {
          await dbHelper.run(
            `INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES (?, ?, ?, ?)`,
            [userId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
          );
        }
      } else if (role === 'patient') {
        const hasPatient = await dbHelper.get('SELECT id FROM patients WHERE user_id = ?', [userId]);
        if (hasPatient) {
          await dbHelper.run(
            `UPDATE patients SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE user_id = ?`,
            [firstName, lastName, email, phone, userId]
          );
        }
      }
    }

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const userId = req.params.id;

  if (String(req.user.id) === String(userId)) {
    return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
  }

  try {
    const user = await dbHelper.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Clean up role references
    if (user.role === 'dentist') {
      await dbHelper.run('DELETE FROM dentists WHERE user_id = ?', [userId]);
    } else if (user.role === 'patient') {
      await dbHelper.run('UPDATE patients SET user_id = NULL WHERE user_id = ?', [userId]);
    }

    // Delete base user record
    await dbHelper.run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Business Dashboard Statistics Route ---
app.get('/api/dashboard/stats', authenticateToken, requireRole(['admin', 'dentist', 'staff']), async (req, res) => {
  try {
    // 1. Core aggregates
    const apptsCount = await dbHelper.get("SELECT COUNT(*) AS `total` FROM appointments WHERE status = 'scheduled'");
    const patientsCount = await dbHelper.get("SELECT COUNT(*) AS `total` FROM patients");
    
    // Financials
    const billingStats = await dbHelper.get(`
      SELECT SUM(total_amount) AS revenue, 
             SUM(amount_paid) AS collected, 
             SUM(total_amount - amount_paid) AS outstanding 
      FROM invoices
    `);

    // 2. Calendar distribution (Appointments per status)
    const apptStatusStats = await dbHelper.query(
      `SELECT status, COUNT(*) AS \`count\` FROM appointments GROUP BY status`
    );

    // 3. Treatment popularity
    const treatmentPopularity = await dbHelper.query(`
      SELECT t.name, COUNT(*) AS \`count\` 
      FROM treatment_plan_items tpi
      JOIN treatments t ON tpi.treatment_id = t.id
      GROUP BY t.id, t.name ORDER BY \`count\` DESC LIMIT 5
    `);

    // 4. Monthly earnings distribution (last 6 months)
    const dateFunc = dbHelper.isMySQL ? "DATE_FORMAT(created_at, '%Y-%m')" : "strftime('%Y-%m', created_at)";
    const monthlyEarnings = await dbHelper.query(`
      SELECT ${dateFunc} AS \`month\`, SUM(amount) AS \`total\`
      FROM payments
      GROUP BY \`month\` ORDER BY \`month\` DESC LIMIT 6
    `);

    res.json({
      appointmentsCount: (apptsCount && (apptsCount.total || apptsCount.cnt)) || 0,
      patientsCount: (patientsCount && (patientsCount.total || patientsCount.cnt)) || 0,
      revenue: (billingStats && billingStats.revenue) || 0,
      collected: (billingStats && billingStats.collected) || 0,
      outstanding: (billingStats && billingStats.outstanding) || 0,
      appointmentDistribution: apptStatusStats || [],
      treatmentsPopularity: treatmentPopularity || [],
      monthlyEarnings: monthlyEarnings ? monthlyEarnings.reverse() : []
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// --- AI Smart Assistant Routes ---
app.post('/api/ai/suggest-plan', authenticateToken, requireRole(['admin', 'dentist']), async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || symptoms.trim() === '') {
    return res.status(400).json({ error: 'Symptoms or care description required.' });
  }

  if (process.env.NODE_ENV === 'test') {
    return res.json([
      {
        treatmentId: 2,
        toothNumber: '14',
        notes: 'AI Mock: Cavity composite restoration suggested.',
        cost: 150
      }
    ]);
  }

  const apiKey = process.env.AISA_API_KEY;
  const baseUrl = process.env.AISA_BASE_URL || 'https://api.aisa.one/v1';

  if (!apiKey) {
    return res.status(500).json({ error: 'AIsa API key not configured on backend.' });
  }

  try {
    // Fetch available treatments catalog dynamically
    const treatments = await dbHelper.query('SELECT * FROM treatments ORDER BY name ASC');

    const systemPrompt = `You are a professional dental care plan assistant.
Your task is to analyze the patient's symptoms or needs and suggest a structured dental treatment plan.
You must ONLY choose treatments from the following clinic catalog:
${JSON.stringify(treatments)}

For each suggested treatment item, specify:
1. The "treatmentId" matching the catalog item.
2. The "toothNumber" (1-32 for adult teeth, or "All" or a comma-separated list if multiple, or empty if general).
3. Short clinical "notes" justifying the choice.
4. The "cost" (should match the catalog's base_cost unless there is a reason to adjust it).

Respond ONLY with a valid JSON array of objects, containing:
[
  {
    "treatmentId": number,
    "toothNumber": "string",
    "notes": "string",
    "cost": number
  }
]
Do not include any markdown styling, triple backticks, or explanatory text. Just the raw JSON array.`;

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: symptoms }
        ],
        temperature: 0.2
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(aiData.error?.message || `AIsa API error: ${aiRes.statusText}`);
    }

    let completionText = aiData.choices[0].message.content.trim();
    if (completionText.startsWith('```')) {
      completionText = completionText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const suggestions = JSON.parse(completionText);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: `AI Assist Failed: ${err.message}` });
  }
});

app.post('/api/ai/optimize-notes', authenticateToken, requireRole(['admin', 'dentist', 'staff']), async (req, res) => {
  const { notes } = req.body;
  if (!notes || notes.trim() === '') {
    return res.status(400).json({ error: 'Clinical notes are required.' });
  }

  if (process.env.NODE_ENV === 'test') {
    return res.json({
      formattedNotes: '<p>AI Mock: Chief complaint of toothache.</p>',
      allergies: 'Penicillin'
    });
  }

  const apiKey = process.env.AISA_API_KEY;
  const baseUrl = process.env.AISA_BASE_URL || 'https://api.aisa.one/v1';

  if (!apiKey) {
    return res.status(500).json({ error: 'AIsa API key not configured on backend.' });
  }

  try {
    const systemPrompt = `You are a clinical dental records optimizer.
Your task is to take raw, messy clinical diagnostic notes inputted by the dentist, clean up spelling and grammar, and format them into a professional structure (e.g. Chief Complaint, Findings, Diagnosis).
Also, detect and extract any medical or drug allergies mentioned in the notes.

Respond ONLY with a valid JSON object matching the following schema:
{
  "formattedNotes": "string (formatted with HTML paragraphs/bullets, clean and professional)",
  "allergies": "string (comma-separated list of identified drug or medical allergies, or 'None' if none found)"
}
Do not include any markdown styling (like triple backticks or \`\`\`json) or chat explanations. Just raw JSON output.`;

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: notes }
        ],
        temperature: 0.2
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(aiData.error?.message || `AIsa API error: ${aiRes.statusText}`);
    }

    let completionText = aiData.choices[0].message.content.trim();
    if (completionText.startsWith('```')) {
      completionText = completionText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const resultObj = JSON.parse(completionText);
    res.json(resultObj);
  } catch (err) {
    res.status(500).json({ error: `AI Optimize Failed: ${err.message}` });
  }
});

// Catch-all route to serve SPA frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dental Clinic Management System listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
