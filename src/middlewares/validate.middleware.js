const ApiError = require('../utils/ApiError');

// Generic schema validator middleware using zod schemas.
const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    return next(new ApiError(400, 'Validation failed', details));
  }

  req.body = parsed.data.body;
  req.query = parsed.data.query;
  req.params = parsed.data.params;
  return next();
};

module.exports = validate;
