const { ActivityType } = require('discord.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(
      pc.bold(pc.green(`[LOGIN SUCCESS] Logged in as ${client.user.tag} (${client.user.id})`))
    );

    // Set status/presence
    client.user.setPresence({
      activities: [{ name: 'Arcadia MC', type: ActivityType.Playing }],
      status: 'online',
    });

    logger.info('Bot status set to "Playing Arcadia MC"');
    logger.info(`Serving ${client.guilds.cache.size} servers:`);
    client.guilds.cache.forEach((guild) => {
      logger.info(` - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    });

    // Auto-upload missing item icons to application emojis asynchronously
    const { checkAndUploadEmojis } = require('../../scripts/upload-emojis.js');
    checkAndUploadEmojis(client).catch(() => {});

    // Pre-fetch application emojis to warm cache
    const { getAppEmojis } = require('../utils/emojiCache.js');
    getAppEmojis(client)
      .then(() => {
        logger.info('Application emojis cache warmed up successfully.');
      })
      .catch(() => {});

    // Initialize autocomplete suggestions cache for cis-info command
    const cisInfoCommand = client.commands.get('cis-info');
    if (cisInfoCommand && typeof cisInfoCommand.initCache === 'function') {
      cisInfoCommand.initCache();
    }

    // Sync guild-specific commands based on database toggles
    const { syncAllGuildsCommands } = require('../utils/guildOptionsHelper.js');
    syncAllGuildsCommands(client).catch((err) => {
      logger.error('Failed to sync guild-specific commands on startup:', err);
    });
  },
};
