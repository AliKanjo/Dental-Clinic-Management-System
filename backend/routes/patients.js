const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const patientService = require('../services/patientService');
const {
  idParamSchema,
  patientsQuerySchema,
  patientBodySchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRole(['admin', 'dentist', 'staff']),
  validate({ query: patientsQuerySchema }),
  asyncHandler(async (req, res) => {
    const patients = await patientService.listPatients({
      user: req.user,
      q: req.query.q,
      assignedOnly: req.query.assignedOnly,
    });
    res.json(patients);
  })
);

router.get(
  '/:id',
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const data = await patientService.getPatient360({
      user: req.user,
      patientId: req.params.id,
    });
    res.json(data);
  })
);

router.post(
  '/',
  requireRole(['admin', 'staff']),
  validate({ body: patientBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await patientService.createPatient(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requireRole(['admin', 'staff', 'dentist', 'patient']),
  validate({ params: idParamSchema, body: patientBodySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await patientService.updatePatient({
      user: req.user,
      patientId: req.params.id,
      data: req.body,
    });
    res.json(result);
  })
);

router.delete(
  '/:id',
  requireRole(['admin', 'staff']),
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await patientService.deletePatient(req.params.id);
    res.json(result);
  })
);

module.exports = router;
