const logger = require('../config/logger');

const notFound = (req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(err.message, { stack: err.stack });
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};

module.exports = { notFound, errorHandler };
