const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const treatmentService = require('../services/treatmentService');
const {
  idParamSchema,
  treatmentBodySchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const treatments = await treatmentService.listTreatments();
    res.json(treatments);
  })
);

router.post(
  '/',
  requireRole(['admin', 'staff']),
  validate({ body: treatmentBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await treatmentService.createTreatment(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requireRole(['admin', 'staff']),
  validate({ params: idParamSchema, body: treatmentBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await treatmentService.updateTreatment(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  requireRole(['admin']),
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await treatmentService.deleteTreatment(req.params.id);
    res.json(result);
  })
);

module.exports = router;

