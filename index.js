const express = require('express');
const app = require('./backend/server');

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Dental Clinic Management System listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

