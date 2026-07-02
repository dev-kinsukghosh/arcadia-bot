const { db, connection } = require('../src/utils/db.js');
const { itemNotifications } = require('../src/db/schema.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');
const { eq, and } = require('drizzle-orm');

async function testNotifications() {
  logger.info(pc.bold(pc.cyan('=== ITEM NOTIFICATIONS INTEGRATION TEST RUN ===')));

  const testUserId = '123456789098765432';
  const testItem = 'DIAMOND';
  const testChannelId = '111222333444555666';

  try {
    // 1. Clean up first
    logger.info(`Cleaning up prior test data for user ${testUserId} and item ${testItem}...`);
    await db
      .delete(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    // 2. Insert notification
    logger.info(`Creating test notification subscription for ${testItem}...`);
    await db.insert(itemNotifications).values({
      userId: testUserId,
      item: testItem,
      channelId: testChannelId,
    });
    logger.success('Notification subscription successfully created.');

    // 3. Verify it exists
    const records = await db
      .select()
      .from(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    if (records.length !== 1 || records[0].channelId !== testChannelId) {
      throw new Error('Database record does not match expected subscription details');
    }
    logger.success('Notification subscription verified in database successfully.');

    // 4. Clean up / delete
    logger.info('Deleting test notification subscription...');
    await db
      .delete(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    const postRecords = await db
      .select()
      .from(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    if (postRecords.length !== 0) {
      throw new Error('Notification subscription was not successfully deleted');
    }
    logger.success('Notification subscription deleted and verified successfully.');
  } catch (err) {
    logger.error(`Notification integration test failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }

  // Close database connection
  logger.info('Closing database pool...');
  await connection.end();

  logger.info(pc.bold(pc.cyan('=== ITEM NOTIFICATIONS INTEGRATION TEST COMPLETE ===')));
}

testNotifications()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.critical('Unexpected Notification testing error occurred:', err);
    process.exit(1);
  });
