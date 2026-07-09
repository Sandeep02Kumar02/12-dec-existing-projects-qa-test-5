const config = require('./src/config');
const logger = require('./src/config/logger');
const app = require('./src/app');

const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

module.exports = server;
