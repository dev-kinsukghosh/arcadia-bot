const { AuditLogEvent } = require('discord.js');
const logger = require('../utils/logger.js');
const { isBlacklisted, getBlacklistReason } = require('../utils/blacklistHelper.js');
const pc = require('picocolors');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    logger.info(
      pc.bold(
        pc.green(
          `[GUILD JOIN] Joined guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`
        )
      )
    );

    // Audit log check: determine who invited / added the bot
    try {
      const auditLogs = await guild
        .fetchAuditLogs({
          type: AuditLogEvent.BotAdd,
          limit: 1,
        })
        .catch(() => null);

      const entry = auditLogs?.entries?.first();
      const inviter = entry?.executor;

      if (inviter && isBlacklisted(inviter.id)) {
        const reason = getBlacklistReason(inviter.id);
        logger.error(
          pc.bold(
            pc.red(
              `⛔ [BLACKLIST BLOCKED] Blacklisted user ${inviter.tag} (${inviter.id}) invited bot to guild: ${guild.name} (${guild.id}). Reason: ${reason}`
            )
          )
        );

        // Automatically leave the guild because it was invited by a blacklisted user
        logger.warn(
          pc.yellow(
            `[AUTO LEAVE] Leaving guild ${guild.name} (${guild.id}) due to blacklisted inviter.`
          )
        );
        await guild.leave();
      }
    } catch (err) {
      logger.warn(`Guild join audit log inspection error: ${err.message}`);
    }
  },
};
