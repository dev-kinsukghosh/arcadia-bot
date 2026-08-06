const { config } = require('../src/config.js');
const logger = require('../src/utils/logger.js');
const redis = require('../src/utils/redis.js');
const { db, connection } = require('../src/utils/db.js');
const pc = require('picocolors');

describe('Environment Connection Suite', () => {
  afterAll(async () => {
    // Close connections
    if (redis) {
      redis.disconnect();
    }
    if (connection) {
      await connection.end();
    }
  });

  it('should have a valid configuration object loaded', () => {
    expect(config.discord.token).toBeDefined();
    expect(config.db.host).toBeDefined();
    expect(config.redis.host).toBeDefined();
    logger.success('Bot configuration keys verified.');
  });

  it('should successfully ping the Redis cache', async () => {
    if (redis) {
      const pingRes = await redis.ping();
      expect(pingRes).toBe('PONG');
      logger.success(`Redis connection verified. Ping response: ${pc.bold(pc.green(pingRes))}`);
    } else {
      logger.warn('Redis client not configured, skipping.');
    }
  });

  it('should successfully query the MySQL database with Drizzle', async () => {
    if (db && connection) {
      const [rows] = await connection.execute('SELECT 1 + 1 AS result');
      const value = rows[0].result;
      expect(value).toBe(2);
      logger.success(`MySQL Drizzle connection verified. Result: ${pc.bold(pc.green(value))}`);
    } else {
      logger.error('Drizzle Database client is not active.');
      throw new Error('Database client not initialized');
    }
  });
});
