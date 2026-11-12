const bcrypt = require('bcryptjs');
const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

async function listUsers() {
  return db.query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.created_at,
            d.id AS dentist_id, d.specialization, d.license_number, d.color_code
     FROM users u
     LEFT JOIN dentists d ON u.id = d.user_id
     ORDER BY u.role, u.last_name, u.first_name`
  );
}

async function createUser({ email, password, role, firstName, lastName, phone, specialization, licenseNumber, colorCode }) {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  if (existing) {
    throw new AppError(400, 'Email already registered.');
  }

  const hash = await bcrypt.hash(password, 10);
  const nowSql = db.toSqlDateTime(new Date());

  const newUserId = await db.withTransaction(async (tx) => {
    const result = await tx.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanEmail, hash, role, firstName, lastName, phone || null, nowSql]
    );

    const userId = result.id;

    if (role === 'dentist') {
      await tx.run(
        `INSERT INTO dentists (user_id, specialization, license_number, color_code)
         VALUES (?, ?, ?, ?)`,
        [userId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
      );
    } else if (role === 'patient') {
      await tx.run(
        `INSERT INTO patients (user_id, first_name, last_name, email, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, firstName, lastName, cleanEmail, phone || null, nowSql]
      );
    }

    return userId;
  });

  return { id: newUserId, message: 'User account created successfully.' };
}

async function updateUser(userId, { email, password, role, firstName, lastName, phone, specialization, licenseNumber, colorCode }) {
  const cleanEmail = email.trim().toLowerCase();
  const newHash = password ? await bcrypt.hash(password, 10) : null;
  const nowSql = db.toSqlDateTime(new Date());

  await db.withTransaction(async (tx) => {
    const user = await tx.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    if (cleanEmail !== user.email.toLowerCase()) {
      const existing = await tx.get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, userId]);
      if (existing) {
        throw new AppError(400, 'Email already registered to another user.');
      }
    }

    const prevRole = user.role;

    if (newHash) {
      await tx.run(
        `UPDATE users SET email = ?, password_hash = ?, role = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
        [cleanEmail, newHash, role, firstName, lastName, phone || null, userId]
      );
    } else {
      await tx.run(
        `UPDATE users SET email = ?, role = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
        [cleanEmail, role, firstName, lastName, phone || null, userId]
      );
    }

    if (prevRole !== role) {
      if (prevRole === 'dentist') {
        await tx.run('DELETE FROM dentists WHERE user_id = ?', [userId]);
      } else if (prevRole === 'patient') {
        await tx.run('UPDATE patients SET user_id = NULL WHERE user_id = ?', [userId]);
      }

      if (role === 'dentist') {
        await tx.run(
          `INSERT INTO dentists (user_id, specialization, license_number, color_code)
           VALUES (?, ?, ?, ?)`,
          [userId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
        );
      } else if (role === 'patient') {
        const existingPat = await tx.get('SELECT id FROM patients WHERE LOWER(email) = ?', [cleanEmail]);
        if (existingPat) {
          await tx.run('UPDATE patients SET user_id = ? WHERE id = ?', [userId, existingPat.id]);
        } else {
          await tx.run(
            `INSERT INTO patients (user_id, first_name, last_name, email, phone, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, firstName, lastName, cleanEmail, phone || null, nowSql]
          );
        }
      }
    } else if (role === 'dentist') {
      const hasDentist = await tx.get('SELECT id FROM dentists WHERE user_id = ?', [userId]);
      if (hasDentist) {
        await tx.run(
          `UPDATE dentists SET specialization = ?, license_number = ?, color_code = ? WHERE user_id = ?`,
          [specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5', userId]
        );
      } else {
        await tx.run(
          `INSERT INTO dentists (user_id, specialization, license_number, color_code)
           VALUES (?, ?, ?, ?)`,
          [userId, specialization || 'General Dentistry', licenseNumber || '', colorCode || '#4f46e5']
        );
      }
    } else if (role === 'patient') {
      const hasPatient = await tx.get('SELECT id FROM patients WHERE user_id = ?', [userId]);
      if (hasPatient) {
        await tx.run(
          `UPDATE patients SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE user_id = ?`,
          [firstName, lastName, cleanEmail, phone || null, userId]
        );
      }
    }
  });

  return { message: 'User updated successfully.' };
}

async function deleteUser(currentUserId, targetUserId) {
  if (Number(currentUserId) === Number(targetUserId)) {
    throw new AppError(400, 'You cannot delete your own active admin account.');
  }

  await db.withTransaction(async (tx) => {
    const user = await tx.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    if (user.role === 'dentist') {
      await tx.run('DELETE FROM dentists WHERE user_id = ?', [targetUserId]);
    } else if (user.role === 'patient') {
      await tx.run('UPDATE patients SET user_id = NULL WHERE user_id = ?', [targetUserId]);
    }

    await tx.run('DELETE FROM users WHERE id = ?', [targetUserId]);
  });

  return { message: 'User account deleted successfully.' };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};

