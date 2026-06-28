const logger = require('../utils/logger.js');
const redis = require('../utils/redis.js');
const { MessageFlags } = require('discord.js');

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
