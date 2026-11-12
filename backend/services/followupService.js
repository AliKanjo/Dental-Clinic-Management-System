const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listFollowups() {
  return db.query(
    `SELECT f.*, p.first_name AS pat_first, p.last_name AS pat_last,
            l.first_name AS lead_first, l.last_name AS lead_last,
            u.first_name AS staff_first, u.last_name AS staff_last
     FROM follow_ups f
     LEFT JOIN patients p ON f.patient_id = p.id
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN users u ON f.assigned_to = u.id
     ORDER BY f.scheduled_date ASC`
  );
}

async function createFollowup({ userId, patientId, leadId, assignedTo, scheduledDate, notes }) {
  await db.run(
    `INSERT INTO follow_ups (patient_id, lead_id, assigned_to, scheduled_date, notes, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [patientId || null, leadId || null, assignedTo || userId, db.toSqlDate(scheduledDate), notes || null]
  );
  return { message: 'Follow-up task scheduled.' };
}

async function updateFollowup(id, { status, notes }) {
  const existing = await db.get('SELECT id FROM follow_ups WHERE id = ?', [id]);
  if (!existing) {
    throw new AppError(404, 'Follow-up task not found.');
  }

  const completedAt = status === 'completed' ? db.toSqlDateTime(new Date()) : null;
  await db.run(
    'UPDATE follow_ups SET status = ?, notes = ?, completed_at = ? WHERE id = ?',
    [status, notes || null, completedAt, id]
  );
  return { message: 'Follow-up updated.' };
}

module.exports = {
  listFollowups,
  createFollowup,
  updateFollowup,
};

