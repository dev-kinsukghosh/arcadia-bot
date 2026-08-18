const { db, connection } = require('../src/utils/db.js');
const { guildOptions } = require('../src/db/schema.js');
const {
  loadGuildOptions,
  isOptionEnabled,
  enableOption,
  disableOption,
  getEnabledOptions,
} = require('../src/utils/guildOptionsHelper.js');
const { eq, and } = require('drizzle-orm');
const logger = require('../src/utils/logger.js');

describe('Guild Options/Toggles Functionality Suite', () => {
  const testGuildId = '999999999999999999';
  const testOptionId = 'pemoji';

  beforeAll(async () => {
    // Clean up first
    if (db) {
      await db
        .delete(guildOptions)
        .where(and(eq(guildOptions.guildId, testGuildId), eq(guildOptions.optionId, testOptionId)));
    }
  });

  afterAll(async () => {
    // Clean up and close connection
    if (db) {
      await db
        .delete(guildOptions)
        .where(and(eq(guildOptions.guildId, testGuildId), eq(guildOptions.optionId, testOptionId)));
    }
    if (connection) {
      await connection.end();
    }
  });

  it('should verify initial state is disabled', async () => {
    await loadGuildOptions();
    expect(isOptionEnabled(testGuildId, testOptionId)).toBe(false);
  });

  it('should successfully enable an option', async () => {
    const success = await enableOption(testGuildId, testOptionId);
    expect(success).toBe(true);
    expect(isOptionEnabled(testGuildId, testOptionId)).toBe(true);
    logger.success('Option successfully enabled and confirmed in cache');
  });

  it('should verify option record persists in database', async () => {
    if (db) {
      const dbRecords = await db
        .select()
        .from(guildOptions)
        .where(and(eq(guildOptions.guildId, testGuildId), eq(guildOptions.optionId, testOptionId)));
      expect(dbRecords.length).toBe(1);
      expect(dbRecords[0].optionId).toBe(testOptionId);
      logger.success('Option record verified in database successfully');
    }
  });

  it('should return option in getEnabledOptions list', () => {
    const enabled = getEnabledOptions(testGuildId);
    expect(enabled).toContain(testOptionId);
  });

  it('should successfully disable an option', async () => {
    const success = await disableOption(testGuildId, testOptionId);
    expect(success).toBe(true);
    expect(isOptionEnabled(testGuildId, testOptionId)).toBe(false);
    logger.success('Option successfully disabled and confirmed in cache');
  });

  it('should verify option record is removed from database', async () => {
    if (db) {
      const dbRecords = await db
        .select()
        .from(guildOptions)
        .where(and(eq(guildOptions.guildId, testGuildId), eq(guildOptions.optionId, testOptionId)));
      expect(dbRecords.length).toBe(0);
      logger.success('Verified record deleted from database successfully');
    }
  });
});
