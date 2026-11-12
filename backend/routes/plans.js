const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const planService = require('../services/planService');
const {
  createPlanSchema,
  itemIdParamSchema,
  updatePlanItemSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const plans = await planService.listPlans(req.user);
    res.json(plans);
  })
);

router.post(
  '/',
  requireRole(['admin', 'dentist']),
  validate({ body: createPlanSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await planService.createPlan(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/items/:itemId',
  requireRole(['admin', 'dentist']),
  validate({ params: itemIdParamSchema, body: updatePlanItemSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await planService.updatePlanItemStatus({
      itemId: req.params.itemId,
      status: req.body.status,
    });
    res.json(result);
  })
);

module.exports = router;

