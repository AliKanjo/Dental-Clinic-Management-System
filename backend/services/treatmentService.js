const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listTreatments() {
  return db.query('SELECT * FROM treatments ORDER BY name ASC');
}

async function createTreatment({ name, description, baseCost }) {
  const result = await db.run(
    'INSERT INTO treatments (name, description, base_cost) VALUES (?, ?, ?)',
    [name, description || '', baseCost]
  );
  return { id: result.id, message: 'Service added to catalog.' };
}

async function updateTreatment(id, { name, description, baseCost }) {
  const existing = await db.get('SELECT id FROM treatments WHERE id = ?', [id]);
  if (!existing) {
    throw new AppError(404, 'Treatment service not found.');
  }

  await db.run(
    'UPDATE treatments SET name = ?, description = ?, base_cost = ? WHERE id = ?',
    [name, description || '', baseCost, id]
  );
  return { message: 'Service updated successfully.' };
}

async function deleteTreatment(id) {
  const inUse = await db.get('SELECT id FROM treatment_plan_items WHERE treatment_id = ? LIMIT 1', [id]);
  if (inUse) {
    throw new AppError(409, 'Cannot delete treatment that is referenced by existing treatment plans.');
  }

  const result = await db.run('DELETE FROM treatments WHERE id = ?', [id]);
  if (result.changes === 0) {
    throw new AppError(404, 'Treatment service not found.');
  }
  return { message: 'Service removed from catalog.' };
}

module.exports = {
  listTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
};

