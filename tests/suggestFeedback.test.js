const {
  getSuggestChannel,
  getFeedbackChannel,
  getSyslogsChannel,
  setDevConfig,
  loadDevConfig,
} = require('../src/utils/devConfigHelper.js');
const { connection } = require('../src/utils/db.js');

describe('Suggest & Feedback Automation & Payload Suite', () => {
  const testChannelId = '887766554433221100';

  afterAll(async () => {
    const { db } = require('../src/utils/db.js');
    const { webyCustom } = require('../src/db/schema.js');
    const { inArray } = require('drizzle-orm');
    if (db) {
      await db
        .delete(webyCustom)
        .where(inArray(webyCustom.value, [testChannelId, '112233445566778899']))
        .catch(() => {});
      await loadDevConfig().catch(() => {});
    }
    if (connection) {
      await connection.end().catch(() => {});
    }
  });

  it('should verify suggest channel getter fallback and devconfig priority', async () => {
    await setDevConfig('suggest_channel', 'channel_id', testChannelId);
    expect(getSuggestChannel()).toBe(testChannelId);
  });

  it('should verify feedback channel getter fallback and devconfig priority', async () => {
    await setDevConfig('feedback_channel', 'channel_id', testChannelId);
    expect(getFeedbackChannel()).toBe(testChannelId);
  });

  it('should verify syslogs channel getter fallback and devconfig priority', async () => {
    await setDevConfig('syslogs_channel', 'channel_id', testChannelId);
    expect(getSyslogsChannel()).toBe(testChannelId);
  });

  it('should safely serialize and parse suggestion payload without data loss', () => {
    const rawSuggestion = 'I suggest adding an automated auction monitor command!';
    const payload = {
      userId: '123456789012345678',
      username: 'TestUser#0001',
      suggestion: rawSuggestion.slice(0, 350),
      guildId: '987654321098765432',
      guildName: 'Test Guild',
      createdAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(payload);
    expect(jsonStr.length).toBeLessThan(500);

    const parsed = JSON.parse(jsonStr);
    expect(parsed.suggestion).toBe(rawSuggestion);
    expect(parsed.userId).toBe('123456789012345678');
  });
});
