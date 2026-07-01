const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

dotenv.config();

const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');

/**
 * Scan local icons and upload any that are missing from Discord Application Emojis
 * @param {Client} client - The active Discord client
 */
async function checkAndUploadEmojis(client) {
  if (!fs.existsSync(ICONS_DIR)) {
    logger.error(`Icons directory not found at ${ICONS_DIR}`);
    return;
  }

  logger.info('Fetching existing application emojis...');
  try {
    const existingEmojis = await client.application.emojis.fetch();
    logger.info(`Found ${pc.bold(existingEmojis.size)} existing application emojis.`);

    // Read local icons
    const files = fs.readdirSync(ICONS_DIR).filter((f) => f.endsWith('.png'));
    const pendingUploads = [];

    for (const file of files) {
      const emojiName = path.basename(file, '.png').toUpperCase().substring(0, 32);

      // Emoji naming rule check
      if (emojiName.length < 2 || !/^[A-Z0-9_]+$/.test(emojiName)) {
        logger.warn(`Skipping ${file}: Name "${emojiName}" does not meet Discord naming rules.`);
        continue;
      }

      // Check if already uploaded
      const exists = existingEmojis.some((e) => e.name === emojiName);
      if (!exists) {
        pendingUploads.push({
          name: emojiName,
          filePath: path.join(ICONS_DIR, file),
        });
      }
    }

    if (pendingUploads.length === 0) {
      logger.success('All local icons are already uploaded to application emojis!');
      return;
    }

    logger.info(`Starting upload of ${pc.bold(pendingUploads.length)} new emojis...`);
    logger.info('Using a 3-second delay between uploads to respect Discord rate limits.');

    for (let i = 0; i < pendingUploads.length; i++) {
      const emoji = pendingUploads[i];
      try {
        const stats = fs.statSync(emoji.filePath);
        if (stats.size > 256 * 1024) {
          logger.warn(
            `Skipping ${emoji.name}: File size is ${Math.round(stats.size / 1024)}KB (Max 256KB).`
          );
          continue;
        }

        logger.info(`[${i + 1}/${pendingUploads.length}] Uploading ${pc.bold(emoji.name)}...`);
        const createdEmoji = await client.application.emojis.create({
          attachment: emoji.filePath,
          name: emoji.name,
        });
        logger.success(
          `Successfully uploaded custom emoji: ${createdEmoji.name} (<:${createdEmoji.name}:${createdEmoji.id}>)`
        );
      } catch (uploadError) {
        logger.error(`Failed to upload ${emoji.name}:`, uploadError);
      }

      // 3 seconds delay
      if (i < pendingUploads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    logger.success('Emoji upload process completed successfully.');
  } catch (error) {
    logger.error('An error occurred during the emoji upload process:', error);
  }
}

module.exports = { checkAndUploadEmojis };

// If run directly from the command line
if (require.main === module) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.error('No DISCORD_BOT_TOKEN found in environment!');
    process.exit(1);
  }

  const cliClient = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  cliClient.once('ready', async () => {
    logger.success(`Logged in as ${pc.bold(cliClient.user.tag)}`);
    await checkAndUploadEmojis(cliClient);
    cliClient.destroy();
    process.exit(0);
  });

  cliClient.login(token).catch((err) => {
    logger.error('Failed to login to Discord:', err);
    process.exit(1);
  });
}
