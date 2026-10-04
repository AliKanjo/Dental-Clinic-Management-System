require('dotenv').config();
const mysql = require('mysql2/promise');
const alasql = require('alasql');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3006;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'dental_clinic_db';

let mysqlPool = null;
let useMySQL = false;

// --- Register Custom strftime function for AlaSQL fallback ---
alasql.fn.strftime = function (format, dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  if (format === '%Y-%m') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return dateStr;
};

const jsonPath = path.join(__dirname, 'dental.json');

function saveAlaSQLToDisk() {
  const tables = [
    'users', 'dentists', 'patients', 'appointments', 'treatments',
    'treatment_plans', 'treatment_plan_items', 'invoices', 'payments',
    'leads', 'follow_ups', 'prescriptions', 'stock', 'dentist_availability'
  ];
  const data = {};
  tables.forEach(t => {
    try {
      data[t] = alasql(`SELECT * FROM ${t}`);
    } catch (e) {
      data[t] = [];
    }
  });

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    try {
      const tmpPath = path.join('/tmp', 'dental.json');
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err2) {
      // In-memory operation continues even if filesystem is strictly read-only
      console.warn('[Database] Filesystem is read-only, changes kept in memory:', err2.message);
    }
  }
}

const tableDefinitionsAlaSQL = {
  users: `CREATE TABLE users (id INT IDENTITY, email STRING, password_hash STRING, role STRING, first_name STRING, last_name STRING, phone STRING, created_at STRING)`,
  dentists: `CREATE TABLE dentists (id INT IDENTITY, user_id INT, specialization STRING, license_number STRING, color_code STRING)`,
  patients: `CREATE TABLE patients (id INT IDENTITY, user_id INT, first_name STRING, last_name STRING, email STRING, phone STRING, date_of_birth STRING, gender STRING, address STRING, medical_allergies STRING, notes STRING, created_at STRING)`,
  appointments: `CREATE TABLE appointments (id INT IDENTITY, patient_id INT, dentist_id INT, start_time STRING, end_time STRING, status STRING, notes STRING)`,
  treatments: `CREATE TABLE treatments (id INT IDENTITY, name STRING, description STRING, base_cost REAL)`,
  treatment_plans: `CREATE TABLE treatment_plans (id INT IDENTITY, patient_id INT, dentist_id INT, title STRING, status STRING, total_cost REAL, created_at STRING)`,
  treatment_plan_items: `CREATE TABLE treatment_plan_items (id INT IDENTITY, treatment_plan_id INT, treatment_id INT, tooth_number STRING, notes STRING, cost REAL, status STRING)`,
  invoices: `CREATE TABLE invoices (id INT IDENTITY, treatment_plan_id INT, patient_id INT, amount_due REAL, discount REAL, tax REAL, total_amount REAL, amount_paid REAL, status STRING, due_date STRING, created_at STRING)`,
  payments: `CREATE TABLE payments (id INT IDENTITY, invoice_id INT, amount REAL, payment_method STRING, transaction_ref STRING, created_at STRING)`,
  leads: `CREATE TABLE leads (id INT IDENTITY, first_name STRING, last_name STRING, email STRING, phone STRING, source STRING, status STRING, created_at STRING)`,
  follow_ups: `CREATE TABLE follow_ups (id INT IDENTITY, patient_id INT, lead_id INT, assigned_to INT, scheduled_date STRING, notes STRING, status STRING, completed_at STRING)`,
  prescriptions: `CREATE TABLE prescriptions (id INT IDENTITY, patient_id INT, dentist_id INT, medication STRING, dosage STRING, instructions STRING, created_at STRING)`,
  stock: `CREATE TABLE stock (id INT IDENTITY, item_name STRING, category STRING, quantity INT, unit STRING, reorder_level INT, last_updated STRING)`,
  dentist_availability: `CREATE TABLE dentist_availability (id INT IDENTITY, dentist_id INT, day_of_week INT, start_hour STRING, end_hour STRING)`
};

