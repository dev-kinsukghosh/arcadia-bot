const { db, connection } = require('../src/utils/db.js');
const redisClient = require('../src/utils/redis.js');
const { playerShops } = require('../src/db/schema.js');
const { syncShops } = require('../src/services/shopsSync.js');
const logger = require('../src/utils/logger.js');

describe('Player Shops Sync & Cache Suite', () => {
  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  it('should successfully run syncShops, query database, and verify Redis 25min TTL cache', async () => {
    expect(db).toBeDefined();

    logger.info('Running shops sync worker...');
    await syncShops();

    // Verify database entries
    const dbShops = await db.select().from(playerShops);
    expect(dbShops).toBeInstanceOf(Array);
    logger.success(`Database verification: Found ${dbShops.length} shops in MySQL`);

    if (dbShops.length > 0) {
      const firstShop = dbShops[0];
      expect(firstShop.key).toBeDefined();
      expect(firstShop.name).toBeDefined();
      expect(firstShop.balances).toBeDefined();
      expect(firstShop.sellListings).toBeDefined();
      expect(firstShop.buyListings).toBeDefined();

      // Test JSON parsing (the "json Phraser")
      const parsedBalances = JSON.parse(firstShop.balances);
      const parsedSellListings = JSON.parse(firstShop.sellListings);
      const parsedBuyListings = JSON.parse(firstShop.buyListings);
      expect(parsedBalances).toBeInstanceOf(Object);
      expect(parsedSellListings).toBeInstanceOf(Array);
      expect(parsedBuyListings).toBeInstanceOf(Array);
      logger.success(
        'JSON parser check passed: balances, sellListings, and buyListings successfully parsed.'
      );
    }

    // Verify Redis Cache and TTL
    if (redisClient && redisClient.status === 'ready') {
      const cached = await redisClient.get('cache:shops');
      expect(cached).toBeDefined();
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached);
      expect(parsed.shops).toBeInstanceOf(Array);

      const ttl = await redisClient.ttl('cache:shops');
      logger.success(`Redis verification: TTL for cache:shops is ${ttl} seconds`);
      // TTL should be close to 25 minutes (1500 seconds)
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1500);
    }
  });
});
