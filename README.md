# DentFlow Pro — Dental Clinic Management System

A full-stack dental clinic management application built with Node.js, Express, MySQL, and modular Vanilla ES Modules.

---

## Project Structure

```text
├── api/
│   └── index.js                # Vercel serverless entrypoint importing backend/app
├── backend/
│   ├── .env.example            # Environment variable template
│   ├── app.js                  # Express app setup (middleware, routes, static public/)
│   ├── server.js               # Local HTTP server entrypoint (verifies MySQL at startup)
│   ├── db.js                   # mysql2/promise pool, query helpers, and transaction wrapper
│   ├── config/
│   │   └── env.js              # Environment loading & required config validation
│   ├── db/
│   │   ├── migrate.js          # SQL migration runner
│   │   └── seed.js             # Opt-in demo data seeder (SEED_DEMO_DATA=true)
│   ├── middleware/
│   │   ├── asyncHandler.js     # Async route wrapper
│   │   ├── auth.js             # JWT cookie authentication & role authorization
│   │   ├── cors.js             # Environment-configured CORS allowlist
│   │   ├── errorHandler.js     # Centralized error handler & AppError
│   │   └── validate.js         # Zod request validation (body, params, query)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_password_resets.sql
│   ├── routes/                 # Thin Express routers mounted under /api
│   ├── services/               # Business logic, SQL queries, mail, and AI service
│   ├── tests/                  # Integration tests (node:test + supertest)
│   └── validators/
│       └── schemas.js          # Zod schemas for all endpoints
├── public/                     # Frontend SPA (served statically)
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── api.js
│       ├── main.js
│       ├── router.js
│       ├── state.js
│       ├── utils.js
│       └── views/              # Modular view controllers
├── package.json
└── vercel.json
```

---

## Prerequisites

- **Node.js** `>= 18.0.0`
- **MySQL** (or MariaDB compatible with MySQL protocol) running on port `3306`

---

## Setup & Local Development

1. **Install dependencies** from the repository root:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `backend/.env.example` to `backend/.env` and set required values:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Key variables in `backend/.env` (and Vercel Project Environment Variables):
   - `NODE_ENV` — `development`, `test`, or `production`
   - `PORT` — HTTP server port (default `3000`)
   - `JWT_SECRET` — **Required.** Server fails to start if unset
   - `CORS_ORIGINS` — Comma-separated allowed origins (e.g. `http://localhost:3000` or your Vercel domain)
   - `CLINIC_TIMEZONE` — IANA timezone for clinic appointment availability checks (default `UTC`, e.g. `America/New_York`)
   - `DB_HOST`, `DB_PORT` (default `3306`), `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `SEED_DEMO_DATA` — Must be explicitly set to `true` to seed demo accounts (disabled in production)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP settings for password reset emails
   - `AISA_API_KEY`, `AISA_BASE_URL` — Optional AI treatment assistant configuration

3. **Run database migrations**:
   ```bash
   npm run migrate
   ```

4. **(Optional) Seed demo accounts for local development**:
   Never run in production. Set `SEED_DEMO_DATA=true` in `backend/.env` (or inline) and run:
   ```bash
   SEED_DEMO_DATA=true npm run seed
   ```
   Demo accounts seeded in development:
   - Admin: `admin@dental.com` / `admin123`
   - Dentist: `sarah.jenkins@dental.com` / `dentist123`
   - Staff: `emily.watson@dental.com` / `staff123`
   - Patient: `john.doe@dental.com` / `patient123`

5. **Start the server**:
   ```bash
   npm start
   ```
   Or with auto-reload during development:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Running Tests

The integration suite uses `node:test` and `supertest` against a MySQL test database (`DB_NAME`, defaulting to `dental_clinic_test_db` in tests).

```bash
npm test
```

Ensure a MySQL server is reachable with the credentials configured in `backend/.env` (or environment variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
