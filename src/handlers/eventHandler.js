const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger.js');

function loadEvents(client) {
  const eventsPath = path.join(process.cwd(), 'src', 'events');

  if (!fs.existsSync(eventsPath)) {
    logger.warn(`Events directory not found at ${eventsPath}`);
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);

    try {
      const event = require(filePath);

      if (!event || !event.name || typeof event.execute !== 'function') {
        logger.warn(`Event file ${file} is missing required 'name' or 'execute' properties.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }

      logger.info(`Loaded Event: ${event.name}`);
    } catch (error) {
      logger.error(`Error loading event file ${file}:`, error);
    }
  }
}

module.exports = {
  loadEvents,
};
