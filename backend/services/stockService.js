const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listStock() {
  return db.query('SELECT * FROM stock ORDER BY item_name ASC');
}

async function createStock({ itemName, category, quantity, unit, reorderLevel }) {
  const result = await db.run(
    `INSERT INTO stock (item_name, category, quantity, unit, reorder_level, last_updated)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [itemName, category || 'Consumables', quantity, unit || 'pcs', reorderLevel ?? 10, db.toSqlDateTime(new Date())]
  );
  return { id: result.id, message: 'Stock item added.' };
}

async function updateStock(id, { itemName, category, quantity, unit, reorderLevel }) {
  const existing = await db.get('SELECT id FROM stock WHERE id = ?', [id]);
  if (!existing) {
    throw new AppError(404, 'Stock item not found.');
  }

  await db.run(
    `UPDATE stock
     SET item_name = ?, category = ?, quantity = ?, unit = ?, reorder_level = ?, last_updated = ?
     WHERE id = ?`,
    [itemName, category || 'Consumables', quantity, unit || 'pcs', reorderLevel ?? 10, db.toSqlDateTime(new Date()), id]
  );
  return { message: 'Stock level updated.' };
}

async function deleteStock(id) {
  const result = await db.run('DELETE FROM stock WHERE id = ?', [id]);
  if (result.changes === 0) {
    throw new AppError(404, 'Stock item not found.');
  }
  return { message: 'Stock item removed.' };
}

module.exports = {
  listStock,
  createStock,
  updateStock,
  deleteStock,
};

