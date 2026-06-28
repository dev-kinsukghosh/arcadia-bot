const { Client } = require('redis-om');
const redis = require('./redis.js');
const logger = require('./logger.js');

const redisOmClient = new Client();

let isOmReady = false;

/**
 * Initialize Redis-OM by wrapping the existing ioredis instance
 */
async function initRedisOm() {
  if (!redis) {
    logger.warn('Redis ioredis client is not active. Redis-OM helper will not initialize.');
    return;
  }

  try {
    await redisOmClient.use(redis);
    isOmReady = true;
    logger.info('Redis-OM client successfully initialized using existing ioredis connection.');
  } catch (error) {
    logger.error('Failed to initialize Redis-OM client wrapper:', error);
  }
}

// Trigger connection mapping
initRedisOm();

module.exports = {
  redisOmClient,
  getIsOmReady: () => isOmReady,
};
