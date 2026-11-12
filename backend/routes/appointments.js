const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const appointmentService = require('../services/appointmentService');
const {
  idParamSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const appointments = await appointmentService.listAppointments(req.user);
    res.json(appointments);
  })
);

router.post(
  '/',
  validate({ body: createAppointmentSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await appointmentService.createAppointment({
      user: req.user,
      data: req.body,
    });
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateAppointmentSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await appointmentService.updateAppointment({
      user: req.user,
      appointmentId: req.params.id,
      data: req.body,
    });
    res.json(result);
  })
);

module.exports = router;

