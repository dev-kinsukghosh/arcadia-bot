const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const { cleanEnv, str, num } = require('envalid');
const logger = require('./utils/logger.js');

// Load & Expand environmental variables
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Validate critical environment keys using envalid
let validatedEnv = process.env;
try {
  validatedEnv = cleanEnv(
    process.env,
    {
      DISCORD_BOT_TOKEN: str({ default: '' }),
      DB_IP: str({ default: '127.0.0.1' }),
      DB_PORT: num({ default: 3306 }),
      DB_NAME: str({ default: '' }),
      DB_USER: str({ default: '' }),
      DB_PASSWORD: str({ default: '' }),
      REDIS_HOST: str({ default: '127.0.0.1' }),
      REDIS_PORT: num({ default: 6379 }),
      API_BASE_URL: str({ default: 'https://api.arcadiamc.net' }),
      PORT: num({ default: 3000 }),
    },
    {
      reporter: ({ errors }) => {
        if (Object.keys(errors).length > 0) {
          logger.warn(`Envalid environment warnings: ${Object.keys(errors).join(', ')}`);
        }
      },
    }
  );
} catch (err) {
  logger.warn(`Environment validation notice: ${err.message}`);
}

const config = {
  discord: {
    token: validatedEnv.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN,
  },
  db: {
    host: validatedEnv.DB_IP || process.env.DB_IP || '127.0.0.1',
    port: parseInt(validatedEnv.DB_PORT || process.env.DB_PORT || '3306', 10),
    name: validatedEnv.DB_NAME || process.env.DB_NAME,
    user: validatedEnv.DB_USER || process.env.DB_USER,
    password: validatedEnv.DB_PASSWORD || process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '30', 10),
  },
  redis: {
    host: validatedEnv.REDIS_HOST || process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(validatedEnv.REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  api: {
    baseUrl: validatedEnv.API_BASE_URL || process.env.API_BASE_URL || 'https://api.arcadiamc.net',
  },
  prefix: process.env.BOT_PREFIX || 'a!',
  logLevel: process.env.LOG_LEVEL || 'DEBUG',
  web: {
    port: parseInt(validatedEnv.PORT || process.env.PORT || '3000', 10),
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
