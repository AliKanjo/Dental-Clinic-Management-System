const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const db = require('../db');

async function clearDatabase() {
  const tables = [
    'password_resets',
    'dentist_availability',
    'stock',
    'prescriptions',
    'payments',
    'invoices',
    'treatment_plan_items',
    'treatment_plans',
    'follow_ups',
    'leads',
    'appointments',
    'treatments',
    'patients',
    'dentists',
    'users',
  ];

  await db.withTransaction(async (tx) => {
    await tx.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const table of tables) {
        await tx.query(`DELETE FROM \`${table}\``);
        await tx.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      }
    } finally {
      await tx.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  });
}

async function seedDemoData({ force = false } = {}) {
  if (config.isProduction) {
    throw new Error('Refusing to seed demo accounts in production environment.');
  }
  if (!force && !config.seedDemoData) {
    console.log('[Seed] Skipping demo seed because SEED_DEMO_DATA is not set to "true".');
    return false;
  }

  const existing = await db.get('SELECT COUNT(*) AS count FROM users');
  if (!force && existing && existing.count > 0) {
    console.log('[Seed] Database already contains users; skipping seed.');
    return false;
  }

  const [adminPass, dentistPass, staffPass, patientPass] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('dentist123', 10),
    bcrypt.hash('staff123', 10),
    bcrypt.hash('patient123', 10),
  ]);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(10, 0, 0, 0);

  const today = new Date(now);
  today.setUTCHours(14, 30, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);

  const nowSql = db.toSqlDateTime(now);
  const yesterdaySql = db.toSqlDateTime(yesterday);
  const tomorrowSql = db.toSqlDateTime(tomorrow);

  await db.withTransaction(async (tx) => {
    await tx.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at) VALUES
        ('admin@dental.com', ?, 'admin', 'Super', 'Admin', '555-0100', ?),
        ('sarah.jenkins@dental.com', ?, 'dentist', 'Sarah', 'Jenkins', '555-0201', ?),
        ('robert.chen@dental.com', ?, 'dentist', 'Robert', 'Chen', '555-0202', ?),
        ('emily.watson@dental.com', ?, 'staff', 'Emily', 'Watson', '555-0301', ?),
        ('john.doe@dental.com', ?, 'patient', 'John', 'Doe', '555-0401', ?)`,
      [adminPass, nowSql, dentistPass, nowSql, dentistPass, nowSql, staffPass, nowSql, patientPass, nowSql]
    );

    await tx.run(
      `INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES
        (2, 'General Dentistry', 'LIC-100234', '#06b6d4'),
        (3, 'Orthodontics & Implants', 'LIC-100987', '#6366f1')`
    );

    await tx.run(
      `INSERT INTO patients (user_id, first_name, last_name, email, phone, date_of_birth, gender, address, medical_allergies, notes, created_at) VALUES
        (5, 'John', 'Doe', 'john.doe@dental.com', '555-0401', '1985-05-12', 'Male', '123 Pine St, Seattle', 'Penicillin', 'Requires pre-medication before root canal.', ?),
        (NULL, 'Jane', 'Smith', 'jane.smith@gmail.com', '555-0402', '1990-09-20', 'Female', '456 Oak Ave, Bellevue', 'None', 'Anxious during surgery.', ?),
        (NULL, 'Alice', 'Johnson', 'alice.j@outlook.com', '555-0403', '1978-02-04', 'Female', '789 Maple Rd, Redmond', 'Sulfa drugs', 'Interested in teeth whitening.', ?),
        (NULL, 'Bob', 'Martinez', 'bob.m@yahoo.com', '555-0404', '1995-11-30', 'Male', '321 Elm Blvd, Seattle', 'Latex', 'Prefers morning appointments.', ?)`,
      [nowSql, nowSql, nowSql, nowSql]
    );

    await tx.run(
      `INSERT INTO treatments (name, description, base_cost) VALUES
        ('Teeth Cleaning & Polish', 'Routine scale and polish with fluoride treatment', 100.00),
        ('Composite Filling', 'Tooth-colored composite restoration for cavities', 150.00),
        ('Root Canal Therapy', 'Endodontic treatment to save infected tooth', 800.00),
        ('Porcelain Crown', 'Full-coverage cosmetic crown restoration', 1200.00),
        ('Simple Extraction', 'Surgical removal of damaged or decayed tooth', 200.00),
        ('Invisalign Consultation', 'Clear aligner assessment and orthopanoramic review', 150.00)`
    );

    await tx.run(
      `INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes) VALUES
        (1, 1, ?, ?, 'completed', 'Routine composite filling completed on #14.'),
        (2, 1, ?, ?, 'scheduled', 'Routine scale and cleaning.'),
        (3, 2, ?, ?, 'scheduled', 'Invisalign records collection.')`,
      [
        yesterdaySql,
        db.toSqlDateTime(new Date(yesterday.getTime() + 3600000)),
        db.toSqlDateTime(today),
        db.toSqlDateTime(new Date(today.getTime() + 3600000)),
        tomorrowSql,
        db.toSqlDateTime(new Date(tomorrow.getTime() + 3600000)),
      ]
    );

    await tx.run(
      `INSERT INTO leads (first_name, last_name, email, phone, source, status, created_at) VALUES
        ('Arthur', 'Pendragon', 'arthur@royal.com', '555-0601', 'web', 'new', ?),
        ('Gwen', 'Guinevere', 'gwen.g@camelot.com', '555-0602', 'social', 'contacted', ?),
        ('Lancelot', 'DuLac', 'lance@lake.com', '555-0603', 'referral', 'converted', ?)`,
      [nowSql, nowSql, nowSql]
    );

    await tx.run(
      `INSERT INTO treatment_plans (patient_id, dentist_id, title, status, total_cost, created_at) VALUES
        (1, 1, 'Restoration & Crown Plan', 'active', 1350.00, ?)`,
      [yesterdaySql]
    );

    await tx.run(
      `INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_number, notes, cost, status) VALUES
        (1, 2, '14', 'Mesial-Occlusal composite', 150.00, 'completed'),
        (1, 4, '15', 'Full porcelain crown', 1200.00, 'pending')`
    );

    await tx.run(
      `INSERT INTO invoices (treatment_plan_id, patient_id, amount_due, discount, tax, total_amount, amount_paid, status, due_date, created_at) VALUES
        (1, 1, 150.00, 0.00, 0.00, 150.00, 150.00, 'paid', ?, ?),
        (1, 1, 1200.00, 0.00, 0.00, 1200.00, 0.00, 'unpaid', ?, ?)`,
      [db.toSqlDate(yesterday), yesterdaySql, db.toSqlDate(tomorrow), tomorrowSql]
    );

    await tx.run(
      `INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref, created_at) VALUES
        (1, 150.00, 'card', 'TX-778899', ?)`,
      [yesterdaySql]
    );

    await tx.run(
      `INSERT INTO prescriptions (patient_id, dentist_id, medication, dosage, instructions, created_at) VALUES
        (1, 1, 'Amoxicillin 500mg', '1 tablet 3 times a day', 'Take with food for 7 days', ?),
        (2, 2, 'Ibuprofen 400mg', '1 tablet every 6 hours', 'Take as needed for pain relief', ?)`,
      [yesterdaySql, yesterdaySql]
    );

    await tx.run(
      `INSERT INTO stock (item_name, category, quantity, unit, reorder_level, last_updated) VALUES
        ('Dental Composite Syringes (A2)', 'Consumables', 25, 'pcs', 10, ?),
        ('Latex Examination Gloves (M)', 'Consumables', 150, 'boxes', 20, ?),
        ('Anesthetic Cartridges (Articaine)', 'Drugs', 5, 'boxes', 8, ?),
        ('Disposable Saliva Ejectors', 'Consumables', 80, 'packs', 15, ?),
        ('Dental Mirror Handles #4', 'Instruments', 12, 'pcs', 5, ?)`,
      [yesterdaySql, yesterdaySql, yesterdaySql, yesterdaySql, yesterdaySql]
    );

    await tx.run(
      `INSERT INTO dentist_availability (dentist_id, day_of_week, start_hour, end_hour) VALUES
        (1, 1, '09:00', '17:00'),
        (1, 3, '09:00', '17:00'),
        (1, 5, '09:00', '17:00'),
        (2, 2, '09:00', '17:00'),
        (2, 4, '09:00', '17:00'),
        (2, 6, '09:00', '17:00')`
    );
  });

  console.log('[Seed] Demo data seeded successfully.');
  return true;
}

if (require.main === module) {
  seedDemoData()
    .then(async () => {
      await db.closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Error seeding database:', err.message);
      await db.closePool();
      process.exit(1);
    });
}

module.exports = {
  clearDatabase,
  seedDemoData,
};

