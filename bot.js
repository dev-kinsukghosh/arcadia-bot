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

  // 1. Load Event handlers
  logger.info('Initializing event handlers...');
  loadEvents(client);

  // 2. Load Command handlers
  logger.info('Initializing slash commands...');
  loadCommands(client);

  // 3. Start background sync services
  logger.info('Starting background sync services...');
  const { startConvoySync } = require('./src/services/convoySync.js');
  startConvoySync(client);

  // 3. Login to Discord
  logger.info('Logging in to Discord...');
  try {
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Failed to log in to Discord API:', error);
    process.exit(1);
  }
}

main();
