const db = require('../db');

async function getStats() {
  const apptsCount = await db.get("SELECT COUNT(*) AS total FROM appointments WHERE status = 'scheduled'");
  const patientsCount = await db.get('SELECT COUNT(*) AS total FROM patients');

  const billingStats = await db.get(`
    SELECT COALESCE(SUM(total_amount), 0) AS revenue,
           COALESCE(SUM(amount_paid), 0) AS collected,
           COALESCE(SUM(total_amount - amount_paid), 0) AS outstanding
    FROM invoices
  `);

  const apptStatusStats = await db.query(
    'SELECT status, COUNT(*) AS `count` FROM appointments GROUP BY status'
  );

  const treatmentPopularity = await db.query(`
    SELECT t.name, COUNT(*) AS \`count\`
    FROM treatment_plan_items tpi
    JOIN treatments t ON tpi.treatment_id = t.id
    GROUP BY t.id, t.name
    ORDER BY \`count\` DESC
    LIMIT 5
  `);

  const monthlyEarnings = await db.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS \`month\`, SUM(amount) AS \`total\`
    FROM payments
    GROUP BY \`month\`
    ORDER BY \`month\` DESC
    LIMIT 6
  `);

  return {
    appointmentsCount: (apptsCount && apptsCount.total) || 0,
    patientsCount: (patientsCount && patientsCount.total) || 0,
    revenue: (billingStats && Number(billingStats.revenue)) || 0,
    collected: (billingStats && Number(billingStats.collected)) || 0,
    outstanding: (billingStats && Number(billingStats.outstanding)) || 0,
    appointmentDistribution: apptStatusStats || [],
    treatmentsPopularity: treatmentPopularity || [],
    monthlyEarnings: monthlyEarnings ? monthlyEarnings.reverse() : [],
  };
}

module.exports = {
  getStats,
};

