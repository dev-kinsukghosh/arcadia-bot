const logger = require('../utils/logger.js');
const redis = require('../utils/redis.js');
const { MessageFlags } = require('discord.js');
const { isBlacklisted, getBlacklistReason } = require('../utils/blacklistHelper.js');
const { errorEmbed } = require('../utils/embedHelper.js');

const cooldowns = new Map();

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    // Check if the user is blacklisted
    if (isBlacklisted(interaction.user.id)) {
      if (interaction.isRepliable()) {
        try {
          const reason = getBlacklistReason(interaction.user.id);
          await interaction.reply({
            embeds: [
              errorEmbed(
                'Access Denied',
                `You are blacklisted from using this bot.\n\n**Reason:** ${reason}`
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        } catch {
          // Ignore
        }
      }
      return;
    }

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        try {
          await command.autocomplete(interaction);
        } catch {
          // Silently ignore autocomplete errors
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    // Parse developer IDs from environment configuration
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    const isDev = devIds.includes(interaction.user.id);

    // Enforce server-specific command options for custom commands (disabled by default, enabled by dev)
    const CC_COMMANDS = ['pemoji', 'al-nadd', 'al-nrm', 'al-setseat', 'al-seatcalc'];
    if (interaction.guildId && CC_COMMANDS.includes(command.data.name)) {
      const { isOptionEnabled } = require('../utils/guildOptionsHelper.js');
      if (!isOptionEnabled(interaction.guildId, command.data.name)) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              'Command Disabled',
              `The command \`/${command.data.name}\` is not enabled in this server.\n\n` +
                'Contact the bot developer to enable it.'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (!isDev) {
      const now = Date.now();
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }

      const timestamps = cooldowns.get(command.data.name);
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          return interaction.reply({
            content: `⚠️ Please wait **${timeLeft}s** before using the \`/${interaction.commandName}\` command again.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownAmount);
    }

    // Track statistics in Redis (non-blocking)
    if (redis && redis.status === 'ready') {
      redis.incr('stats:commands:total').catch(() => {});
      redis.hincrby('stats:commands:usage', interaction.commandName, 1).catch(() => {});
    }

    try {
      logger.info(`[COMMAND RUN] User ${interaction.user.tag} invoked /${interaction.commandName}`);
      await command.execute(interaction);
    } catch (error) {
      const { reportError } = require('../utils/errorHandler.js');
      await reportError(error, `Slash Command Execution (/${interaction.commandName})`);

      const errorMessage = {
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
