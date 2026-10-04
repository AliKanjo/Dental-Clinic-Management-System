# DentalFlow — Dental Clinic Management System

DentalFlow is a modern, full-featured web-based Dental Practice and Clinic Management System designed for clinics, dental professionals, reception staff, and patients. It streamlines everyday dental clinical workflows—from patient intake, appointment scheduling, and interactive odontogram dental charting, to treatment planning, electronic prescriptions, CRM lead tracking, medical stock inventory, and multi-tier billing.

---

## Key Highlights

- **Dual Database Architecture**: Works out-of-the-box using an embedded, persistent SQL engine (`AlaSQL` + JSON) without needing external database installation, while seamlessly connecting to MySQL for production deployments.
- **Role-Based Access Control (RBAC)**: Dedicated interfaces and permissions tailored for Administrators, Dentists, Clinic Staff, and Patients.
- **Interactive Odontogram**: Tooth-by-tooth visual dental chart supporting adult teeth numbering, diagnosis marking, and procedure tracking.
- **Smart Clinical AI Assistant**: Optional AI integration for symptom-to-treatment plan generation and clinical note structuring with allergy detection.
- **Zero-Dependency Modern Frontend**: Built with clean Vanilla JavaScript, responsive CSS with Dark/Light theme toggle, and Chart.js analytics—no heavy frontend build pipeline required.

---

## System Capabilities & Modules

### 1. Multi-Role Portals & Security
- **Administrator**: Full clinic governance, user account management (CRUD for dentists, staff, and patients), treatment service pricing, dentist availability shifts, and clinic-wide financial analytics.
- **Dentist (Doctor)**: Personal schedule & appointments, assigned patient charts, treatment plan creation, tooth-level procedure execution, e-Prescriptions, and clinical notes.
- **Clinic Staff / Reception**: Front-desk operations, patient registration, calendar booking with real-time conflict checking, lead CRM & follow-up call logs, invoice generation, and POS payment collection.
- **Patient Portal**: Self-service appointment requests, personal treatment plan tracking, clinical history & allergies review, and invoice/payment receipts.
- **Authentication**: Secure JWT stored in HTTP-only cookies, bcrypt password hashing, and a 6-digit OTP verification workflow for password resets.

### 2. Clinical Care & Odontogram
- **Visual Dental Charting**: Interactive graphical tooth chart (teeth 1–32) for recording dental conditions (caries, crowns, fillings, extractions, root canals).
- **Treatment Plans**: Multi-item structured treatment plans linked to specific teeth and catalog pricing.
- **Automated Invoicing**: Completing a treatment plan item automatically creates an invoice entry for transparent patient billing.
- **e-Prescriptions**: Fast medication dispensing module with dosage, course instructions, and patient history reference.

### 3. Scheduling & Operations
- **Smart Appointment Booking**: Time-slot reservation with automated dentist shift checking and double-booking conflict prevention.
- **Status Pipeline**: Manage appointments through lifecycle stages (`scheduled`, `completed`, `cancelled`, `pending`).
- **Dentist Availability**: Configurable working days and shift hours per provider.

### 4. Financial Management & POS
- **Invoicing**: Detailed itemized billing with balance due, discount, and tax calculations.
- **Payments**: Support for full and split/partial payments via Cash, Credit/Debit Card, Bank Transfer, or Insurance.
- **Payment History**: Transaction references and real-time calculation of collected revenue vs. outstanding dues.

### 5. CRM, Leads & Follow-ups
- **Lead Pipeline**: Track prospective patients from web, social media, walk-in, and referral sources.
- **One-Click Lead Conversion**: Automatically convert prospective leads into registered patient profiles.
- **Follow-up Tasks**: Assign callback and reminder tasks to staff with scheduled dates and status tracking.

### 6. Medical Inventory & Stock Control
- Itemized tracking of clinical consumables, dental instruments, and pharmaceuticals.
- Configurable minimum reorder levels with stock status monitoring.

### 7. Real-Time Business Dashboard
- Visual KPIs including scheduled visits, registered patients, total revenue, collected revenue, and outstanding balance.
- Interactive Chart.js graphs displaying appointment distributions, popular treatments, and 6-month monthly revenue trends.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Runtime** | Node.js (v18+) |
| **Server Framework** | Express 4.x |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser` |
| **Database** | MySQL (via `mysql2`) with automatic fallback to portable `AlaSQL` |
| **AI Integration** | OpenAI-compatible REST API (AIsa integration) |
| **Frontend UI** | HTML5, Vanilla JavaScript (Single Page Architecture), Vanilla CSS |
| **Icons & Charts** | Lucide Icons, Chart.js |

---

## Project Structure

```text
Dental clinic management system/
│
├── backend/
│   ├── db.js                 # Dual-driver database abstraction layer (MySQL & AlaSQL)
│   ├── dental.json           # Local persistent storage for AlaSQL fallback mode
│   ├── package.json          # Node dependencies and project scripts
│   ├── server.js             # Express API routes, auth middleware, and static server
│   ├── test.js               # Backend API and integration test suite
│   ├── .env                  # Environment configuration file
│   └── .env.example          # Template for environment configuration
│
├── frontend/
│   ├── app.js                # SPA state management, routing, and dynamic UI controllers
│   ├── index.html            # Main HTML shell, authentication modal, and layout
│   └── style.css             # Responsive theme styling with CSS custom properties
│
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- *(Optional)* MySQL Server 8.x (if using MySQL instead of the built-in portable SQL engine)

