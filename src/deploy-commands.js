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

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  logger.error(`Commands directory not found at ${commandsPath}`);
  process.exit(1);
}

const categories = fs.readdirSync(commandsPath);

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

function loadCommand(filePath) {
  try {
    const command = require(filePath);
    if (command && command.data && typeof command.execute === 'function') {
      commands.push(command.data.toJSON());
    }
  } catch (error) {
    logger.error(`Error reading command ${filePath} for deployment:`, error);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      logger.info(`Deploying commands to development guild: ${guildId}`);
      const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      logger.info(
        `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
      );
    } else {
      logger.info('Deploying commands globally (this can take up to 1 hour to propagate).');
      const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    }
    logger.success('Deployment completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to deploy application commands:', error);
    process.exit(1);
  }
})();
