const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const paymentService = require('../services/paymentService');
const { emptySchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const payments = await paymentService.listPayments(req.user);
    res.json(payments);
  })
);

module.exports = router;