---

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "Dental clinic management system"
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**:
   Copy the example environment file and customize as needed:
   ```bash
   cp .env.example .env
   ```

   **Default `.env` configuration**:
   ```ini
   PORT=3000
   JWT_SECRET=dental-secret-key-12345

   # Database settings (Optional: if MySQL is offline, the app defaults to AlaSQL automatically)
   DB_DRIVER=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=dental_clinic_db

   # Optional AI Assistant configuration
   # AISA_API_KEY=your_api_key_here
   # AISA_BASE_URL=https://api.aisa.one/v1
   ```

4. **Start the application**:
   ```bash
   npm start
   ```
   *(Or run with `node server.js` / nodemon for development)*

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Default Demo Accounts

The system automatically initializes and seeds standard demo credentials across all user tiers:

| Role | Email | Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@dental.com` | `admin123` | Clinic settings, user management, financial reports, catalog pricing |
| **Dentist** | `sarah.jenkins@dental.com` | `dentist123` | Appointments, clinical dental charts, treatment plans, e-Prescriptions |
| **Dentist** | `robert.chen@dental.com` | `dentist123` | Orthodontics & implant schedules, dental records |
| **Staff** | `emily.watson@dental.com` | `staff123` | Reception, patient booking, CRM leads, follow-up calls, billing POS |
| **Patient** | `john.doe@dental.com` | `patient123` | Patient self-service portal, view care plans, invoices, and bookings |

---

## API Overview

The backend exposes a RESTful JSON API:

### Authentication
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Authenticate and receive session cookie
- `POST /api/auth/logout` — Invalidate user session
- `GET /api/auth/me` — Retrieve active user session profile
- `POST /api/auth/forgot-password` — Issue 6-digit password reset OTP
- `POST /api/auth/reset-password` — Verify OTP and update password

### Clinical & Patients
- `GET /api/patients` — List patients with search and provider filtering
- `GET /api/patients/:id` — Patient 360 profile (appointments, plans, invoices)
- `POST /api/patients` — Create patient profile
- `PUT /api/patients/:id` — Update patient profile & medical allergies
- `GET /api/treatments` — Service packages & pricing catalog
- `GET /api/plans` — Fetch treatment plans
- `POST /api/plans` — Create treatment plan with itemized teeth procedures
- `PUT /api/plans/items/:itemId` — Update item status & trigger auto-invoicing
- `GET /api/prescriptions` — Electronic prescriptions list
- `POST /api/prescriptions` — Dispense new prescription

### Scheduling & Operations
- `GET /api/appointments` — Fetch appointments (filtered by patient/dentist role)
- `POST /api/appointments` — Book appointment with availability verification
- `PUT /api/appointments/:id` — Reschedule, update status, or cancel appointment
- `GET /api/dentists` — List dentists and color markers
- `GET /api/dentists/:id/availability` — Fetch dentist shift hours
- `POST /api/dentists/:id/availability` — Configure weekly shift schedules

### Billing & CRM
- `GET /api/invoices` — List invoices
- `GET /api/invoices/:id` — Detailed invoice breakdown and payment history
- `POST /api/invoices/:id/payments` — Record payment against an invoice
- `GET /api/leads` — View incoming CRM leads
- `POST /api/leads` — Create lead record
- `PUT /api/leads/:id` — Update lead status (converts to patient on `converted`)
- `GET /api/followups` — Scheduled staff call reminders
- `POST /api/followups` — Schedule follow-up task
- `PUT /api/followups/:id` — Complete or update follow-up task

### Inventory & Administration
- `GET /api/stock` — Inventory levels and low-stock indicators
- `POST /api/stock` — Add inventory item
- `PUT /api/stock/:id` — Update stock counts and reorder thresholds
- `GET /api/users` — List system users and provider mappings (Admin only)
- `POST /api/users` — Create user account with assigned role (Admin only)
- `PUT /api/users/:id` — Modify user credentials and profile (Admin only)
- `DELETE /api/users/:id` — Remove user account (Admin only)
- `GET /api/dashboard/stats` — Aggregated metrics and revenue trends

### AI Smart Assistant
- `POST /api/ai/suggest-plan` — AI-driven treatment recommendations based on symptoms
- `POST /api/ai/optimize-notes` — Clinical note structuring and allergy extraction

---

## Testing

Run the automated backend test suite:
```bash
cd backend
node test.js
```

---

## License

This project is released under the [MIT License](LICENSE).
