const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('../config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function runMigrations() {
  // Ensure target database exists when user has privileges (managed DBs often pre-create it)
  try {
    const bootstrapConn = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      ...(config.db.ssl ? { ssl: config.db.ssl } : {}),
      connectTimeout: 5000,
    });

    try {
      await bootstrapConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await bootstrapConn.end();
    }
  } catch (err) {
    if (err.code !== 'ER_DBACCESS_DENIED_ERROR' && err.code !== 'ER_ACCESS_DENIED_ERROR') {
      throw err;
    }
  }

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ...(config.db.ssl ? { ssl: config.db.ssl } : {}),
    multipleStatements: true,
    connectTimeout: 5000,
    timezone: 'Z',
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [appliedRows] = await conn.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      await conn.beginTransaction();
      try {
        await conn.query(sql);
        await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        await conn.commit();
        console.log(`[Migrate] Applied ${file}`);
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migrate] All migrations are up to date.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migrate] Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };

