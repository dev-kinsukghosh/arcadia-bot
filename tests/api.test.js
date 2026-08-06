const { arcadiaApi } = require('../src/utils/apiClient.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

describe('ArcadiaMC API Connection Suite', () => {
  it('should successfully fetch convoy shop trades and return a valid array of trades', async () => {
    const data = await arcadiaApi.getConvoy();
    expect(data).toBeDefined();
    expect(data.trades).toBeInstanceOf(Array);
    logger.success(
      `ArcadiaMC API Connection: ${pc.bold(
        pc.green('OK')
      )} (Found ${data.trades.length} active trade items)`
    );

    if (data.trades.length > 0) {
      const sample = data.trades[0];
      expect(sample.item).toBeDefined();
      expect(sample.buyPrice).toBeDefined();
      expect(sample.sellPrice).toBeDefined();
      expect(sample.rarity).toBeDefined();
      logger.success(
        `Sample Item Verified: ${pc.bold(
          sample.item
        )} | Buy: ₳${sample.buyPrice} | Sell: ₳${sample.sellPrice}`
      );
    }
  });
});
