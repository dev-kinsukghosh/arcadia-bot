const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger.js');

function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.join(process.cwd(), 'src', 'commands');

  if (!fs.existsSync(commandsPath)) {
    logger.warn(`Commands directory not found at ${commandsPath}`);
    return;
  }

  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const stat = fs.statSync(categoryPath);

    if (stat.isDirectory()) {
      const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        loadCommandFile(client, path.join(categoryPath, file));
      }
    } else if (category.endsWith('.js')) {
      loadCommandFile(client, categoryPath);
    }
  }

  logger.info(`Successfully loaded ${client.commands.size} commands.`);
}

function loadCommandFile(client, filePath) {
  const fileName = path.basename(filePath);

  try {
    const command = require(filePath);

    if (!command || !command.data || typeof command.execute !== 'function') {
      logger.warn(`Command file ${fileName} is missing required 'data' or 'execute' properties.`);
      return;
    }

    client.commands.set(command.data.name, command);
    logger.info(`Loaded Command: /${command.data.name}`);
  } catch (error) {
    logger.error(`Error loading command file ${fileName}:`, error);
  }
}

module.exports = {
  loadCommands,
};
