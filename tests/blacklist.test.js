const { db, connection } = require('../src/utils/db.js');
const { blacklist } = require('../src/db/schema.js');
const {
  loadBlacklist,
  isBlacklisted,
  getBlacklistReason,
  blacklistUser,
  unblacklistUser,
} = require('../src/utils/blacklistHelper.js');
const logger = require('../src/utils/logger.js');
const { eq } = require('drizzle-orm');

describe('Blacklist Functionality Suite', () => {
  const testUserId = '123456789098765432';
  const testDevId = '987654321012345678';
  const testReason = 'Integration Test Reason';

  beforeAll(async () => {
    // Clean up first just in case
    await db.delete(blacklist).where(eq(blacklist.userId, testUserId));
  });

  afterAll(async () => {
    // Final clean up and close connection
    await db.delete(blacklist).where(eq(blacklist.userId, testUserId));
    if (connection) {
      await connection.end();
    }
  });

  it('should verify initial state is not blacklisted', async () => {
    await loadBlacklist();
    expect(isBlacklisted(testUserId)).toBe(false);
  });

  it('should successfully blacklist a user', async () => {
    const added = await blacklistUser(testUserId, testReason, testDevId);
    expect(added).toBe(true);
    expect(isBlacklisted(testUserId)).toBe(true);
    expect(getBlacklistReason(testUserId)).toBe(testReason);
    logger.success('User successfully blacklisted and confirmed in cache');
  });

  it('should verify blacklist record persists in database', async () => {
    const dbRecord = await db.select().from(blacklist).where(eq(blacklist.userId, testUserId));
    expect(dbRecord.length).toBe(1);
    expect(dbRecord[0].reason).toBe(testReason);
    expect(dbRecord[0].blacklistedBy).toBe(testDevId);
    logger.success('Blacklist record verified in database successfully');
  });

  it('should successfully unblacklist a user', async () => {
    const removed = await unblacklistUser(testUserId);
    expect(removed).toBe(true);
    expect(isBlacklisted(testUserId)).toBe(false);
    logger.success('User successfully unblacklisted and confirmed in cache');
  });

  it('should verify blacklist record is removed from database', async () => {
    const dbRecordPost = await db.select().from(blacklist).where(eq(blacklist.userId, testUserId));
    expect(dbRecordPost.length).toBe(0);
    logger.success('Verified record deleted from database successfully');
  });
});
