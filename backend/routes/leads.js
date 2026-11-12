const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const leadService = require('../services/leadService');
const {
  idParamSchema,
  createLeadSchema,
  updateLeadSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken, requireRole(['admin', 'staff']));

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const leads = await leadService.listLeads();
    res.json(leads);
  })
);

router.post(
  '/',
  validate({ body: createLeadSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await leadService.createLead(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateLeadSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await leadService.updateLead(req.params.id, req.body);
    res.json(result);
  })
);

module.exports = router;

