const logger = require('../utils/logger.js');
const redis = require('../utils/redis.js');
const { MessageFlags } = require('discord.js');

const cooldowns = new Map();

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
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

    // Cooldown check system to prevent Discord/API rate limits
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

    // Track statistics in Redis
    if (redis && redis.status === 'ready') {
      try {
        await redis.incr('stats:commands:total');
        await redis.hincrby('stats:commands:usage', interaction.commandName, 1);
      } catch {
        // Ignore stats tracking errors
      }
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
