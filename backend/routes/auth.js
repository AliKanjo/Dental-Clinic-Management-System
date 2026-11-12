const express = require('express');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { COOKIE_OPTIONS, CLEAR_COOKIE_OPTIONS } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  emptySchema,
} = require('../validators/schemas');

const router = express.Router();

router.post(
  '/register',
  validate({ body: registerSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  validate({ body: loginSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const { token, user } = await authService.login(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json(user);
  })
);

router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body);
    res.json(result);
  })
);

router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema, query: emptySchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  })
);

router.post(
  '/logout',
  validate({ query: emptySchema }),
  (req, res) => {
    res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully.' });
  }
);

router.get(
  '/me',
  validate({ query: emptySchema }),
  (req, res) => {
    const token = req.cookies && req.cookies.token;
    if (!token) {
      return res.status(401).json({ loggedIn: false });
    }

    try {
      const verified = jwt.verify(token, config.jwtSecret);
      return res.json({ loggedIn: true, user: verified });
    } catch {
      res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
      return res.status(401).json({ loggedIn: false });
    }
  }
);

module.exports = router;

