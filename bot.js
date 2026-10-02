const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config, isConfigured } = require('./src/config.js');
const logger = require('./src/utils/logger.js');
const { loadEvents } = require('./src/handlers/eventHandler.js');
const { loadCommands } = require('./src/handlers/commandHandler.js');
const { initErrorHandler, reportError } = require('./src/utils/errorHandler.js');
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

  // Client WebSocket error event listeners to prevent unhandled socket crashes
  client.on('error', (error) => {
    logger.error('Discord Client WebSocket Connection Error:', error);
  });

  client.on('shardError', (error, shardId) => {
    logger.error(`Discord Shard [${shardId}] Connection Error:`, error);
  });

  // Load blacklist cache from DB safely
  try {
    logger.info('Loading blacklist cache...');
    await loadBlacklist();
  } catch (err) {
    logger.warn(`Blacklist startup load warning: ${err.message}`);
  }

  // Load guild config cache from DB safely
  try {
    logger.info('Loading guild configurations cache...');
    const { loadGuildConfigs } = require('./src/utils/guildConfigHelper.js');
    await loadGuildConfigs();
  } catch (err) {
    logger.warn(`Guild configs startup load warning: ${err.message}`);
  }

  // Load guild options cache from DB safely
  try {
    logger.info('Loading guild options cache...');
    const { loadGuildOptions } = require('./src/utils/guildOptionsHelper.js');
    await loadGuildOptions();
  } catch (err) {
    logger.warn(`Guild options startup load warning: ${err.message}`);
  }

  // Load developer configs cache from DB safely
  try {
    logger.info('Loading developer configurations cache...');
    const { loadDevConfig } = require('./src/utils/devConfigHelper.js');
    await loadDevConfig();
  } catch (err) {
    logger.warn(`DevConfig startup load warning: ${err.message}`);
  }

  // 1. Load Event handlers safely
  try {
    logger.info('Initializing event handlers...');
    loadEvents(client);
  } catch (err) {
    logger.error('Failed to load event handlers:', err);
  }

  // 2. Load Command handlers safely
  try {
    logger.info('Initializing slash commands...');
    loadCommands(client);
  } catch (err) {
    logger.error('Failed to load slash commands:', err);
  }

  // const serviceis = process.argv.includes('--noservices');
  // // 3. Start background sync services
  // if (!serviceis) {
  //   logger.info('Starting background sync services');
  //   const services = [
  //     { name: 'ConvoySync', path: './src/services/convoySync.js', fnName: 'startConvoySync' },
  //     { name: 'CurrencySync', path: './src/services/currencySync.js', fnName: 'startCurrencySync' },
  //     { name: 'HeadsSync', path: './src/services/headManager.js', fnName: 'startHeadsSync' },
  //     { name: 'ShopsSync', path: './src/services/shopsSync.js', fnName: 'startShopsSync' },
  //     { name: 'TownySync', path: './src/services/townySync.js', fnName: 'startTownySync' },
  //     {
  //       name: 'EmptyEndpointsSync',
  //       path: './src/services/emptyEndpointsSync.js',
  //       fnName: 'startEmptyEndpointsSync',
  //     },
  //     { name: 'PlayerSync', path: './src/services/playerSync.js', fnName: 'startPlayerSync' },
  //   ];

  //   for (const service of services) {
  //     try {
  //       const mod = require(service.path);
  //       if (typeof mod[service.fnName] === 'function') {
  //         mod[service.fnName](client);
  //       }
  //     } catch (err) {
  //       logger.error(`Error starting ${service.name}:`, err);
  //       reportError(err, `Service Startup: ${service.name} failed to start.`);
  //     }
  //   }
  // } else {
  //   logger.info('Background sync services are disabled no service flag triggered.');
  // }

  // 4. Start Express Webserver for Dashboard API
  const isBotOnly = process.argv.includes('--bot-only');
  if (!isBotOnly) {
    try {
      logger.info('Starting dashboard webserver...');
      const { startServer } = require('./src/server.js');
      startServer();
    } catch (err) {
      logger.error('Failed to start dashboard webserver:', err);
    }
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
