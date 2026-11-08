const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

dotenv.config();

/**
 * Imports a SQL dump file into the configured MySQL database
 * @param {string} [dumpPath]
 * @returns {Promise<boolean>}
 */
async function importDatabase(dumpPath) {
  const targetFile = dumpPath || path.join(process.cwd(), 'data', 'latest-db-dump.sql');

  if (!fs.existsSync(targetFile)) {
    logger.warn(`No database dump file found at: ${targetFile}`);
    return false;
  }

  const host = process.env.DB_IP || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;

  if (!database) {
    logger.error('No DB_NAME configured in .env file!');
    return false;
  }

  logger.system(
    `Starting database import into ${pc.cyan(database)} from ${pc.bold(path.basename(targetFile))}...`
  );

  let conn;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 10000,
    });
  } catch (err) {
    logger.error(`Failed to connect to database: ${err.message}`);
    return false;
  }

  try {
    const sqlContent = fs.readFileSync(targetFile, 'utf8');

    // Split statements intelligently by semicolon at line end
    const rawStatements = sqlContent
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    logger.info(`Executing ${pc.bold(rawStatements.length)} SQL query blocks...`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('SET NAMES utf8mb4');

    let executed = 0;
    for (const stmt of rawStatements) {
      if (stmt) {
        await conn.query(stmt);
        executed++;
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    logger.success(
      `Successfully imported ${pc.bold(executed)} database blocks into '${pc.bold(database)}'!`
    );
    return true;
  } catch (err) {
    logger.error(`Import failed during SQL execution: ${err.message}`);
    return false;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

if (require.main === module) {
  importDatabase().catch((err) => {
    logger.error('Fatal import error:', err);
    process.exit(1);
  });
}

module.exports = { importDatabase };
