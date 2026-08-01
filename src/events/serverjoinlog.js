const logger = require('../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  name: 'guildCreate',
  execute(guild) {
    logger.info(
      pc.bold(
        pc.green(
          `[GUILD JOIN] Joined guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`
        )
      )
    );
  },
};
