const { arcadiaApi } = require('../src/utils/apiClient.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

async function testApi() {
  logger.info(pc.bold(pc.cyan('=== API CONNECTION TEST RUN ===')));

  try {
    logger.info('Fetching convoy shop trades from ArcadiaMC API...');
    const data = await arcadiaApi.getConvoy();

    if (data && Array.isArray(data.trades)) {
      logger.success(
        `ArcadiaMC API Connection: ${pc.bold(pc.green('OK'))} (Found ${data.trades.length} active trade items)`
      );

      // Print first item as sample
      if (data.trades.length > 0) {
        const sample = data.trades[0];
        logger.info(
          `Sample Item: ${pc.bold(sample.item)} | Buy: ₳${sample.buyPrice} | Sell: ₳${sample.sellPrice} | Rarity: ${sample.rarity}`
        );
      }
    } else {
      logger.error(
        'ArcadiaMC API response received, but format is invalid (missing trades array).'
      );
    }
  } catch (err) {
    logger.error(`ArcadiaMC API connection failed: ${err.message}`);
  }

  logger.info(pc.bold(pc.cyan('=== API TEST COMPLETE ===')));
}

testApi()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.critical('Unexpected API testing error occurred:', err);
    process.exit(1);
  });
