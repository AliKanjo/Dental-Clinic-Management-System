const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listInvoices(user) {
  if (user.role === 'patient') {
    return db.query(
      `SELECT i.*, tp.title AS plan_title
       FROM invoices i
       LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
       WHERE i.patient_id = ?
       ORDER BY i.created_at DESC`,
      [user.relatedId]
    );
  }

  return db.query(
    `SELECT i.*, p.first_name, p.last_name, tp.title AS plan_title
     FROM invoices i
     JOIN patients p ON i.patient_id = p.id
     LEFT JOIN treatment_plans tp ON i.treatment_plan_id = tp.id
     ORDER BY i.created_at DESC`
  );
}

async function getInvoiceById({ user, invoiceId }) {
  const invoice = await db.get(
    `SELECT i.*, p.first_name, p.last_name, p.phone, p.email, p.address
     FROM invoices i
     JOIN patients p ON i.patient_id = p.id
     WHERE i.id = ?`,
    [invoiceId]
  );

  if (!invoice) {
    throw new AppError(404, 'Invoice not found.');
  }

  if (user.role === 'patient' && Number(user.relatedId) !== Number(invoice.patient_id)) {
    throw new AppError(403, 'Access denied.');
  }

  const payments = await db.query(
    'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC',
    [invoiceId]
  );

  return { invoice, payments };
}

async function recordPayment({ invoiceId, amount, paymentMethod, transactionRef }) {
  return db.withTransaction(async (tx) => {
    const invoice = await tx.get('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
    if (!invoice) {
      throw new AppError(404, 'Invoice not found.');
    }

    const totalCents = Math.round(Number(invoice.total_amount) * 100);
    const paidCents = Math.round(Number(invoice.amount_paid) * 100);
    const amountCents = Math.round(Number(amount) * 100);
    const remainingCents = totalCents - paidCents;

    if (remainingCents <= 0) {
      throw new AppError(400, 'Invoice is already fully paid.');
    }

    if (amountCents <= 0 || amountCents > remainingCents) {
      const maxPayable = (remainingCents / 100).toFixed(2);
      throw new AppError(400, `Payment exceeds balance due. Max payable is $${maxPayable}`);
    }

    const nowSql = db.toSqlDateTime(new Date());
    await tx.run(
      `INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [invoiceId, (amountCents / 100).toFixed(2), paymentMethod, transactionRef || null, nowSql]
    );

    const newPaidCents = paidCents + amountCents;
    const newPaid = Number((newPaidCents / 100).toFixed(2));
    const newStatus = newPaidCents >= totalCents ? 'paid' : 'partially_paid';

    await tx.run(
      'UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?',
      [newPaid.toFixed(2), newStatus, invoiceId]
    );

    return {
      message: 'Payment recorded successfully.',
      newPaid,
      status: newStatus,
    };
  });
}

module.exports = {
  listInvoices,
  getInvoiceById,
  recordPayment,
};

