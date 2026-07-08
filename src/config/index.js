const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
