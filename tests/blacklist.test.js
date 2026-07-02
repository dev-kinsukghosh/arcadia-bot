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
const pc = require('picocolors');
const { eq } = require('drizzle-orm');

async function testBlacklist() {
  logger.info(pc.bold(pc.cyan('=== BLACKLIST INTEGRATION TEST RUN ===')));

  const testUserId = '123456789098765432';
  const testDevId = '987654321012345678';
  const testReason = 'Integration Test Reason';

  try {
    // 1. Clean up first just in case
    logger.info(`Cleaning up prior test data for user ${testUserId}...`);
    await db.delete(blacklist).where(eq(blacklist.userId, testUserId));

    // 2. Load blacklist (should be empty for this user)
    logger.info('Loading blacklist cache...');
    await loadBlacklist();
    if (isBlacklisted(testUserId)) {
      throw new Error('Test user should not be blacklisted initially');
    }
    logger.success('Initial state: user is not blacklisted');

    // 3. Blacklist user
    logger.info(`Blacklisting user ${testUserId}...`);
    const added = await blacklistUser(testUserId, testReason, testDevId);
    if (!added) {
      throw new Error('Should have successfully blacklisted the user');
    }

    if (!isBlacklisted(testUserId)) {
      throw new Error('User should now be blacklisted in cache');
    }
    const cachedReason = getBlacklistReason(testUserId);
    if (cachedReason !== testReason) {
      throw new Error(`Expected reason ${testReason}, got ${cachedReason}`);
    }
    logger.success('User successfully blacklisted, and confirmed reason in cache');

    // 4. Verify in DB
    const dbRecord = await db.select().from(blacklist).where(eq(blacklist.userId, testUserId));
    if (
      dbRecord.length !== 1 ||
      dbRecord[0].reason !== testReason ||
      dbRecord[0].blacklistedBy !== testDevId
    ) {
      throw new Error('DB record does not match expected blacklist details');
    }
    logger.success('User verified in database successfully');

    // 5. Unblacklist user
    logger.info(`Unblacklisting user ${testUserId}...`);
    const removed = await unblacklistUser(testUserId);
    if (!removed) {
      throw new Error('Should have successfully unblacklisted the user');
    }

    if (isBlacklisted(testUserId)) {
      throw new Error('User should no longer be blacklisted in cache');
    }
    logger.success('User successfully unblacklisted and confirmed in cache');

    // 6. Verify deleted in DB
    const dbRecordPost = await db.select().from(blacklist).where(eq(blacklist.userId, testUserId));
    if (dbRecordPost.length !== 0) {
      throw new Error('User should have been removed from the database');
    }
    logger.success('User verified deleted from database successfully');
  } catch (err) {
    logger.error(`Blacklist integration test failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }

  // Close database connections
  logger.info('Closing database pool...');
  await connection.end();

  logger.info(pc.bold(pc.cyan('=== BLACKLIST INTEGRATION TEST COMPLETE ===')));
}

testBlacklist()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.critical('Unexpected Blacklist testing error occurred:', err);
    process.exit(1);
  });
