const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const logger = require('./config/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
morgan.token('url', (req) => {
  const original = req.originalUrl || req.url || '';
  const queryIndex = original.indexOf('?');
  return queryIndex === -1 ? original : original.slice(0, queryIndex);
});
app.use(morgan('combined', { stream: logger.stream }));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
