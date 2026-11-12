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
  const parsedDbPort = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const parsedSmtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);

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
      host: process.env.DB_HOST || 'localhost',
      port: Number.isNaN(parsedDbPort) ? 3306 : parsedDbPort,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dental_clinic_db',
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

