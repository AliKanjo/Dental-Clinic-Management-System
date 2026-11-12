const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const dentistService = require('../services/dentistService');
const {
  idParamSchema,
  dentistAvailabilitySchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const dentists = await dentistService.listDentists();
    res.json(dentists);
  })
);

router.get(
  '/:id/availability',
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const list = await dentistService.getAvailability(req.params.id);
    res.json(list);
  })
);

router.post(
  '/:id/availability',
  requireRole(['admin']),
  validate({ params: idParamSchema, body: dentistAvailabilitySchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await dentistService.setAvailability(req.params.id, req.body.shifts);
    res.json(result);
  })
);

module.exports = router;

