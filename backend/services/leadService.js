const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listLeads() {
  return db.query('SELECT * FROM leads ORDER BY created_at DESC');
}

async function createLead({ firstName, lastName, email, phone, source }) {
  const result = await db.run(
    `INSERT INTO leads (first_name, last_name, email, phone, source, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'new', ?)`,
    [firstName, lastName, email || null, phone || null, source || null, db.toSqlDateTime(new Date())]
  );
  return { id: result.id, message: 'CRM Lead created.' };
}

async function updateLead(leadId, { status, email, phone }) {
  await db.withTransaction(async (tx) => {
    const lead = await tx.get('SELECT * FROM leads WHERE id = ? FOR UPDATE', [leadId]);
    if (!lead) {
      throw new AppError(404, 'Lead not found.');
    }

    const updatedEmail = email !== undefined ? email : lead.email;
    const updatedPhone = phone !== undefined ? phone : lead.phone;

    await tx.run(
      'UPDATE leads SET status = ?, email = ?, phone = ? WHERE id = ?',
      [status, updatedEmail, updatedPhone, leadId]
    );

    if (status === 'converted' && lead.status !== 'converted') {
      let existingPatient = null;
      if (updatedEmail) {
        existingPatient = await tx.get('SELECT id FROM patients WHERE email = ?', [updatedEmail]);
      }

      if (!existingPatient) {
        await tx.run(
          `INSERT INTO patients (first_name, last_name, email, phone, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            lead.first_name,
            lead.last_name,
            updatedEmail || null,
            updatedPhone || null,
            `Converted from Lead Source: ${lead.source || 'unknown'}`,
            db.toSqlDateTime(new Date()),
          ]
        );
      }
    }
  });

  return { message: 'Lead updated.' };
}

module.exports = {
  listLeads,
  createLead,
  updateLead,
};

