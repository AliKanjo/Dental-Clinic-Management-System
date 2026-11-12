const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const invoiceService = require('../services/invoiceService');
const {
  idParamSchema,
  createPaymentSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const invoices = await invoiceService.listInvoices(req.user);
    res.json(invoices);
  })
);

router.get(
  '/:id',
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const data = await invoiceService.getInvoiceById({
      user: req.user,
      invoiceId: req.params.id,
    });
    res.json(data);
  })
);

router.post(
  '/:id/payments',
  requireRole(['admin', 'staff']),
  validate({ params: idParamSchema, body: createPaymentSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await invoiceService.recordPayment({
      invoiceId: req.params.id,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      transactionRef: req.body.transactionRef,
    });
    res.status(201).json(result);
  })
);

module.exports = router;

