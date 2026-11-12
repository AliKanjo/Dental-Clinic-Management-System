CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'dentist', 'staff', 'patient') NOT NULL DEFAULT 'patient',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dentists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  specialization VARCHAR(255) NOT NULL DEFAULT 'General Dentistry',
  license_number VARCHAR(100) NULL,
  color_code VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
  INDEX idx_dentists_user_id (user_id),
  CONSTRAINT fk_dentists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(50) NULL,
  address TEXT NULL,
  medical_allergies TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_patients_user_id (user_id),
  INDEX idx_patients_email (email),
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('pending', 'scheduled', 'completed', 'cancelled', 'no-show') NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  INDEX idx_appointments_patient_id (patient_id),
  INDEX idx_appointments_dentist_id (dentist_id),
  INDEX idx_appointments_start_time (start_time),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS treatments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  base_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_treatment_plans_patient_id (patient_id),
  INDEX idx_treatment_plans_dentist_id (dentist_id),
  CONSTRAINT fk_treatment_plans_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_treatment_plans_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS treatment_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  treatment_plan_id INT NOT NULL,
  treatment_id INT NOT NULL,
  tooth_number VARCHAR(50) NULL,
  notes TEXT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  INDEX idx_tpi_plan_id (treatment_plan_id),
  INDEX idx_tpi_treatment_id (treatment_id),
  CONSTRAINT fk_tpi_plan FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_tpi_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  treatment_plan_id INT NULL,
  patient_id INT NOT NULL,
  amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('unpaid', 'partially_paid', 'paid') NOT NULL DEFAULT 'unpaid',
  due_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoices_plan_id (treatment_plan_id),
  INDEX idx_invoices_patient_id (patient_id),
  CONSTRAINT fk_invoices_plan FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_ref VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_invoice_id (invoice_id),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  source VARCHAR(50) NULL,
  status ENUM('new', 'contacted', 'converted', 'lost') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS follow_ups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NULL,
  lead_id INT NULL,
  assigned_to INT NULL,
  scheduled_date DATE NOT NULL,
  notes TEXT NULL,
  status ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  completed_at DATETIME NULL,
  INDEX idx_follow_ups_patient_id (patient_id),
  INDEX idx_follow_ups_lead_id (lead_id),
  INDEX idx_follow_ups_assigned_to (assigned_to),
  CONSTRAINT fk_follow_ups_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_follow_ups_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_follow_ups_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NULL,
  instructions TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prescriptions_patient_id (patient_id),
  INDEX idx_prescriptions_dentist_id (dentist_id),
  CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_prescriptions_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Consumables',
  quantity INT NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  reorder_level INT NOT NULL DEFAULT 10,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dentist_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dentist_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_hour VARCHAR(20) NOT NULL,
  end_hour VARCHAR(20) NOT NULL,
  INDEX idx_dentist_avail_dentist_id (dentist_id),
  CONSTRAINT fk_dentist_avail_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

