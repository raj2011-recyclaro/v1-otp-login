const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('Unhandled error:', error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null
  });
};

module.exports = errorMiddleware;
