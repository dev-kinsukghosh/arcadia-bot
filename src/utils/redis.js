const Redis = require('ioredis');
const { config } = require('../config.js');
const logger = require('./logger.js');
const { pack, unpack } = require('msgpackr');

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
        // Ignored
      }
    }
  }, 120000); // 2 minutes
} else {
  logger.warn('Redis host not configured in .env. Redis helper will not be active.');
}

/**
 * High-performance MessagePack serialization helpers
 */
function packData(data) {
  try {
    return pack(data);
  } catch {
    return Buffer.from(JSON.stringify(data));
  }
}

function unpackData(bufferOrString) {
  try {
    if (Buffer.isBuffer(bufferOrString)) {
      return unpack(bufferOrString);
    }
    return JSON.parse(bufferOrString);
  } catch {
    return null;
  }
}

if (redis) {
  redis.packData = packData;
  redis.unpackData = unpackData;
}

module.exports = redis;
