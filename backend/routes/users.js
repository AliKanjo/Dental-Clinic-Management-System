const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const userService = require('../services/userService');
const {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticateToken, requireRole(['admin']));

router.get(
  '/',
  validate({ query: emptySchema }),
  asyncHandler(async (req, res) => {
    const users = await userService.listUsers();
    res.json(users);
  })
);

router.post(
  '/',
  validate({ body: createUserSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await userService.updateUser(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  validate({ params: idParamSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.user.id, req.params.id);
    res.json(result);
  })
);

module.exports = router;

