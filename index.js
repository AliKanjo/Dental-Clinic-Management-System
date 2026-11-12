// Root entrypoint for Vercel's Express preset, which looks for the app here.
// Local development uses backend/server.js (npm start).
const express = require('express'); // eslint-disable-line no-unused-vars -- lets Vercel detect the framework
const app = require('./backend/app');

module.exports = app;
