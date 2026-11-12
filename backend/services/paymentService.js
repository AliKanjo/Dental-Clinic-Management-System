const db = require('../db');

async function listPayments(user) {
  if (user.role === 'patient') {
    return db.query(
      `SELECT pay.*, tp.title AS plan_title
       FROM payments pay
       JOIN invoices i ON pay.invoice_id = i.id
       LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
       WHERE i.patient_id = ?
       ORDER BY pay.created_at DESC`,
      [user.relatedId]
    );
  }

  return db.query(
    `SELECT pay.*, p.first_name, p.last_name, tp.title AS plan_title
     FROM payments pay
     JOIN invoices i ON pay.invoice_id = i.id
     JOIN patients p ON i.patient_id = p.id
     LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
     ORDER BY pay.created_at DESC`
  );
}

module.exports = {
  listPayments,
};