// --- Initializing MySQL Database & Schema ---
async function initMySQL() {
  try {
    // 1. Connect without database to ensure DB exists
    const tempConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await tempConn.end();

    // 2. Create Pool with Database
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });

    // Test connection
    const [rows] = await mysqlPool.query('SELECT 1 + 1 AS solution');
    useMySQL = true;
    console.log(`[Database] Successfully connected to MySQL database '${DB_NAME}' at ${DB_HOST}:${DB_PORT}`);

    // Create Tables
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE, password_hash VARCHAR(255), role VARCHAR(50), first_name VARCHAR(100), last_name VARCHAR(100), phone VARCHAR(50), created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS dentists (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, specialization VARCHAR(255), license_number VARCHAR(100), color_code VARCHAR(50))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS patients (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, first_name VARCHAR(100), last_name VARCHAR(100), email VARCHAR(255), phone VARCHAR(50), date_of_birth VARCHAR(50), gender VARCHAR(50), address TEXT, medical_allergies TEXT, notes TEXT, created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS appointments (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, dentist_id INT, start_time VARCHAR(100), end_time VARCHAR(100), status VARCHAR(50), notes TEXT)`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS treatments (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), description TEXT, base_cost DOUBLE)`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS treatment_plans (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, dentist_id INT, title VARCHAR(255), status VARCHAR(50), total_cost DOUBLE, created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS treatment_plan_items (id INT AUTO_INCREMENT PRIMARY KEY, treatment_plan_id INT, treatment_id INT, tooth_number VARCHAR(50), notes TEXT, cost DOUBLE, status VARCHAR(50))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS invoices (id INT AUTO_INCREMENT PRIMARY KEY, treatment_plan_id INT, patient_id INT, amount_due DOUBLE, discount DOUBLE, tax DOUBLE, total_amount DOUBLE, amount_paid DOUBLE, status VARCHAR(50), due_date VARCHAR(50), created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT, amount DOUBLE, payment_method VARCHAR(50), transaction_ref VARCHAR(100), created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS leads (id INT AUTO_INCREMENT PRIMARY KEY, first_name VARCHAR(100), last_name VARCHAR(100), email VARCHAR(255), phone VARCHAR(50), source VARCHAR(50), status VARCHAR(50), created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS follow_ups (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NULL, lead_id INT NULL, assigned_to INT, scheduled_date VARCHAR(100), notes TEXT, status VARCHAR(50), completed_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS prescriptions (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, dentist_id INT, medication VARCHAR(255), dosage VARCHAR(255), instructions TEXT, created_at VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS stock (id INT AUTO_INCREMENT PRIMARY KEY, item_name VARCHAR(255), category VARCHAR(100), quantity INT, unit VARCHAR(50), reorder_level INT, last_updated VARCHAR(100))`);
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS dentist_availability (id INT AUTO_INCREMENT PRIMARY KEY, dentist_id INT, day_of_week INT, start_hour VARCHAR(20), end_hour VARCHAR(20))`);

    // Check if seed needed or test env reset
    if (process.env.NODE_ENV === 'test') {
      await clearMySQLData();
      await seedMySQLData();
    } else {
      const [userRows] = await mysqlPool.query('SELECT COUNT(*) AS count FROM users');
      if (userRows[0].count === 0) {
        console.log('[Database] Seeding initial data into MySQL...');
        await seedMySQLData();
      }
    }
  } catch (err) {
    console.warn(`[Database] Could not connect to MySQL server (${err.message}). Using portable SQL database engine (AlaSQL).`);
    useMySQL = false;
    initAlaSQLDatabase();
  }
}

async function clearMySQLData() {
  const tables = [
    'dentist_availability', 'stock', 'prescriptions', 'payments', 'invoices',
    'treatment_plan_items', 'treatment_plans', 'follow_ups', 'leads',
    'appointments', 'treatments', 'patients', 'dentists', 'users'
  ];
  await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tables) {
    await mysqlPool.query(`DELETE FROM \`${t}\``);
    await mysqlPool.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
  }
  await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seedMySQLData() {
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const dentistPass = bcrypt.hashSync('dentist123', salt);
  const staffPass = bcrypt.hashSync('staff123', salt);
  const patientPass = bcrypt.hashSync('patient123', salt);

  const nowIso = new Date().toISOString();

  await mysqlPool.query(`INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at) VALUES 
    ('admin@dental.com', ?, 'admin', 'Super', 'Admin', '555-0100', ?),
    ('sarah.jenkins@dental.com', ?, 'dentist', 'Sarah', 'Jenkins', '555-0201', ?),
    ('robert.chen@dental.com', ?, 'dentist', 'Robert', 'Chen', '555-0202', ?),
    ('emily.watson@dental.com', ?, 'staff', 'Emily', 'Watson', '555-0301', ?),
    ('john.doe@dental.com', ?, 'patient', 'John', 'Doe', '555-0401', ?)`,
    [adminPass, nowIso, dentistPass, nowIso, dentistPass, nowIso, staffPass, nowIso, patientPass, nowIso]
  );

  await mysqlPool.query(`INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES 
    (2, 'General Dentistry', 'LIC-100234', '#06b6d4'),
    (3, 'Orthodontics & Implants', 'LIC-100987', '#6366f1')`
  );

  await mysqlPool.query(`INSERT INTO patients (user_id, first_name, last_name, email, phone, date_of_birth, gender, address, medical_allergies, notes, created_at) VALUES 
    (5, 'John', 'Doe', 'john.doe@dental.com', '555-0401', '1985-05-12', 'Male', '123 Pine St, Seattle', 'Penicillin', 'Requires pre-medication before root canal.', ?),
    (NULL, 'Jane', 'Smith', 'jane.smith@gmail.com', '555-0402', '1990-09-20', 'Female', '456 Oak Ave, Bellevue', 'None', 'Anxious during surgery.', ?),
    (NULL, 'Alice', 'Johnson', 'alice.j@outlook.com', '555-0403', '1978-02-04', 'Female', '789 Maple Rd, Redmond', 'Sulfa drugs', 'Interested in teeth whitening.', ?),
    (NULL, 'Bob', 'Martinez', 'bob.m@yahoo.com', '555-0404', '1995-11-30', 'Male', '321 Elm Blvd, Seattle', 'Latex', 'Prefers morning appointments.', ?)`,
    [nowIso, nowIso, nowIso, nowIso]
  );

  await mysqlPool.query(`INSERT INTO treatments (name, description, base_cost) VALUES 
    ('Teeth Cleaning & Polish', 'Routine scale and polish with fluoride treatment', 100),
    ('Composite Filling', 'Tooth-colored composite restoration for cavities', 150),
    ('Root Canal Therapy', 'Endodontic treatment to save infected tooth', 800),
    ('Porcelain Crown', 'Full-coverage cosmetic crown restoration', 1200),
    ('Simple Extraction', 'Surgical removal of damaged or decayed tooth', 200),
    ('Invisalign Consultation', 'Clear aligner assessment and orthopanoramic review', 150)`
  );

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(10, 0, 0, 0);
  const today = new Date(now); today.setHours(14, 30, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);

  await mysqlPool.query(`INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes) VALUES 
    (1, 1, ?, ?, 'completed', 'Routine composite filling completed on #14.'),
    (2, 1, ?, ?, 'scheduled', 'Routine scale and cleaning.'),
    (3, 2, ?, ?, 'scheduled', 'Invisalign records collection.')`,
    [
      yesterday.toISOString(), new Date(yesterday.getTime() + 3600000).toISOString(),
      today.toISOString(), new Date(today.getTime() + 3600000).toISOString(),
      tomorrow.toISOString(), new Date(tomorrow.getTime() + 3600000).toISOString()
    ]
  );

  await mysqlPool.query(`INSERT INTO leads (first_name, last_name, email, phone, source, status, created_at) VALUES 
    ('Arthur', 'Pendragon', 'arthur@royal.com', '555-0601', 'web', 'new', ?),
    ('Gwen', 'Guinevere', 'gwen.g@camelot.com', '555-0602', 'social', 'contacted', ?),
    ('Lancelot', 'DuLac', 'lance@lake.com', '555-0603', 'referral', 'converted', ?)`,
    [nowIso, nowIso, nowIso]
  );

  await mysqlPool.query(`INSERT INTO treatment_plans (patient_id, dentist_id, title, status, total_cost, created_at) VALUES 
    (1, 1, 'Restoration & Crown Plan', 'active', 1350.0, ?)`
    , [yesterday.toISOString()]
  );

  await mysqlPool.query(`INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_number, notes, cost, status) VALUES 
    (1, 2, '14', 'Mesial-Occlusal composite', 150.0, 'completed'),
    (1, 4, '15', 'Full porcelain crown', 1200.0, 'pending')`
  );

  await mysqlPool.query(`INSERT INTO invoices (treatment_plan_id, patient_id, amount_due, discount, tax, total_amount, amount_paid, status, due_date, created_at) VALUES 
    (1, 1, 150.0, 0.0, 0.0, 150.0, 150.0, 'paid', ?, ?),
    (1, 1, 1200.0, 0.0, 0.0, 1200.0, 0.0, 'unpaid', ?, ?)`
    , [
      yesterday.toISOString().split('T')[0], yesterday.toISOString(),
      tomorrow.toISOString().split('T')[0], tomorrow.toISOString()
    ]
  );

  await mysqlPool.query(`INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref, created_at) VALUES 
    (1, 150.0, 'card', 'TX-778899', ?)`
    , [yesterday.toISOString()]
  );

  await mysqlPool.query(`INSERT INTO prescriptions (patient_id, dentist_id, medication, dosage, instructions, created_at) VALUES 
    (1, 2, 'Amoxicillin 500mg', '1 tablet 3 times a day', 'Take with food for 7 days', ?),
    (2, 3, 'Ibuprofen 400mg', '1 tablet every 6 hours', 'Take as needed for pain relief', ?)`
    , [yesterday.toISOString(), yesterday.toISOString()]
  );

  await mysqlPool.query(`INSERT INTO stock (item_name, category, quantity, unit, reorder_level, last_updated) VALUES 
    ('Dental Composite Syringes (A2)', 'Consumables', 25, 'pcs', 10, ?),
    ('Latex Examination Gloves (M)', 'Consumables', 150, 'boxes', 20, ?),
    ('Anesthetic Cartridges (Articaine)', 'Drugs', 5, 'boxes', 8, ?),
    ('Disposable Saliva Ejectors', 'Consumables', 80, 'packs', 15, ?),
    ('Dental Mirror Handles #4', 'Instruments', 12, 'pcs', 5, ?)`
    , [yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString()]
  );

  await mysqlPool.query(`INSERT INTO dentist_availability (dentist_id, day_of_week, start_hour, end_hour) VALUES 
    (1, 1, '09:00', '17:00'),
    (1, 3, '09:00', '17:00'),
    (1, 5, '09:00', '17:00'),
    (2, 2, '09:00', '17:00'),
    (2, 4, '09:00', '17:00'),
    (2, 6, '09:00', '17:00')`
  );

  console.log('[Database] MySQL initial seed committed.');
}

// --- AlaSQL Fallback Implementation ---
function loadFromDiskAlaSQL() {
  const tmpPath = path.join('/tmp', 'dental.json');
  const targetPath = fs.existsSync(tmpPath) ? tmpPath : (fs.existsSync(jsonPath) ? jsonPath : null);
  if (!targetPath) return false;
  try {
    const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    for (let table in data) {
      if (tableDefinitionsAlaSQL[table]) {
        alasql(tableDefinitionsAlaSQL[table]);
      } else {
        alasql(`CREATE TABLE ${table}`);
      }
      data[table].forEach(row => {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(',');
        const values = keys.map(k => row[k]);
        alasql(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
      });
    }
    console.log('[Database] Loaded AlaSQL tables from dental.json');
    return true;
  } catch (err) {
    return false;
  }
}

function initAlaSQLDatabase() {
  if (loadFromDiskAlaSQL()) return;

  for (let table in tableDefinitionsAlaSQL) {
    alasql(tableDefinitionsAlaSQL[table]);
  }

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const dentistPass = bcrypt.hashSync('dentist123', salt);
  const staffPass = bcrypt.hashSync('staff123', salt);
  const patientPass = bcrypt.hashSync('patient123', salt);

  alasql(`INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at) VALUES 
    ('admin@dental.com', ?, 'admin', 'Super', 'Admin', '555-0100', ?),
    ('sarah.jenkins@dental.com', ?, 'dentist', 'Sarah', 'Jenkins', '555-0201', ?),
    ('robert.chen@dental.com', ?, 'dentist', 'Robert', 'Chen', '555-0202', ?),
    ('emily.watson@dental.com', ?, 'staff', 'Emily', 'Watson', '555-0301', ?),
    ('john.doe@dental.com', ?, 'patient', 'John', 'Doe', '555-0401', ?)`,
    [adminPass, new Date().toISOString(), dentistPass, new Date().toISOString(), dentistPass, new Date().toISOString(), staffPass, new Date().toISOString(), patientPass, new Date().toISOString()]
  );

  alasql(`INSERT INTO dentists (user_id, specialization, license_number, color_code) VALUES 
    (2, 'General Dentistry', 'LIC-100234', '#06b6d4'),
    (3, 'Orthodontics & Implants', 'LIC-100987', '#6366f1')`
  );

  alasql(`INSERT INTO patients (user_id, first_name, last_name, email, phone, date_of_birth, gender, address, medical_allergies, notes, created_at) VALUES 
    (5, 'John', 'Doe', 'john.doe@dental.com', '555-0401', '1985-05-12', 'Male', '123 Pine St, Seattle', 'Penicillin', 'Requires pre-medication before root canal.', ?),
    (NULL, 'Jane', 'Smith', 'jane.smith@gmail.com', '555-0402', '1990-09-20', 'Female', '456 Oak Ave, Bellevue', 'None', 'Anxious during surgery.', ?),
    (NULL, 'Alice', 'Johnson', 'alice.j@outlook.com', '555-0403', '1978-02-04', 'Female', '789 Maple Rd, Redmond', 'Sulfa drugs', 'Interested in teeth whitening.', ?),
    (NULL, 'Bob', 'Martinez', 'bob.m@yahoo.com', '555-0404', '1995-11-30', 'Male', '321 Elm Blvd, Seattle', 'Latex', 'Prefers morning appointments.', ?)`,
    [new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
  );

  alasql(`INSERT INTO treatments (name, description, base_cost) VALUES 
    ('Teeth Cleaning & Polish', 'Routine scale and polish with fluoride treatment', 100),
    ('Composite Filling', 'Tooth-colored composite restoration for cavities', 150),
    ('Root Canal Therapy', 'Endodontic treatment to save infected tooth', 800),
    ('Porcelain Crown', 'Full-coverage cosmetic crown restoration', 1200),
    ('Simple Extraction', 'Surgical removal of damaged or decayed tooth', 200),
    ('Invisalign Consultation', 'Clear aligner assessment and orthopanoramic review', 150)`
  );

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(10, 0, 0, 0);
  const today = new Date(now); today.setHours(14, 30, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);

  alasql(`INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes) VALUES 
    (1, 1, ?, ?, 'completed', 'Routine composite filling completed on #14.'),
    (2, 1, ?, ?, 'scheduled', 'Routine scale and cleaning.'),
    (3, 2, ?, ?, 'scheduled', 'Invisalign records collection.')`,
    [
      yesterday.toISOString(), new Date(yesterday.getTime() + 3600000).toISOString(),
      today.toISOString(), new Date(today.getTime() + 3600000).toISOString(),
      tomorrow.toISOString(), new Date(tomorrow.getTime() + 3600000).toISOString()
    ]
  );

  alasql(`INSERT INTO leads (first_name, last_name, email, phone, source, status, created_at) VALUES 
    ('Arthur', 'Pendragon', 'arthur@royal.com', '555-0601', 'web', 'new', ?),
    ('Gwen', 'Guinevere', 'gwen.g@camelot.com', '555-0602', 'social', 'contacted', ?),
    ('Lancelot', 'DuLac', 'lance@lake.com', '555-0603', 'referral', 'converted', ?)`,
    [new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
  );

  alasql(`INSERT INTO treatment_plans (patient_id, dentist_id, title, status, total_cost, created_at) VALUES 
    (1, 1, 'Restoration & Crown Plan', 'active', 1350.0, ?)`
    , [yesterday.toISOString()]
  );

  alasql(`INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_number, notes, cost, status) VALUES 
    (1, 2, '14', 'Mesial-Occlusal composite', 150.0, 'completed'),
    (1, 4, '15', 'Full porcelain crown', 1200.0, 'pending')`
  );

  alasql(`INSERT INTO invoices (treatment_plan_id, patient_id, amount_due, discount, tax, total_amount, amount_paid, status, due_date, created_at) VALUES 
    (1, 1, 150.0, 0.0, 0.0, 150.0, 150.0, 'paid', ?, ?),
    (1, 1, 1200.0, 0.0, 0.0, 1200.0, 0.0, 'unpaid', ?, ?)`
    , [
      yesterday.toISOString().split('T')[0], yesterday.toISOString(),
      tomorrow.toISOString().split('T')[0], tomorrow.toISOString()
    ]
  );

  alasql(`INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref, created_at) VALUES 
    (1, 150.0, 'card', 'TX-778899', ?)`
    , [yesterday.toISOString()]
  );

  alasql(`INSERT INTO prescriptions (patient_id, dentist_id, medication, dosage, instructions, created_at) VALUES 
    (1, 2, 'Amoxicillin 500mg', '1 tablet 3 times a day', 'Take with food for 7 days', ?),
    (2, 3, 'Ibuprofen 400mg', '1 tablet every 6 hours', 'Take as needed for pain relief', ?)`
    , [yesterday.toISOString(), yesterday.toISOString()]
  );

  alasql(`INSERT INTO stock (item_name, category, quantity, unit, reorder_level, last_updated) VALUES 
    ('Dental Composite Syringes (A2)', 'Consumables', 25, 'pcs', 10, ?),
    ('Latex Examination Gloves (M)', 'Consumables', 150, 'boxes', 20, ?),
    ('Anesthetic Cartridges (Articaine)', 'Drugs', 5, 'boxes', 8, ?),
    ('Disposable Saliva Ejectors', 'Consumables', 80, 'packs', 15, ?),
    ('Dental Mirror Handles #4', 'Instruments', 12, 'pcs', 5, ?)`
    , [yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString(), yesterday.toISOString()]
  );

  alasql(`INSERT INTO dentist_availability (dentist_id, day_of_week, start_hour, end_hour) VALUES 
    (1, 1, '09:00', '17:00'),
    (1, 3, '09:00', '17:00'),
    (1, 5, '09:00', '17:00'),
    (2, 2, '09:00', '17:00'),
    (2, 4, '09:00', '17:00'),
    (2, 6, '09:00', '17:00')`
  );

  saveAlaSQLToDisk();
}

// Start MySQL connection check
initMySQL();

const sanitizeParams = (params) => {
  return params.map(p => {
    if (typeof p === 'string' && /^\d+$/.test(p)) {
      return parseInt(p, 10);
    }
    return p;
  });
};

module.exports = {
  get isMySQL() {
    return useMySQL;
  },
  query: async (sql, params = []) => {
    if (useMySQL && mysqlPool) {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    } else {
      return alasql(sql, sanitizeParams(params));
    }
  },
  get: async (sql, params = []) => {
    if (useMySQL && mysqlPool) {
      const [rows] = await mysqlPool.query(sql, params);
      return rows && rows.length > 0 ? rows[0] : null;
    } else {
      const res = alasql(sql, sanitizeParams(params));
      return res && res.length > 0 ? res[0] : null;
    }
  },
  run: async (sql, params = []) => {
    if (useMySQL && mysqlPool) {
      const [result] = await mysqlPool.query(sql, params);
      return { id: result.insertId || null, changes: result.affectedRows || 0 };
    } else {
      const sanitized = sanitizeParams(params);
      const res = alasql(sql, sanitized);

      let lastID = null;
      let changes = 1;

      const upperSql = sql.trim().toUpperCase();
      if (upperSql.startsWith('INSERT')) {
        const match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        if (match && match[1]) {
          const table = match[1];
          const lastRow = alasql(`SELECT MAX(id) AS maxId FROM ${table}`)[0];
          if (lastRow) lastID = lastRow.maxId;
        }
      } else if (upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
        changes = res;
      }

      saveAlaSQLToDisk();
      return { id: lastID, changes };
    }
  }
};
