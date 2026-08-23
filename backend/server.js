const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const dbHelper = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dental-secret-key-12345';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));

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
    if (queryStr) {
      patients = await dbHelper.query(
        `SELECT * FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY last_name ASC`,
        [`%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`]
      );
    } else {
      patients = await dbHelper.query(`SELECT * FROM patients ORDER BY last_name ASC`);
    }
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

    const result = await dbHelper.run(
      `INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, 'scheduled', ?)`,
      [finalPatientId, dentistId, startTime, endTime, notes]
    );

    res.status(201).json({ id: result.id, message: 'Appointment booked successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  const { status, startTime, endTime, notes } = req.body;
  
  try {
    const appt = await dbHelper.get('SELECT patient_id FROM appointments WHERE id = ?', [req.params.id]);
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

// --- Treatments (Catalog) ---
app.get('/api/treatments', authenticateToken, async (req, res) => {
  try {
    const treatments = await dbHelper.query(`SELECT * FROM treatments ORDER BY name ASC`);
    res.json(treatments);
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

// --- Business Dashboard Statistics Route ---
app.get('/api/dashboard/stats', authenticateToken, requireRole(['admin', 'dentist', 'staff']), async (req, res) => {
  try {
    // 1. Core aggregates
    const apptsCount = await dbHelper.get("SELECT COUNT(*) AS total FROM appointments WHERE status = 'scheduled'");
    const patientsCount = await dbHelper.get("SELECT COUNT(*) AS total FROM patients");
    
    // Financials
    const billingStats = await dbHelper.get(`
      SELECT SUM(total_amount) AS revenue, 
             SUM(amount_paid) AS collected, 
             SUM(total_amount - amount_paid) AS outstanding 
      FROM invoices
    `);

    // 2. Calendar distribution (Appointments per status)
    const apptStatusStats = await dbHelper.query(
      `SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`
    );

    // 3. Treatment popularity
    const treatmentPopularity = await dbHelper.query(`
      SELECT t.name, COUNT(*) AS count 
      FROM treatment_plan_items tpi
      JOIN treatments t ON tpi.treatment_id = t.id
      GROUP BY t.id ORDER BY count DESC LIMIT 5
    `);

    // 4. Monthly earnings distribution (last 6 months)
    const monthlyEarnings = await dbHelper.query(`
      SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS total
      FROM payments
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);

    res.json({
      appointmentsCount: apptsCount.total,
      patientsCount: patientsCount.total,
      revenue: billingStats.revenue || 0,
      collected: billingStats.collected || 0,
      outstanding: billingStats.outstanding || 0,
      appointmentDistribution: apptStatusStats,
      treatmentsPopularity: treatmentPopularity,
      monthlyEarnings: monthlyEarnings.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve SPA frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dental Clinic Management System listening on http://localhost:${PORT}`);
});
