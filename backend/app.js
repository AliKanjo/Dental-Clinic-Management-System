const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
require('./config/env');

const db = require('./db');
const corsMiddleware = require('./middleware/cors');
const { errorHandler } = require('./middleware/errorHandler');
const asyncHandler = require('./middleware/asyncHandler');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const dentistRoutes = require('./routes/dentists');
const appointmentRoutes = require('./routes/appointments');
const treatmentRoutes = require('./routes/treatments');
const planRoutes = require('./routes/plans');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const leadRoutes = require('./routes/leads');
const followupRoutes = require('./routes/followups');
const prescriptionRoutes = require('./routes/prescriptions');
const stockRoutes = require('./routes/stock');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');

const app = express();
const publicDir = path.join(__dirname, '../public');

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(corsMiddleware);
app.use(express.static(publicDir));

// Health checks
app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: 'Dental Clinic Management API' });
});

app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    await db.verifyConnection();
    res.json({ status: 'ok', database: 'mysql', timestamp: new Date().toISOString() });
  })
);

// Mount resource routers under /api
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dentists', dentistRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Return JSON 404 for unknown API paths
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

module.exports = app;

