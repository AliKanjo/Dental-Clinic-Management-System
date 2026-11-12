const { config } = require('./config/env');
const db = require('./db');
const app = require('./app');

async function startServer() {
  try {
    await db.verifyConnection();
    console.log(
      `[Database] Connected to MySQL '${config.db.database}' at ${config.db.host}:${config.db.port}`
    );
  } catch (err) {
    console.error('[Database] Fatal: Cannot connect to MySQL at startup:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`Dental Clinic Management System listening on http://localhost:${config.port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
