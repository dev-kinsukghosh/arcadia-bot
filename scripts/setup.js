const logger = require('../src/utils/logger.js');
const pc = require('picocolors');
const fs = require('fs');
const path = require('path');

async function setup() {
  logger.info(pc.bold(pc.green('Starting bot environment setup...')));

  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    logger.info('Created /logs directory.');
  }

  // Create local .env if it doesn't exist
  const envPath = path.join(process.cwd(), '.env');
  const examplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    logger.info('Created .env from .env.example template.');
  }

  logger.info(pc.bold(pc.green('Setup complete! Please configure your credentials in .env.')));
}

setup().catch((err) => {
  logger.error('Setup failed:', err);
  process.exit(1);
});
