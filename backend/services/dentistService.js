const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listDentists() {
  return db.query(
    `SELECT d.id, u.first_name, u.last_name, d.specialization, d.color_code
     FROM dentists d
     JOIN users u ON d.user_id = u.id
     ORDER BY u.last_name ASC, u.first_name ASC`
  );
}

async function getAvailability(dentistId) {
  return db.query(
    'SELECT * FROM dentist_availability WHERE dentist_id = ? ORDER BY day_of_week ASC',
    [dentistId]
  );
}

async function setAvailability(dentistId, shifts) {
  const dentist = await db.get('SELECT id FROM dentists WHERE id = ?', [dentistId]);
  if (!dentist) {
    throw new AppError(404, 'Dentist not found.');
  }

  await db.withTransaction(async (tx) => {
    await tx.run('DELETE FROM dentist_availability WHERE dentist_id = ?', [dentistId]);
    for (const shift of shifts) {
      await tx.run(
        `INSERT INTO dentist_availability (dentist_id, day_of_week, start_hour, end_hour)
         VALUES (?, ?, ?, ?)`,
        [dentistId, shift.dayOfWeek, shift.startHour, shift.endHour]
      );
    }
  });

  return { message: 'Dentist availability updated successfully.' };
}

module.exports = {
  listDentists,
  getAvailability,
  setAvailability,
};

