const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./utils/logger.js');

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  logger.error('No DISCORD_BOT_TOKEN found in environment!');
  process.exit(1);
}

if (!clientId) {
  logger.warn('No DISCORD_CLIENT_ID found in environment. Please add it to deploy commands.');
  logger.info(
    'You can find the Client ID in the Discord Developer Portal under General Information.'
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const shouldClearGlobal = args.includes('--clear-global');
const shouldClearGuild = args.includes('--clear-guild');
const shouldClearAll = args.includes('--clear-all');

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    if (shouldClearAll || shouldClearGlobal || shouldClearGuild) {
      if (shouldClearAll || shouldClearGlobal) {
        logger.info('Clearing all global application (/) commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        logger.success('Successfully cleared all global application (/) commands.');
      }
      if (shouldClearAll || shouldClearGuild) {
        if (!guildId) {
          logger.warn('No DISCORD_GUILD_ID specified in .env, skipping clearing guild commands.');
        } else {
          logger.info(`Clearing all guild-specific commands for guild: ${guildId}`);
          await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
          logger.success(`Successfully cleared all guild-specific commands for guild ${guildId}.`);
        }
      }
      process.exit(0);
    }

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');

    if (!fs.existsSync(commandsPath)) {
      logger.error(`Commands directory not found at ${commandsPath}`);
      process.exit(1);
    }

    const categories = fs.readdirSync(commandsPath);
    const loadedNames = new Set();

    const loadCommand = (filePath) => {
      try {
        const command = require(filePath);
        if (command && command.data && typeof command.execute === 'function') {
          const commandName = command.data.name;
          if (commandName === 'pemoji') {
            logger.info(
              `Skipping deployment registration for ${commandName} (will be registered dynamically)`
            );
            return;
          }
          if (loadedNames.has(commandName)) {
            logger.warn(
              `Duplicate command name detected and skipped: ${commandName} in ${filePath}`
            );
            return;
          }
          loadedNames.add(commandName);
          commands.push(command.data.toJSON());
        }
      } catch (error) {
        logger.error(`Error reading command ${filePath} for deployment:`, error);
      }
    };

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      const stat = fs.statSync(categoryPath);

      if (stat.isDirectory()) {
        const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.js'));
        for (const file of commandFiles) {
          loadCommand(path.join(categoryPath, file));
        }
      } else if (category.endsWith('.js')) {
        loadCommand(categoryPath);
      }
    }

    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    const mode = (process.env.MODE || 'PROD').toUpperCase();
    const forceGlobal = args.includes('--global');
    logger.info(`Deployment mode: ${mode}${forceGlobal ? ' (Forced Global)' : ''}`);

    if (mode === 'DEV' && !forceGlobal) {
      if (guildId) {
        logger.info(`[DEV MODE] Deploying commands to development guild: ${guildId}`);
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        });
        logger.success(
          `[DEV MODE] Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
        );

        // Clear stale global commands to prevent duplicates
        logger.info('[DEV MODE] Clearing old global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        logger.success('[DEV MODE] Successfully cleared global application (/) commands.');
      } else {
        logger.warn(
          '[DEV MODE] DISCORD_GUILD_ID is not specified in .env. Falling back to global deployment.'
        );
        const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
        logger.success(
          `[DEV MODE] Successfully reloaded ${data.length} global application (/) commands.`
        );
      }
    } else {
      // PROD Mode or Forced Global
      logger.info('Deploying commands globally...');
      const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.success(`Successfully reloaded ${data.length} global application (/) commands.`);

      if (guildId) {
        logger.info(`Clearing old guild-specific commands for guild: ${guildId}...`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        logger.success(`Successfully cleared guild-specific commands for guild ${guildId}.`);
      }
    }

    logger.success('Deployment completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to deploy application commands:', error);
    process.exit(1);
  }
})();
