const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listPrescriptions(user) {
  if (user.role === 'patient') {
    return db.query(
      `SELECT pr.*,
              p.first_name AS pat_first, p.last_name AS pat_last,
              u.first_name AS dent_first, u.last_name AS dent_last
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN dentists d ON pr.dentist_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE pr.patient_id = ?
       ORDER BY pr.created_at DESC`,
      [user.relatedId]
    );
  }

  return db.query(
    `SELECT pr.*,
            p.first_name AS pat_first, p.last_name AS pat_last,
            u.first_name AS dent_first, u.last_name AS dent_last
     FROM prescriptions pr
     JOIN patients p ON pr.patient_id = p.id
     JOIN dentists d ON pr.dentist_id = d.id
     JOIN users u ON d.user_id = u.id
     ORDER BY pr.created_at DESC`
  );
}

async function createPrescription({ patientId, dentistId, medication, dosage, instructions }) {
  const patient = await db.get('SELECT id FROM patients WHERE id = ?', [patientId]);
  if (!patient) throw new AppError(404, 'Patient not found.');

  const dentist = await db.get('SELECT id FROM dentists WHERE id = ?', [dentistId]);
  if (!dentist) throw new AppError(404, 'Dentist not found.');

  const result = await db.run(
    `INSERT INTO prescriptions (patient_id, dentist_id, medication, dosage, instructions, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patientId, dentistId, medication, dosage || '', instructions || '', db.toSqlDateTime(new Date())]
  );
  return { id: result.id, message: 'Prescription written successfully.' };
}

async function deletePrescription(id) {
  const result = await db.run('DELETE FROM prescriptions WHERE id = ?', [id]);
  if (result.changes === 0) {
    throw new AppError(404, 'Prescription not found.');
  }
  return { message: 'Prescription deleted successfully.' };
}

module.exports = {
  listPrescriptions,
  createPrescription,
  deletePrescription,
};

