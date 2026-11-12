const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const followupService = require('../services/followupService');
const {
  idParamSchema,
  createFollowupSchema,
  updateFollowupSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken, requireRole(['admin', 'staff']));

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const followups = await followupService.listFollowups();
    res.json(followups);
  })
);

router.post(
  '/',
  validate({ body: createFollowupSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await followupService.createFollowup({
      userId: req.user.id,
      ...req.body,
    });
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateFollowupSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await followupService.updateFollowup(req.params.id, req.body);
    res.json(result);
  })
);

module.exports = router;

