const logger = require('../utils/logger.js');

/**
 * Global Express error handler middleware (prevents webserver endpoints from crashing process)
 */
function errorHandler(err, req, res, _next) {
  logger.error(`[API Server Error] ${req.method} ${req.path}:`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
}

module.exports = {
  errorHandler,
};
