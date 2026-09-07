const {
  loadDevConfig,
  getDevConfig,
  setDevConfig,
  getSuggestChannel,
  getFeedbackChannel,
  getSyslogsChannel,
} = require('../src/utils/devConfigHelper.js');
const { db, connection } = require('../src/utils/db.js');
const { webyCustom } = require('../src/db/schema.js');

describe('Developer Configuration Helper Suite', () => {
  const testChannelId = '112233445566778899';
  const testSyslogsId = '998877665544332211';

  afterAll(async () => {
    // Clean up test keys from database
    const { inArray } = require('drizzle-orm');
    if (db) {
      await db
        .delete(webyCustom)
        .where(
          inArray(webyCustom.value, [
            testChannelId,
            testSyslogsId,
            '112233445566778899',
            '887766554433221100',
          ])
        )
        .catch(() => {});
      await loadDevConfig().catch(() => {});
    }
    if (connection) {
      await connection.end().catch(() => {});
    }
  });

  it('should load developer configuration without errors', async () => {
    await expect(loadDevConfig()).resolves.not.toThrow();
  });

  it('should set and get a developer config key', async () => {
    const success = await setDevConfig('test_feature', 'channel_id', testChannelId);
    expect(success).toBe(true);

    const retrieved = getDevConfig('test_feature', 'channel_id');
    expect(retrieved).toBe(testChannelId);
  });

  it('should resolve suggest channel using aliases (suggestions -> suggest_channel)', async () => {
    await setDevConfig('suggestions', 'channel_id', testChannelId);
    const resolvedChannel = getSuggestChannel();
    expect(resolvedChannel).toBe(testChannelId);
  });

  it('should resolve feedback channel using aliases (feedback -> feedback_channel)', async () => {
    await setDevConfig('feedback', 'channel_id', testChannelId);
    const resolvedChannel = getFeedbackChannel();
    expect(resolvedChannel).toBe(testChannelId);
  });

  it('should resolve syslogs channel using aliases (syslogs -> syslogs_channel)', async () => {
    await setDevConfig('syslogs', 'channel_id', testSyslogsId);
    const resolvedChannel = getSyslogsChannel();
    expect(resolvedChannel).toBe(testSyslogsId);
  });

  it('should return default value when feature key does not exist', () => {
    const nonExistent = getDevConfig('non_existent_feature_123', 'value', 'default_val');
    expect(nonExistent).toBe('default_val');
  });
});
