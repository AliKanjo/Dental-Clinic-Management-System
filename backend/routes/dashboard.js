const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const dashboardService = require('../services/dashboardService');
const { emptySchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken, requireRole(['admin', 'dentist', 'staff']));

router.get(
  '/stats',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats();
    res.json(stats);
  })
);

module.exports = router;

