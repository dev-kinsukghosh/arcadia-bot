const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config, isConfigured } = require('./src/config.js');
const logger = require('./src/utils/logger.js');
const { loadEvents } = require('./src/handlers/eventHandler.js');
const { loadCommands } = require('./src/handlers/commandHandler.js');
const { initErrorHandler } = require('./src/utils/errorHandler.js');
const { loadBlacklist } = require('./src/utils/blacklistHelper.js');
const pc = require('picocolors');

// Import services to trigger their initialization and logging
require('./src/utils/db.js');
require('./src/utils/redis.js');
require('./src/utils/redisOm.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel],
});

async function main() {
  // Initialize crash interception immediately
  initErrorHandler(client);

  logger.info(pc.bold(pc.magenta('=========================================')));
  logger.info(pc.bold(pc.magenta('    STARTING ARCADIA COMMUNITY BOT       ')));
  logger.info(pc.bold(pc.magenta('=========================================')));

  if (!isConfigured) {
    logger.error('Bot cannot start because critical credentials are missing in your .env file.');
    logger.warn('Please fill in DISCORD_BOT_TOKEN in .env and restart the bot.');
    process.exit(1);
  }

  // Load blacklist cache from DB
  logger.info('Loading blacklist cache...');
  await loadBlacklist();

  // Load guild config cache from DB
  logger.info('Loading guild configurations cache...');
  const { loadGuildConfigs } = require('./src/utils/guildConfigHelper.js');
  await loadGuildConfigs();

  // Load guild options cache from DB
  logger.info('Loading guild options cache...');
  const { loadGuildOptions } = require('./src/utils/guildOptionsHelper.js');
  await loadGuildOptions();

  // 1. Load Event handlers
  logger.info('Initializing event handlers...');
  loadEvents(client);

  // 2. Load Command handlers
  logger.info('Initializing slash commands...');
  loadCommands(client);

  // 3. Start background sync services
  logger.info('Starting background sync services');
  const { startConvoySync } = require('./src/services/convoySync.js');
  startConvoySync(client);

  const { startCurrencySync } = require('./src/services/currencySync.js');
  startCurrencySync(client);

  const { startHeadsSync } = require('./src/services/headManager.js');
  startHeadsSync(client);

  const { startShopsSync } = require('./src/services/shopsSync.js');
  startShopsSync(client);

  const { startTownySync } = require('./src/services/townySync.js');
  startTownySync(client);

  // 4. Start Express Webserver for Dashboard API
  const isBotOnly = process.argv.includes('--bot-only');
  if (!isBotOnly) {
    logger.info('Starting dashboard webserver...');
    const { startServer } = require('./src/server.js');
    startServer();
  } else {
    logger.info('Dashboard webserver start skipped (bot-only mode).');
  }

  // 5. Login to Discord
  logger.info('Logging in to Discord...');
  try {
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Failed to log in to Discord API:', error);
    logger.warn('Please check your DISCORD_BOT_TOKEN in .env and ensure it is valid.');
    process.exit(1);
  }
}
main();
