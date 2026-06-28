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
  },
};
