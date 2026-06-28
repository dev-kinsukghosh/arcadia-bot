const { migrate } = require('drizzle-orm/mysql2/migrator');
const { db, connection } = require('../src/utils/db.js');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

async function runMigration() {
  if (!db) {
    logger.warn('Database is not configured. Skipping migration.');
    return;
  }

  logger.info(pc.bold(pc.yellow('Running database migrations safely...')));
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info(pc.bold(pc.green('Database migrations applied successfully!')));
  } catch (error) {
    logger.error('Migration execution failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      logger.info('Database pool connection closed.');
    }
  }
}

runMigration();
