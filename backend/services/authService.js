const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { config } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const mailService = require('./mailService');

const RESET_WINDOW_MS = 15 * 60 * 1000;
const MAX_RESET_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function hashResetCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function register({ email, password, firstName, lastName, phone }) {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  if (existing) {
    throw new AppError(400, 'Email already registered.');
  }

  const hash = await bcrypt.hash(password, 10);
  const nowSql = db.toSqlDateTime(new Date());

  // Public registration always creates a patient account and linked patient profile
  const userId = await db.withTransaction(async (tx) => {
    const result = await tx.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at)
       VALUES (?, ?, 'patient', ?, ?, ?, ?)`,
      [cleanEmail, hash, firstName, lastName, phone || null, nowSql]
    );

    await tx.run(
      `INSERT INTO patients (user_id, first_name, last_name, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [result.id, firstName, lastName, cleanEmail, phone || null, nowSql]
    );

    return result.id;
  });

  return { id: userId, role: 'patient', message: 'User registered successfully.' };
}

async function login({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  const user = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  if (!user) {
    throw new AppError(400, 'Invalid email or password.');
  }

  const validPass = await bcrypt.compare(password, user.password_hash);
  if (!validPass) {
    throw new AppError(400, 'Invalid email or password.');
  }

  let relatedId = null;
  if (user.role === 'patient') {
    const patient = await db.get('SELECT id FROM patients WHERE user_id = ?', [user.id]);
    if (patient) relatedId = patient.id;
  } else if (user.role === 'dentist') {
    const dentist = await db.get('SELECT id FROM dentists WHERE user_id = ?', [user.id]);
    if (dentist) relatedId = dentist.id;
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: `${user.first_name} ${user.last_name}`,
    relatedId,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });

  return { token, user: payload };
}

async function requestPasswordReset({ email }) {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date();
  const nowMs = now.getTime();
  const nowSql = db.toSqlDateTime(now);
  const expiresAtSql = db.toSqlDateTime(new Date(nowMs + RESET_WINDOW_MS));

  const user = await db.get('SELECT id, email, first_name FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  const existingReset = await db.get('SELECT * FROM password_resets WHERE email = ?', [cleanEmail]);

  let nextRequestCount = 1;
  let windowStartSql = nowSql;

  if (existingReset) {
    const windowStartMs = new Date(existingReset.window_start).getTime();
    if (nowMs - windowStartMs < RESET_WINDOW_MS) {
      if (existingReset.request_count >= MAX_RESET_REQUESTS_PER_WINDOW) {
        throw new AppError(429, 'Too many password reset requests. Please try again later.');
      }
      nextRequestCount = existingReset.request_count + 1;
      windowStartSql = db.toSqlDateTime(existingReset.window_start);
    }
  }

  let plainCode = null;
  let codeHash = null;
  if (user) {
    plainCode = crypto.randomInt(100000, 1000000).toString();
    codeHash = hashResetCode(plainCode);
  }

  if (existingReset) {
    await db.run(
      `UPDATE password_resets
       SET code_hash = ?, attempts = 0, request_count = ?, window_start = ?, expires_at = ?
       WHERE email = ?`,
      [codeHash, nextRequestCount, windowStartSql, user ? expiresAtSql : null, cleanEmail]
    );
  } else {
    await db.run(
      `INSERT INTO password_resets (email, code_hash, attempts, request_count, window_start, expires_at, created_at)
       VALUES (?, ?, 0, ?, ?, ?, ?)`,
      [cleanEmail, codeHash, nextRequestCount, windowStartSql, user ? expiresAtSql : null, nowSql]
    );
  }

  if (user && plainCode) {
    await mailService.sendPasswordResetEmail(user.email, user.first_name, plainCode);
  }

  return {
    message: 'If an account with that email exists, a password reset code has been sent.',
  };
}

async function resetPassword({ email, resetCode, newPassword }) {
  const cleanEmail = email.trim().toLowerCase();
  const record = await db.get('SELECT * FROM password_resets WHERE email = ?', [cleanEmail]);

  if (!record || !record.code_hash || !record.expires_at) {
    throw new AppError(400, 'Invalid or expired verification code.');
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError(429, 'Too many invalid verification attempts. Please request a new code.');
  }

  const nowMs = Date.now();
  const expiresMs = new Date(record.expires_at).getTime();
  if (nowMs > expiresMs) {
    await db.run('UPDATE password_resets SET code_hash = NULL, expires_at = NULL WHERE email = ?', [cleanEmail]);
    throw new AppError(400, 'Verification code expired. Please request a new code.');
  }

  const suppliedHash = Buffer.from(hashResetCode(resetCode.trim()), 'hex');
  const storedHash = Buffer.from(record.code_hash, 'hex');
  const matches = suppliedHash.length === storedHash.length && crypto.timingSafeEqual(suppliedHash, storedHash);

  if (!matches) {
    const newAttempts = record.attempts + 1;
    if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
      await db.run(
        'UPDATE password_resets SET attempts = ?, code_hash = NULL, expires_at = NULL WHERE email = ?',
        [newAttempts, cleanEmail]
      );
      throw new AppError(429, 'Too many invalid verification attempts. Please request a new code.');
    }
    await db.run('UPDATE password_resets SET attempts = ? WHERE email = ?', [newAttempts, cleanEmail]);
    throw new AppError(400, 'Invalid verification code. Please check your code and try again.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.withTransaction(async (tx) => {
    await tx.run('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [passwordHash, cleanEmail]);
    await tx.run('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);
  });

  return { message: 'Password updated successfully! You can now log in with your new password.' };
}

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
};

