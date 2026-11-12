const { ZodError } = require('zod');

function formatZodError(err) {
  if (!(err instanceof ZodError)) return 'Invalid input.';
  const first = err.issues && err.issues[0];
  if (!first) return 'Invalid input.';
  const path = first.path && first.path.length ? `${first.path.join('.')}: ` : '';
  return `${path}${first.message}`;
}

function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (params) {
        req.params = params.parse(req.params);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (body) {
        req.body = body.parse(req.body ?? {});
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: formatZodError(err),
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      return next(err);
    }
  };
}

module.exports = validate;

