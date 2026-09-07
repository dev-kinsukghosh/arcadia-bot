const logger = require('./logger.js');
const pc = require('picocolors');

let discordClient = null;

/**
 * Initialize the global error handling system
 * @param {Client} client - The Discord Client instance
 */
function initErrorHandler(client) {
  discordClient = client;

  // Intercept uncaught rejections and exceptions to prevent crashing
  process.on('unhandledRejection', (reason) => {
    reportError(reason, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error) => {
    reportError(error, 'Uncaught Exception');
  });

  logger.info('Global error handler initialized. Bot will intercept crashes.');
}

/**
 * Log and report an error to console, local logs, and a Discord channel if configured
 * @param {Error|any} error - The error object or message
 * @param {string} context - The context in which the error occurred
 */
async function reportError(error, context = 'System Error') {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : 'No stack trace available';

  // 1. Log error locally using Winston/Picocolors
  logger.critical(`[${context}] ${errorMessage}`);
  if (error instanceof Error) {
    logger.error(error);
  }

  // 2. Dispatch to Discord channel if bot is logged in and syslogs/error channel is configured
  const { getSyslogsChannel } = require('./devConfigHelper.js');
  const errorChannelId = getSyslogsChannel();
  if (discordClient && discordClient.isReady() && errorChannelId) {
    try {
      const channel = await discordClient.channels.fetch(errorChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const { errorEmbed } = require('./embedHelper.js');
        const embed = errorEmbed(
          `Alert: ${context}`,
          `**Message:**\n\`\`\`ansi\n${pc.red(errorMessage)}\n\`\`\``
        )
          .setTitle(`🚨 Alert: ${context}`)
          .addFields({
            name: 'Stack Trace',
            value: `\`\`\`js\n${errorStack.slice(0, 1000)}\n\`\`\``,
          });

        await channel.send({ embeds: [embed] });
      }
    } catch (discordErr) {
      console.error('Failed to send error report to Discord channel:', discordErr.message);
    }
  }
}

module.exports = {
  initErrorHandler,
  reportError,
};
