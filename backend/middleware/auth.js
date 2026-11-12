const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
};

function authenticateToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const verified = jwt.verify(token, config.jwtSecret);
    req.user = verified;
    return next();
  } catch (err) {
    res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
    return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }
    return next();
  };
}

module.exports = {
  COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  authenticateToken,
  requireRole,
};

