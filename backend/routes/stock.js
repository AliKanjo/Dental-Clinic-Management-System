const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const stockService = require('../services/stockService');
const {
  idParamSchema,
  stockBodySchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRole(['admin', 'staff', 'dentist']),
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const list = await stockService.listStock();
    res.json(list);
  })
);

router.post(
  '/',
  requireRole(['admin', 'staff']),
  validate({ body: stockBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await stockService.createStock(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requireRole(['admin', 'staff', 'dentist']),
  validate({ params: idParamSchema, body: stockBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await stockService.updateStock(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  requireRole(['admin', 'staff']),
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await stockService.deleteStock(req.params.id);
    res.json(result);
  })
);

module.exports = router;

