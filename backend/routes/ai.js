const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/aiService');
const {
  aiSuggestPlanSchema,
  aiOptimizeNotesSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken);

router.post(
  '/suggest-plan',
  requireRole(['admin', 'dentist']),
  validate({ body: aiSuggestPlanSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const suggestions = await aiService.suggestPlan(req.body.symptoms);
    res.json(suggestions);
  })
);

router.post(
  '/optimize-notes',
  requireRole(['admin', 'dentist', 'staff']),
  validate({ body: aiOptimizeNotesSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await aiService.optimizeNotes(req.body.notes);
    res.json(result);
  })
);

module.exports = router;

