const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { arcadiaApi } = require('../src/utils/apiClient.js');
const { downloadItemIcon } = require('../src/utils/iconDownloader.js');
const { checkAndUploadEmojis } = require('./upload-emojis.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

dotenv.config();

const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.error('No DISCORD_BOT_TOKEN found in environment!');
    process.exit(1);
  }

  logger.info('Fetching shops database to identify active trade items...');
  let shopsData;
  try {
    shopsData = await arcadiaApi.getShops();
  } catch (err) {
    logger.error('Failed to fetch shops database:', err);
    process.exit(1);
  }

  const shopsList = Array.isArray(shopsData.shops) ? shopsData.shops : [];
  const activeItems = new Set();

  for (const shop of shopsList) {
    if (Array.isArray(shop.sellListings)) {
      shop.sellListings.forEach((l) => {
        if (l.item) activeItems.add(l.item.toUpperCase());
      });
    }
    if (Array.isArray(shop.buyListings)) {
      shop.buyListings.forEach((l) => {
        if (l.item) activeItems.add(l.item.toUpperCase());
      });
    }
  }

  const itemNames = Array.from(activeItems);
  logger.info(`Found ${pc.bold(itemNames.length)} unique active items in player shops.`);

  // Find missing icons
  const missingItems = itemNames.filter((itemName) => {
    const iconPath = path.join(ICONS_DIR, `${itemName}.png`);
    return !fs.existsSync(iconPath);
  });

  if (missingItems.length === 0) {
    logger.success('All active player shop items already have local PNG icons!');
  } else {
    logger.info(`Found ${pc.bold(missingItems.length)} missing item icons. Downloading...`);
    for (let i = 0; i < missingItems.length; i++) {
      const itemName = missingItems[i];
      logger.info(`[${i + 1}/${missingItems.length}] Processing ${pc.bold(itemName)}...`);
      try {
        await downloadItemIcon(itemName);
      } catch (err) {
        logger.error(`Error downloading icon for ${itemName}:`, err);
      }
      // Spacing delay of 2 seconds between downloads to respect rate-limits
      if (i < missingItems.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    logger.success('Icon downloading process finished.');
  }

  // Now, log in to Discord to upload emojis
  logger.info('Logging in to Discord client to synchronize custom application emojis...');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    logger.success(`Logged in as ${pc.bold(client.user.tag)}`);
    try {
      await checkAndUploadEmojis(client);
    } catch (emojiErr) {
      logger.error('Failed to run Discord Application Emoji upload check:', emojiErr);
    }
    client.destroy();
    logger.success('Discord emoji uploader closed.');
    process.exit(0);
  });

  client.login(token).catch((err) => {
    logger.error('Failed to login to Discord:', err);
    process.exit(1);
  });
}

main();
