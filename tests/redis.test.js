const redis = require('../src/utils/redis.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

describe('Redis Database Checker Suite', () => {
  const TEST_PREFIX = 'test:checker:';
  const testKey = `${TEST_PREFIX}string`;
  const testHashKey = `${TEST_PREFIX}hash`;
  const testPackKey = `${TEST_PREFIX}pack`;

  afterAll(async () => {
    if (redis) {
      try {
        // Clean up any remaining test keys
        const keys = await redis.keys(`${TEST_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Ignore cleanup errors
      }
      redis.disconnect();
    }
  });

  it('should successfully connect and respond to PING with low latency', async () => {
    expect(redis).toBeDefined();
    if (!redis) {
      throw new Error('Redis client instance is not initialized');
    }

    const start = performance.now();
    const pingRes = await redis.ping();
    const latency = (performance.now() - start).toFixed(2);

    expect(pingRes).toBe('PONG');
    expect(Number(latency)).toBeLessThan(1000);

    logger.success(
      `Redis PING: ${pc.bold(pc.green(pingRes))} (Latency: ${pc.bold(pc.cyan(`${latency}ms`))})`
    );
  });

  it('should verify String read/write/TTL/delete lifecycle operations', async () => {
    const testValue = `arcadia_check_${Date.now()}`;

    // 1. SET with 30s TTL
    const setRes = await redis.set(testKey, testValue, 'EX', 30);
    expect(setRes).toBe('OK');

    // 2. GET
    const getRes = await redis.get(testKey);
    expect(getRes).toBe(testValue);

    // 3. TTL
    const ttlRes = await redis.ttl(testKey);
    expect(ttlRes).toBeGreaterThan(0);
    expect(ttlRes).toBeLessThanOrEqual(30);

    // 4. DEL
    const delRes = await redis.del(testKey);
    expect(delRes).toBe(1);

    // 5. Verify deleted
    const verifyRes = await redis.get(testKey);
    expect(verifyRes).toBeNull();

    logger.success(
      `Redis String Lifecycle: ${pc.bold(pc.green('PASSED'))} (Set, Get, TTL, Del verified)`
    );
  });

  it('should verify Hash read/write/delete operations', async () => {
    const field1 = 'status';
    const val1 = 'active';
    const field2 = 'counter';
    const val2 = '42';

    // 1. HSET
    await redis.hset(testHashKey, field1, val1, field2, val2);

    // 2. HGET
    const hgetRes = await redis.hget(testHashKey, field1);
    expect(hgetRes).toBe(val1);

    // 3. HGETALL
    const allRes = await redis.hgetall(testHashKey);
    expect(allRes[field1]).toBe(val1);
    expect(allRes[field2]).toBe(val2);

    // 4. HDEL
    const hdelRes = await redis.hdel(testHashKey, field1, field2);
    expect(hdelRes).toBe(2);

    // 5. Verify cleanup
    const emptyRes = await redis.hgetall(testHashKey);
    expect(Object.keys(emptyRes).length).toBe(0);

    logger.success(
      `Redis Hash Operations: ${pc.bold(pc.green('PASSED'))} (HSET, HGET, HGETALL, HDEL verified)`
    );
  });

  it('should verify MessagePack binary serialization helpers (packData / unpackData)', async () => {
    expect(typeof redis.packData).toBe('function');
    expect(typeof redis.unpackData).toBe('function');

    const complexPayload = {
      guildId: '123456789012345678',
      currency: 'cheese',
      balance: 1500000.75,
      flags: { pvp: true, mobs: false },
      items: ['GOLD_INGOT', 'DIAMOND', 'NETHERITE_SCRAP'],
    };

    const packed = redis.packData(complexPayload);
    expect(Buffer.isBuffer(packed)).toBe(true);

    // Write binary buffer to Redis
    await redis.set(testPackKey, packed, 'EX', 30);

    // Read binary buffer from Redis
    const fetched = await redis.getBuffer(testPackKey);
    expect(Buffer.isBuffer(fetched)).toBe(true);

    // Unpack and verify deep equality
    const unpacked = redis.unpackData(fetched);
    expect(unpacked).toEqual(complexPayload);

    // Clean up
    await redis.del(testPackKey);

    logger.success(
      `Redis MessagePack Serialization: ${pc.bold(
        pc.green('PASSED')
      )} (packData -> Redis Buffer -> unpackData verified)`
    );
  });
});
