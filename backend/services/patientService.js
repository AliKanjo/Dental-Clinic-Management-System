const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listPatients({ user, q, assignedOnly }) {
  let query = 'SELECT DISTINCT p.* FROM patients p';
  const conditions = [];
  const params = [];

  if (user.role === 'dentist' && assignedOnly === 'true') {
    conditions.push(
      '(p.id IN (SELECT patient_id FROM appointments WHERE dentist_id = ?) OR p.id IN (SELECT patient_id FROM treatment_plans WHERE dentist_id = ?))'
    );
    params.push(user.relatedId, user.relatedId);
  }

  if (q) {
    conditions.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY p.last_name ASC';

  return db.query(query, params);
}

async function getPatient360({ user, patientId }) {
  if (user.role === 'patient' && Number(user.relatedId) !== Number(patientId)) {
    throw new AppError(403, 'Access denied.');
  }

  const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
  if (!patient) {
    throw new AppError(404, 'Patient not found.');
  }

  const appointments = await db.query(
    `SELECT a.*, u.first_name AS dentist_first, u.last_name AS dentist_last
     FROM appointments a
     JOIN dentists d ON a.dentist_id = d.id
     JOIN users u ON d.user_id = u.id
     WHERE a.patient_id = ?
     ORDER BY a.start_time DESC`,
    [patientId]
  );

  const treatmentPlans = await db.query(
    `SELECT tp.*, u.first_name AS dentist_first, u.last_name AS dentist_last
     FROM treatment_plans tp
     JOIN dentists d ON tp.dentist_id = d.id
     JOIN users u ON d.user_id = u.id
     WHERE tp.patient_id = ?
     ORDER BY tp.created_at DESC`,
    [patientId]
  );

  for (const plan of treatmentPlans) {
    plan.items = await db.query(
      `SELECT tpi.*, t.name AS treatment_name
       FROM treatment_plan_items tpi
       JOIN treatments t ON tpi.treatment_id = t.id
       WHERE tpi.treatment_plan_id = ?`,
      [plan.id]
    );
  }

  const invoices = await db.query(
    'SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC',
    [patientId]
  );

  return { patient, appointments, treatmentPlans, invoices };
}

async function createPatient(data) {
  const result = await db.run(
    `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, gender, address, medical_allergies, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.firstName,
      data.lastName,
      data.email || null,
      data.phone || null,
      db.toSqlDate(data.dateOfBirth),
      data.gender || null,
      data.address || null,
      data.allergies || null,
      data.notes || null,
      db.toSqlDateTime(new Date()),
    ]
  );
  return { id: result.id, message: 'Patient profile created.' };
}

async function updatePatient({ user, patientId, data }) {
  if (user && user.role === 'patient' && Number(user.relatedId) !== Number(patientId)) {
    throw new AppError(403, 'Access denied.');
  }

  const existing = await db.get('SELECT id FROM patients WHERE id = ?', [patientId]);
  if (!existing) {
    throw new AppError(404, 'Patient not found.');
  }

  await db.run(
    `UPDATE patients
     SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, gender = ?, address = ?, medical_allergies = ?, notes = ?
     WHERE id = ?`,
    [
      data.firstName,
      data.lastName,
      data.email || null,
      data.phone || null,
      db.toSqlDate(data.dateOfBirth),
      data.gender || null,
      data.address || null,
      data.allergies || null,
      data.notes || null,
      patientId,
    ]
  );

  return { message: 'Patient profile updated.' };
}

async function deletePatient(patientId) {
  await db.withTransaction(async (tx) => {
    const patient = await tx.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      throw new AppError(404, 'Patient not found.');
    }

    const plans = await tx.query('SELECT id FROM treatment_plans WHERE patient_id = ?', [patientId]);
    for (const plan of plans) {
      await tx.run('DELETE FROM treatment_plan_items WHERE treatment_plan_id = ?', [plan.id]);
    }
    await tx.run('DELETE FROM treatment_plans WHERE patient_id = ?', [patientId]);

    const invoices = await tx.query('SELECT id FROM invoices WHERE patient_id = ?', [patientId]);
    for (const inv of invoices) {
      await tx.run('DELETE FROM payments WHERE invoice_id = ?', [inv.id]);
    }
    await tx.run('DELETE FROM invoices WHERE patient_id = ?', [patientId]);

    await tx.run('DELETE FROM appointments WHERE patient_id = ?', [patientId]);
    await tx.run('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);
    await tx.run('DELETE FROM follow_ups WHERE patient_id = ?', [patientId]);
    await tx.run('DELETE FROM patients WHERE id = ?', [patientId]);

    if (patient.user_id) {
      await tx.run("DELETE FROM users WHERE id = ? AND role = 'patient'", [patient.user_id]);
    }
  });

  return { message: 'Patient and all associated records deleted successfully.' };
}

module.exports = {
  listPatients,
  getPatient360,
  createPatient,
  updatePatient,
  deletePatient,
};
