const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const prescriptionService = require('../services/prescriptionService');
const {
  idParamSchema,
  createPrescriptionSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const list = await prescriptionService.listPrescriptions(req.user);
    res.json(list);
  })
);

router.post(
  '/',
  requireRole(['admin', 'dentist']),
  validate({ body: createPrescriptionSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await prescriptionService.createPrescription(req.body);
    res.status(201).json(result);
  })
);

router.delete(
  '/:id',
  requireRole(['admin', 'dentist']),
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await prescriptionService.deletePrescription(req.params.id);
    res.json(result);
  })
);

module.exports = router;

