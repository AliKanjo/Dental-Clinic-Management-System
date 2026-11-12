const { config } = require('../config/env');

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  if (!origin) {
    return next();
  }

  const isAllowed = config.corsOrigins.includes(origin);
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return res.status(403).json({ error: 'Origin not allowed by CORS policy.' });
    }
    return res.sendStatus(204);
  }

  next();
}

module.exports = corsMiddleware;

