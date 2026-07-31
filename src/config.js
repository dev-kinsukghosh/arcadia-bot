const dotenv = require('dotenv');
const logger = require('./utils/logger.js');

// Load environmental variables
dotenv.config();

const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
  },
  db: {
    host: process.env.DB_IP || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.arcadiamc.net',
  },
  prefix: process.env.BOT_PREFIX || 'a!',
  logLevel: process.env.LOG_LEVEL || 'DEBUG',
  web: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
};

// Validate critical variables
const missingKeys = [];
if (!config.discord.token) {
  missingKeys.push('DISCORD_BOT_TOKEN');
}

if (missingKeys.length > 0) {
  logger.error(`Critical configuration keys missing in environment: ${missingKeys.join(', ')}`);
  logger.warn('Please fill in the values in your .env file.');
}

const isConfigured = missingKeys.length === 0;

module.exports = {
  config,
  isConfigured,
};
