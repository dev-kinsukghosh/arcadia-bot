const { db, connection } = require('../src/utils/db.js');
const redisClient = require('../src/utils/redis.js');
const { playerHeads } = require('../src/db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../src/utils/logger.js');
const { getHeadBuffer, updateAllHeadsBatch } = require('../src/services/headManager.js');

describe('Player Heads Manager Suite', () => {
  const testUser = 'webdevkin';
  const redisKey = `cache:head:username:${testUser.toLowerCase()}`;
  let initialBuffer;

  beforeAll(async () => {
    // Clean up test records
    await db.delete(playerHeads).where(eq(playerHeads.username, testUser));
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(redisKey);
    }
  });

  afterAll(async () => {
    // Final clean up and close connection
    await db.delete(playerHeads).where(eq(playerHeads.username, testUser));
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(redisKey);
      await redisClient.quit();
    }
    if (connection) {
      await connection.end();
    }
  });

  it('should successfully download, cache, and return player head buffer', async () => {
    const buffer = await getHeadBuffer(testUser);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
    initialBuffer = buffer;
    logger.success(`Player head downloaded successfully. Buffer size: ${buffer.length} bytes.`);
  });

  it('should verify player head is saved to MySQL database', async () => {
    const dbRecords = await db.select().from(playerHeads).where(eq(playerHeads.username, testUser));
    expect(dbRecords.length).toBe(1);
    expect(dbRecords[0].uuid).toBeDefined();
    logger.success(`Player head verified in MySQL with UUID: ${dbRecords[0].uuid}`);
  });

  it('should verify player head is cached in Redis', async () => {
    if (redisClient && redisClient.status === 'ready') {
      const cached = await redisClient.getBuffer(redisKey);
      expect(cached).toBeDefined();
      expect(Buffer.compare(cached, initialBuffer)).toBe(0);
      logger.success('Player head verified cached in Redis correctly.');
    } else {
      logger.warn('Redis not active, skipping verification.');
    }
  });

  it('should fetch cached head extremely quickly from Redis', async () => {
    const start = Date.now();
    const bufferCached = await getHeadBuffer(testUser);
    const timeTaken = Date.now() - start;

    expect(Buffer.compare(bufferCached, initialBuffer)).toBe(0);
    expect(timeTaken).toBeLessThan(500);
    logger.success(`Cached head fetch verified. Took: ${timeTaken}ms`);
  });

  it('should successfully trigger the concurrent player heads background update job', async () => {
    await updateAllHeadsBatch();
    logger.success('Background player heads updates batch job executed successfully.');
  });
});
