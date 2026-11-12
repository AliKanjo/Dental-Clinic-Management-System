const mysql = require('mysql2/promise');
const { config } = require('./config/env');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ...(config.db.ssl ? { ssl: config.db.ssl } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 5000,
      decimalNumbers: true,
      timezone: 'Z',
    });
  }
  return pool;
}

function createExecutor(conn) {
  return {
    query: async (sql, params = []) => {
      const [rows] = await conn.query(sql, params);
      return rows;
    },
    get: async (sql, params = []) => {
      const [rows] = await conn.query(sql, params);
      return rows && rows.length > 0 ? rows[0] : null;
    },
    run: async (sql, params = []) => {
      const [result] = await conn.query(sql, params);
      return {
        id: result.insertId || null,
        changes: result.affectedRows || 0,
      };
    },
  };
}

async function verifyConnection() {
  const activePool = getPool();
  const conn = await activePool.getConnection();
  try {
    await conn.query('SELECT 1');
  } finally {
    conn.release();
  }
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

async function run(sql, params = []) {
  const [result] = await getPool().query(sql, params);
  return {
    id: result.insertId || null,
    changes: result.affectedRows || 0,
  };
}

/**
 * Execute a callback inside a MySQL transaction.
 * Automatically commits on success or rolls back on error.
 */
async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const tx = createExecutor(conn);
    const result = await fn(tx);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('[Database] Transaction rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function toSqlDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid datetime value');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toSqlDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date.toISOString().slice(0, 10);
}

module.exports = {
  getPool,
  verifyConnection,
  query,
  get,
  run,
  withTransaction,
  closePool,
  toSqlDateTime,
  toSqlDate,
};
