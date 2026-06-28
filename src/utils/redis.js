const Redis = require('ioredis');
const { config } = require('../config.js');
const logger = require('./logger.js');

let redis = null;

if (process.env.REDIS_HOST) {
  const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    db: config.redis.db,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    keepAlive: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 1000, 15000);
      logger.info(`Redis connection lost. Retrying in ${delay / 1000}s... (attempt ${times})`);
      return delay;
    },
  };

  if (config.redis.password) {
    redisOptions.password = config.redis.password;
  }

  redis = new Redis(redisOptions);

  redis.on('connect', () => {
    logger.info(`Redis connecting to ${config.redis.host}:${config.redis.port}...`);
  });

  redis.on('ready', () => {
    logger.info(`Redis connection established & ready.`);
  });

  redis.on('error', (err) => {
    logger.error(`Redis connection error: ${err.message}`);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed.');
  });

  // Attempt to connect
  redis.connect().catch((err) => {
    logger.error(`Redis initial connection failed: ${err.message}`);
  });

  // Heartbeat ping interval to prevent server-side idle timeout (ECONNRESET)
  setInterval(async () => {
    if (redis && redis.status === 'ready') {
      try {
        await redis.ping();
      } catch {
        // Ignored, the error handler or redis error listener will catch it
      }
    }
  }, 120000); // 2 minutes
} else {
  logger.warn('Redis host not configured in .env. Redis helper will not be active.');
}

module.exports = redis;
