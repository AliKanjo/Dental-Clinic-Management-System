const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let envLoaded = false;

function loadEnvFiles() {
  if (envLoaded) return;
  const backendEnvPath = path.resolve(__dirname, '../.env');
  const rootEnvPath = path.resolve(__dirname, '../../.env');

  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
  envLoaded = true;
}

function loadConfig() {
  loadEnvFiles();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('Fatal configuration error: JWT_SECRET environment variable must be set.');
  }

  const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
  const parsedSmtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);

  // Support either explicit DB_* env vars or a connection URL (DATABASE_URL / MYSQL_URL)
  const dbUrlRaw = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
  let parsedUrlDb = null;
  if (dbUrlRaw && !process.env.DB_HOST) {
    try {
      const parsed = new URL(dbUrlRaw);
      const sslParam = (parsed.searchParams.get('ssl') || parsed.searchParams.get('ssl-mode') || '').toLowerCase();
      parsedUrlDb = {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname ? decodeURIComponent(parsed.pathname.replace(/^\//, '')) : 'dental_clinic_db',
        wantsSsl: sslParam === 'true' || sslParam === 'required' || sslParam === 'require' || sslParam === 'verify_ca' || sslParam === 'verify_identity',
      };
    } catch {
      throw new Error('Fatal configuration error: Invalid DATABASE_URL / MYSQL_URL format.');
    }
  }

  const parsedDbPort = Number.parseInt(process.env.DB_PORT || (parsedUrlDb ? String(parsedUrlDb.port) : '3306'), 10);
  const sslEnabled = process.env.DB_SSL === 'true' || (parsedUrlDb ? parsedUrlDb.wantsSsl : false);
  const sslConfig = sslEnabled
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined;

  const corsRaw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || (nodeEnv === 'production' ? '' : 'http://localhost:3000');
  const corsOrigins = corsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const clinicTimezone = (process.env.CLINIC_TIMEZONE || 'UTC').trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: clinicTimezone });
  } catch {
    throw new Error(
      `Fatal configuration error: Invalid CLINIC_TIMEZONE "${clinicTimezone}". Use a valid IANA timezone (e.g., "UTC" or "America/New_York").`
    );
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port: Number.isNaN(parsedPort) ? 3000 : parsedPort,
    jwtSecret,
    corsOrigins,
    clinicTimezone,
    seedDemoData: process.env.SEED_DEMO_DATA === 'true',
    db: {
      host: process.env.DB_HOST || (parsedUrlDb ? parsedUrlDb.host : 'localhost'),
      port: Number.isNaN(parsedDbPort) ? 3306 : parsedDbPort,
      user: process.env.DB_USER || (parsedUrlDb ? parsedUrlDb.user : 'root'),
      password: process.env.DB_PASSWORD ?? (parsedUrlDb ? parsedUrlDb.password : ''),
      database: process.env.DB_NAME || (parsedUrlDb ? parsedUrlDb.database : 'dental_clinic_db'),
      ssl: sslConfig,
    },
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number.isNaN(parsedSmtpPort) ? 587 : parsedSmtpPort,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'no-reply@dentalflow.local',
    },
    ai: {
      apiKey: process.env.AISA_API_KEY || '',
      baseUrl: process.env.AISA_BASE_URL || 'https://api.aisa.one/v1',
      timeoutMs: Number.parseInt(process.env.AI_TIMEOUT_MS || '15000', 10) || 15000,
    },
  };
}

const config = loadConfig();

module.exports = {
  config,
  loadConfig,
};

