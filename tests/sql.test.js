const { db, connection } = require('../src/utils/db.js');
const { internal } = require('../src/db/schema.js');
const { eq } = require('drizzle-orm');
const { config } = require('../src/config.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

describe('SQL Database Checker Suite', () => {
  const TEST_KEY = 'test_checker_sql';

  afterAll(async () => {
    if (connection) {
      try {
        if (db) {
          await db.delete(internal).where(eq(internal.id, TEST_KEY));
        }
      } catch {
        // Ignore cleanup error if DB is unreachable
      }
      await connection.end();
    }
  });

  it('should verify MySQL connection pool initialization', () => {
    expect(config.db.host).toBeDefined();
    expect(config.db.name).toBeDefined();
    expect(config.db.user).toBeDefined();
    expect(connection).toBeDefined();

    logger.success(
      `MySQL Pool Config: Host: ${pc.bold(config.db.host)} | Port: ${pc.bold(
        String(config.db.port)
      )} | DB: ${pc.bold(config.db.name)}`
    );
  });

  it('should successfully execute a ping query (SELECT 1 + 1) with low latency', async () => {
    if (!connection) {
      throw new Error('MySQL connection pool was not created');
    }

    const start = performance.now();
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    const latency = (performance.now() - start).toFixed(2);

    expect(rows).toBeInstanceOf(Array);
    expect(rows[0].result).toBe(2);

    logger.success(
      `MySQL Ping: ${pc.bold(pc.green('OK'))} (Result: 2, Latency: ${pc.bold(
        pc.cyan(`${latency}ms`)
      )})`
    );
  });

  it('should query server metadata (version, current database, server time)', async () => {
    const [rows] = await connection.execute(
      'SELECT VERSION() AS version, DATABASE() AS current_db, CURRENT_TIMESTAMP() AS server_time'
    );

    expect(rows).toBeInstanceOf(Array);
    const meta = rows[0];
    expect(meta.version).toBeDefined();
    expect(meta.current_db).toBe(config.db.name);

    logger.success(
      `MySQL Server Info: Version: ${pc.bold(meta.version)} | Database: ${pc.bold(
        meta.current_db
      )} | Time: ${meta.server_time}`
    );
  });

  it('should verify Drizzle ORM CRUD lifecycle operations on internal table', async () => {
    expect(db).toBeDefined();

    const testValue = `verified_at_${Date.now()}`;

    // 1. Insert / Upsert test record
    await db
      .insert(internal)
      .values({ id: TEST_KEY, value: testValue })
      .onDuplicateKeyUpdate({ set: { value: testValue } });

    // 2. Read record
    const [record] = await db.select().from(internal).where(eq(internal.id, TEST_KEY));
    expect(record).toBeDefined();
    expect(record.value).toBe(testValue);

    // 3. Update record
    const updatedValue = `updated_${Date.now()}`;
    await db.update(internal).set({ value: updatedValue }).where(eq(internal.id, TEST_KEY));

    const [updatedRecord] = await db.select().from(internal).where(eq(internal.id, TEST_KEY));
    expect(updatedRecord.value).toBe(updatedValue);

    // 4. Delete test record
    await db.delete(internal).where(eq(internal.id, TEST_KEY));

    const verifyDeleted = await db.select().from(internal).where(eq(internal.id, TEST_KEY));
    expect(verifyDeleted.length).toBe(0);

    logger.success(
      `Drizzle ORM CRUD Operations: ${pc.bold(
        pc.green('PASSED')
      )} (Insert, Read, Update, Delete on 'internal' table verified)`
    );
  });
});
