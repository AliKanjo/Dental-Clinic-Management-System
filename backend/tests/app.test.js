const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const request = require('supertest');

// Configure test environment before loading app/config modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-suite-jwt-secret-key-minimum-32-chars';
process.env.DB_NAME = process.env.DB_NAME || 'dental_clinic_test_db';
process.env.CORS_ORIGINS = 'http://localhost:3000,https://allowed.example.com';
process.env.CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'UTC';
process.env.SEED_DEMO_DATA = 'true';

const app = require('../app');
const db = require('../db');
const { loadConfig } = require('../config/env');
const { getTimePartsInTimezone } = require('../services/appointmentService');
const { runMigrations } = require('../db/migrate');
const { clearDatabase, seedDemoData } = require('../db/seed');
const { getTestOutbox, clearTestOutbox } = require('../services/mailService');

function nextUtcWeekday(targetDow, weeksAhead = 2) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  while (date.getUTCDay() !== targetDow) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCDate(date.getUTCDate() + (weeksAhead - 1) * 7);
  return date.toISOString().slice(0, 10);
}

async function loginAs(email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, `Expected login 200 for ${email}, got ${res.status}: ${JSON.stringify(res.body)}`);
  return { agent, user: res.body };
}

describe('Dental Clinic Management System API', () => {
  before(async () => {
    await runMigrations();
    await clearDatabase();
    await seedDemoData({ force: true });
    clearTestOutbox();
  });

  after(async () => {
    await db.closePool();
  });

  describe('Startup configuration & CORS security', () => {
    it('fails loadConfig when JWT_SECRET is missing and validates CLINIC_TIMEZONE', () => {
      const originalSecret = process.env.JWT_SECRET;
      const originalTz = process.env.CLINIC_TIMEZONE;
      try {
        delete process.env.JWT_SECRET;
        assert.throws(() => loadConfig(), /JWT_SECRET/);
        process.env.JWT_SECRET = originalSecret;

        process.env.CLINIC_TIMEZONE = 'Invalid/Timezone_Name';
        assert.throws(() => loadConfig(), /CLINIC_TIMEZONE/);

        process.env.CLINIC_TIMEZONE = 'America/New_York';
        const cfg = loadConfig();
        assert.equal(cfg.clinicTimezone, 'America/New_York');

        // 2026-01-12T14:30:00Z is Monday 09:30 in America/New_York (EST, UTC-5)
        const parts = getTimePartsInTimezone('2026-01-12T14:30:00.000Z', 'America/New_York');
        assert.deepEqual(parts, { dayOfWeek: 1, timeStr: '09:30' });
      } finally {
        process.env.JWT_SECRET = originalSecret;
        process.env.CLINIC_TIMEZONE = originalTz;
      }
    });

    it('enforces CORS allowlist and rejects disallowed preflight origins', async () => {
      const allowedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://allowed.example.com');
      assert.equal(allowedRes.status, 200);
      assert.equal(allowedRes.headers['access-control-allow-origin'], 'https://allowed.example.com');
      assert.equal(allowedRes.headers['access-control-allow-credentials'], 'true');

      const blockedRes = await request(app)
        .options('/api/treatments')
        .set('Origin', 'https://evil.example.com');
      assert.equal(blockedRes.status, 403);
      assert.equal(blockedRes.headers['access-control-allow-origin'], undefined);
    });
  });

  describe('Authentication, cookies, and public registration', () => {
    it('logs in with HttpOnly SameSite=Lax cookie, verifies /me, and clears session on logout', async () => {
      const agent = request.agent(app);

      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email: 'admin@dental.com', password: 'admin123' });

      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.role, 'admin');

      const setCookie = loginRes.headers['set-cookie'] || [];
      assert.ok(setCookie.some((c) => c.startsWith('token=') && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)));

      const meBefore = await agent.get('/api/auth/me');
      assert.equal(meBefore.status, 200);
      assert.equal(meBefore.body.loggedIn, true);
      assert.equal(meBefore.body.user.email, 'admin@dental.com');

      const logoutRes = await agent.post('/api/auth/logout');
      assert.equal(logoutRes.status, 200);

      const meAfter = await agent.get('/api/auth/me');
      assert.equal(meAfter.status, 401);
      assert.equal(meAfter.body.loggedIn, false);
    });

    it('rejects invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@dental.com', password: 'wrongpassword' });
      assert.equal(res.status, 400);
    });

    it('enforces minimum password length (8 chars) and locks public registration to patient role', async () => {
      const shortPassRes = await request(app).post('/api/auth/register').send({
        email: 'shortpass@example.com',
        password: '1234567',
        firstName: 'Short',
        lastName: 'Pass',
      });
      assert.equal(shortPassRes.status, 400);

      const regRes = await request(app).post('/api/auth/register').send({
        email: 'escalate@example.com',
        password: 'securepassword1',
        firstName: 'Test',
        lastName: 'Patient',
        phone: '555-9900',
        role: 'admin',
      });

      assert.equal(regRes.status, 201);
      assert.equal(regRes.body.role, 'patient');

      const { agent, user } = await loginAs('escalate@example.com', 'securepassword1');
      assert.equal(user.role, 'patient');
      assert.ok(Number.isInteger(user.relatedId));

      const adminRouteRes = await agent.get('/api/users');
      assert.equal(adminRouteRes.status, 403);
    });
  });

  describe('Password reset flow', () => {
    it('returns identical generic messages, delivers code via mail service, enforces attempts & min password length', async () => {
      clearTestOutbox();

      const unknownRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'doesnotexist@example.com' });
      assert.equal(unknownRes.status, 200);
      assert.equal(unknownRes.body.resetCode, undefined);
      assert.equal(getTestOutbox().length, 0);

      const knownRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'john.doe@dental.com' });
      assert.equal(knownRes.status, 200);
      assert.equal(knownRes.body.message, unknownRes.body.message);
      assert.equal(knownRes.body.resetCode, undefined);

      const outbox = getTestOutbox();
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].to, 'john.doe@dental.com');
      assert.match(outbox[0].code, /^\d{6}$/);

      // Validation check: newPassword < 8 characters rejected
      const weakResetRes = await request(app).post('/api/auth/reset-password').send({
        email: 'john.doe@dental.com',
        resetCode: outbox[0].code,
        newPassword: 'short',
      });
      assert.equal(weakResetRes.status, 400);

      // Brute-force attempt limit check (5 invalid tries -> 429)
      for (let i = 1; i <= 4; i++) {
        const badRes = await request(app).post('/api/auth/reset-password').send({
          email: 'john.doe@dental.com',
          resetCode: '000000',
          newPassword: 'newpassword123',
        });
        assert.equal(badRes.status, 400);
      }
      const fifthBadRes = await request(app).post('/api/auth/reset-password').send({
        email: 'john.doe@dental.com',
        resetCode: '000000',
        newPassword: 'newpassword123',
      });
      assert.equal(fifthBadRes.status, 429);

      // Request a fresh reset code and complete reset
      clearTestOutbox();
      const refreshRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'john.doe@dental.com' });
      assert.equal(refreshRes.status, 200);

      const freshCode = getTestOutbox()[0].code;
      const validResetRes = await request(app).post('/api/auth/reset-password').send({
        email: 'john.doe@dental.com',
        resetCode: freshCode,
        newPassword: 'newpassword123',
      });
      assert.equal(validResetRes.status, 200);

      const oldPassLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@dental.com', password: 'patient123' });
      assert.equal(oldPassLogin.status, 400);

      await loginAs('john.doe@dental.com', 'newpassword123');
    });

    it('rate-limits excessive forgot-password requests per email', async () => {
      const targetEmail = 'ratelimit@example.com';
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: targetEmail });
        assert.equal(res.status, 200);
      }

      const sixthRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: targetEmail });
      assert.equal(sixthRes.status, 429);
    });
  });

  describe('Role-based access control & patient record isolation', () => {
    it('enforces authentication and role restrictions on protected routes', async () => {
      const unauth = await request(app).get('/api/patients');
      assert.equal(unauth.status, 401);

      const { agent: staffAgent } = await loginAs('emily.watson@dental.com', 'staff123');
      const staffUsersRes = await staffAgent.get('/api/users');
      assert.equal(staffUsersRes.status, 403);

      const { agent: patAgent } = await loginAs('john.doe@dental.com', 'newpassword123');
      assert.equal((await patAgent.get('/api/leads')).status, 403);
      assert.equal((await patAgent.get('/api/stock')).status, 403);
      assert.equal((await patAgent.get('/api/dashboard/stats')).status, 403);
      assert.equal((await patAgent.post('/api/patients').send({ firstName: 'X', lastName: 'Y' })).status, 403);
    });

    it('restricts patients to their own profile, 360 chart, and invoices', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        email: 'isolated.patient@example.com',
        password: 'patientpassword1',
        firstName: 'Isolated',
        lastName: 'Patient',
      });
      assert.equal(regRes.status, 201);

      const { agent: patientB, user: userB } = await loginAs('isolated.patient@example.com', 'patientpassword1');
      assert.notEqual(userB.relatedId, 1);

      // Cannot view or update patient #1 (John Doe)
      assert.equal((await patientB.get('/api/patients/1')).status, 403);
      assert.equal(
        (await patientB.put('/api/patients/1').send({ firstName: 'Hack', lastName: 'Attempt' })).status,
        403
      );

      // Can view own 360 chart
      const ownChartRes = await patientB.get(`/api/patients/${userB.relatedId}`);
      assert.equal(ownChartRes.status, 200);
      assert.equal(ownChartRes.body.patient.email, 'isolated.patient@example.com');

      // Cannot view seeded invoice #1 or #2 belonging to patient #1
      assert.equal((await patientB.get('/api/invoices/1')).status, 403);
      const listInvoicesB = await patientB.get('/api/invoices');
      assert.equal(listInvoicesB.status, 200);
      assert.equal(listInvoicesB.body.length, 0);

      // Patient #1 can read own invoices
      const { agent: patientA } = await loginAs('john.doe@dental.com', 'newpassword123');
      const ownInvRes = await patientA.get('/api/invoices/1');
      assert.equal(ownInvRes.status, 200);
      assert.equal(ownInvRes.body.invoice.patient_id, 1);
    });
  });

  describe('Appointments availability and conflict checking', () => {
    it('enforces dentist shifts and blocks overlapping scheduled appointments', async () => {
      const { agent: staffAgent } = await loginAs('emily.watson@dental.com', 'staff123');

      const nextSunday = nextUtcWeekday(0, 2); // Dentist #1 is off on Sundays
      const nextMonday = nextUtcWeekday(1, 2); // Dentist #1 works Mon 09:00-17:00 UTC

      const offDayRes = await staffAgent.post('/api/appointments').send({
        patientId: 1,
        dentistId: 1,
        startTime: `${nextSunday}T10:00:00.000Z`,
        endTime: `${nextSunday}T11:00:00.000Z`,
        notes: 'Off day check',
      });
      assert.equal(offDayRes.status, 400);

      const offHoursRes = await staffAgent.post('/api/appointments').send({
        patientId: 1,
        dentistId: 1,
        startTime: `${nextMonday}T18:00:00.000Z`,
        endTime: `${nextMonday}T19:00:00.000Z`,
        notes: 'After hours check',
      });
      assert.equal(offHoursRes.status, 400);

      const validRes = await staffAgent.post('/api/appointments').send({
        patientId: 1,
        dentistId: 1,
        startTime: `${nextMonday}T11:00:00.000Z`,
        endTime: `${nextMonday}T12:00:00.000Z`,
        notes: 'Valid Monday slot',
      });
      assert.equal(validRes.status, 201);

      const overlapRes = await staffAgent.post('/api/appointments').send({
        patientId: 2,
        dentistId: 1,
        startTime: `${nextMonday}T11:30:00.000Z`,
        endTime: `${nextMonday}T12:30:00.000Z`,
        notes: 'Overlapping Monday slot',
      });
      assert.equal(overlapRes.status, 409);
    });
  });

  describe('Payments, row locking, and transactional workflows', () => {
    it('handles partial payment, rejects overpayment, prevents concurrent double-overpay, and completes full payment', async () => {
      const { agent: staffAgent } = await loginAs('emily.watson@dental.com', 'staff123');

      // Seeded invoice #2 has total_amount = 1200.00, amount_paid = 0.00
      const partialRes = await staffAgent.post('/api/invoices/2/payments').send({
        amount: 400,
        paymentMethod: 'card',
        transactionRef: 'TX-PART-1',
      });
      assert.equal(partialRes.status, 201);
      assert.equal(partialRes.body.status, 'partially_paid');
      assert.equal(partialRes.body.newPaid, 400);

      // Overpayment ($900 when $800 remains) must be rejected
      const overpayRes = await staffAgent.post('/api/invoices/2/payments').send({
        amount: 900,
        paymentMethod: 'cash',
      });
      assert.equal(overpayRes.status, 400);

      // Two concurrent full remaining payments ($800 each) -> SELECT ... FOR UPDATE allows only one
      const [payA, payB] = await Promise.all([
        staffAgent.post('/api/invoices/2/payments').send({
          amount: 800,
          paymentMethod: 'card',
          transactionRef: 'TX-CONCURRENT-A',
        }),
        staffAgent.post('/api/invoices/2/payments').send({
          amount: 800,
          paymentMethod: 'card',
          transactionRef: 'TX-CONCURRENT-B',
        }),
      ]);

      const statuses = [payA.status, payB.status].sort();
      assert.deepEqual(statuses, [201, 400]);

      // Verify invoice #2 is strictly paid at $1200.00 with zero overpayment
      const invDetail = await staffAgent.get('/api/invoices/2');
      assert.equal(invDetail.status, 200);
      assert.equal(invDetail.body.invoice.status, 'paid');
      assert.equal(Number(invDetail.body.invoice.amount_paid), 1200);

      const postPaidRes = await staffAgent.post('/api/invoices/2/payments').send({
        amount: 10,
        paymentMethod: 'cash',
      });
      assert.equal(postPaidRes.status, 400);
    });

    it('executes transactional lead conversion and plan item completion invoicing', async () => {
      const { agent: staffAgent } = await loginAs('emily.watson@dental.com', 'staff123');
      const { agent: dentistAgent } = await loginAs('sarah.jenkins@dental.com', 'dentist123');

      // Lead conversion creates a new patient row
      const leadRes = await staffAgent.post('/api/leads').send({
        firstName: 'Merlin',
        lastName: 'Ambrosius',
        email: 'merlin.convert@example.com',
        phone: '555-7777',
        source: 'Website Booking',
      });
      assert.equal(leadRes.status, 201);

      const convertRes = await staffAgent.put(`/api/leads/${leadRes.body.id}`).send({
        status: 'converted',
        email: 'merlin.convert@example.com',
        phone: '555-7777',
      });
      assert.equal(convertRes.status, 200);

      const patSearchRes = await staffAgent.get('/api/patients?q=merlin.convert@example.com');
      assert.equal(patSearchRes.status, 200);
      assert.equal(patSearchRes.body.length, 1);

      // Treatment plan creation & item completion auto-invoice
      const planRes = await dentistAgent.post('/api/plans').send({
        patientId: patSearchRes.body[0].id,
        dentistId: 1,
        title: 'Merlin Hygiene Plan',
        items: [{ treatmentId: 1, toothNumber: '11', notes: 'Routine cleaning', cost: 100 }],
      });
      assert.equal(planRes.status, 201);

      const chart = await dentistAgent.get(`/api/patients/${patSearchRes.body[0].id}`);
      const planItemId = chart.body.treatmentPlans[0].items[0].id;

      const completeItemRes = await dentistAgent
        .put(`/api/plans/items/${planItemId}`)
        .send({ status: 'completed' });
      assert.equal(completeItemRes.status, 200);
      assert.ok(Number.isInteger(completeItemRes.body.invoiceId));
    });
  });
});
