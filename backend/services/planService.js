const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listPlans(user) {
  if (user.role === 'dentist') {
    return db.query(
      `SELECT tp.*, p.first_name AS patient_first, p.last_name AS patient_last
       FROM treatment_plans tp
       JOIN patients p ON tp.patient_id = p.id
       WHERE tp.dentist_id = ?
       ORDER BY tp.created_at DESC`,
      [user.relatedId]
    );
  }

  if (user.role === 'patient') {
    return db.query(
      `SELECT tp.*, u.first_name AS dentist_first, u.last_name AS dentist_last
       FROM treatment_plans tp
       JOIN dentists d ON tp.dentist_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE tp.patient_id = ?
       ORDER BY tp.created_at DESC`,
      [user.relatedId]
    );
  }

  return db.query(
    `SELECT tp.*, p.first_name AS patient_first, p.last_name AS patient_last,
            u.first_name AS dentist_first, u.last_name AS dentist_last
     FROM treatment_plans tp
     JOIN patients p ON tp.patient_id = p.id
     JOIN dentists d ON tp.dentist_id = d.id
     JOIN users u ON d.user_id = u.id
     ORDER BY tp.created_at DESC`
  );
}

async function createPlan({ patientId, dentistId, title, items }) {
  const totalCost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const nowSql = db.toSqlDateTime(new Date());

  const planId = await db.withTransaction(async (tx) => {
    const patient = await tx.get('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (!patient) throw new AppError(404, 'Patient not found.');

    const dentist = await tx.get('SELECT id FROM dentists WHERE id = ?', [dentistId]);
    if (!dentist) throw new AppError(404, 'Dentist not found.');

    const planResult = await tx.run(
      `INSERT INTO treatment_plans (patient_id, dentist_id, title, status, total_cost, created_at)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      [patientId, dentistId, title, totalCost.toFixed(2), nowSql]
    );

    const newPlanId = planResult.id;

    for (const item of items) {
      await tx.run(
        `INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_number, notes, cost, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [newPlanId, item.treatmentId, item.toothNumber || null, item.notes || null, Number(item.cost).toFixed(2)]
      );
    }

    return newPlanId;
  });

  return { id: planId, message: 'Treatment plan created successfully.' };
}

async function updatePlanItemStatus({ itemId, status }) {
  return db.withTransaction(async (tx) => {
    const item = await tx.get(
      `SELECT tpi.*, tp.patient_id, tp.id AS plan_id
       FROM treatment_plan_items tpi
       JOIN treatment_plans tp ON tpi.treatment_plan_id = tp.id
       WHERE tpi.id = ?
       FOR UPDATE`,
      [itemId]
    );

    if (!item) {
      throw new AppError(404, 'Treatment plan item not found.');
    }

    await tx.run('UPDATE treatment_plan_items SET status = ? WHERE id = ?', [status, itemId]);

    if (status === 'completed' && item.status !== 'completed') {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setUTCDate(dueDate.getUTCDate() + 15);

      const invoiceResult = await tx.run(
        `INSERT INTO invoices (treatment_plan_id, patient_id, amount_due, discount, tax, total_amount, amount_paid, status, due_date, created_at)
         VALUES (?, ?, ?, 0.00, 0.00, ?, 0.00, 'unpaid', ?, ?)`,
        [item.plan_id, item.patient_id, item.cost, item.cost, db.toSqlDate(dueDate), db.toSqlDateTime(now)]
      );

      return { message: 'Item completed. Invoice generated.', invoiceId: invoiceResult.id };
    }

    return { message: 'Item status updated.' };
  });
}

module.exports = {
  listPlans,
  createPlan,
  updatePlanItemStatus,
};

