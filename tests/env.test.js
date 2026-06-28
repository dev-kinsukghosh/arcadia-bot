const { config } = require('../src/config.js');
const logger = require('../src/utils/logger.js');
const redis = require('../src/utils/redis.js');
const { db, connection } = require('../src/utils/db.js');
const pc = require('picocolors');

async function testEnv() {
  logger.info(pc.bold(pc.cyan('=== ENVIRONMENT TEST RUN ===')));

  // 1. Config Check
  logger.info(
    `Discord Bot Token: ${config.discord.token ? pc.green('OK (Configured)') : pc.red('MISSING')}`
  );
  logger.info(`DB Host: ${config.db.host}:${config.db.port} (${config.db.name})`);
  logger.info(`Redis Host: ${config.redis.host}:${config.redis.port}`);

  // 2. Redis Connection Check
  if (redis) {
    try {
      logger.info('Pinging Redis...');
      const pingRes = await redis.ping();
      logger.success(`Redis Ping Response: ${pc.bold(pc.green(pingRes))}`);
    } catch (err) {
      logger.error(`Redis connection failed: ${err.message}`);
    }
  } else {
    logger.warn('Redis client is not initialized due to missing host configuration.');
  }

  // 3. MySQL/Drizzle Connection Check
  if (db && connection) {
    try {
      logger.info('Querying MySQL with Drizzle...');
      const [rows] = await connection.execute('SELECT 1 + 1 AS result');
      const value = rows[0].result;
      logger.success(`MySQL Drizzle Query Response (SELECT 1 + 1): ${pc.bold(pc.green(value))}`);
    } catch (err) {
      logger.error(`MySQL connection failed: ${err.message}`);
    }
  } else {
    logger.warn('Drizzle Database client is not active.');
  }

  // Close connections
  logger.info('Closing connections...');
  if (redis) {
    redis.disconnect();
  }
  if (connection) {
    await connection.end();
  }

  logger.info(pc.bold(pc.cyan('=== TEST COMPLETE ===')));
}

testEnv()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.critical('Unexpected testing error occurred:', err);
    process.exit(1);
  });
