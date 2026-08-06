const { db, connection } = require('../src/utils/db.js');
const { itemNotifications } = require('../src/db/schema.js');
const logger = require('../src/utils/logger.js');
const { eq, and } = require('drizzle-orm');

describe('Item Notifications Suite', () => {
  const testUserId = '123456789098765432';
  const testItem = 'DIAMOND';
  const testChannelId = '111222333444555666';

  beforeAll(async () => {
    // Clean up first
    await db
      .delete(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));
  });

  afterAll(async () => {
    // Final clean up and close connection
    await db
      .delete(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));
    if (connection) {
      await connection.end();
    }
  });

  it('should successfully create a stock notification subscription', async () => {
    await db.insert(itemNotifications).values({
      userId: testUserId,
      item: testItem,
      channelId: testChannelId,
    });
    logger.success('Notification subscription successfully created.');
  });

  it('should verify the subscription exists in the database', async () => {
    const records = await db
      .select()
      .from(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    expect(records.length).toBe(1);
    expect(records[0].channelId).toBe(testChannelId);
    logger.success('Notification subscription verified in database successfully.');
  });

  it('should successfully delete a stock notification subscription', async () => {
    await db
      .delete(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    const postRecords = await db
      .select()
      .from(itemNotifications)
      .where(and(eq(itemNotifications.userId, testUserId), eq(itemNotifications.item, testItem)));

    expect(postRecords.length).toBe(0);
    logger.success('Notification subscription deleted and verified successfully.');
  });
});
