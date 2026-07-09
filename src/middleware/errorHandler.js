const logger = require('../config/logger');

const notFound = (req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  logger.error(err.message, { stack: err.stack });
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'Error');
  res.status(status).json({ error: message });
};

module.exports = { notFound, errorHandler };
