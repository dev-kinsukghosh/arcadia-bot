const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

dotenv.config();

/**
 * Escapes a SQL value for INSERT statements
 * @param {any} val
 * @returns {string}
 */
function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  // String escaping
  const escaped = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
  return `'${escaped}'`;
}

/**
 * Dumps all tables and rows from current MySQL database into a SQL file
 */
async function dumpDatabase() {
  logger.system('Initiating complete database dump from current MySQL connection...');

  const host = process.env.DB_IP || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;

  if (!database) {
    logger.error('No DB_NAME configured in .env file!');
    process.exit(1);
  }

  logger.info(`Connecting to MySQL database: ${pc.cyan(database)} on ${host}:${port}...`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
    });
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const outputPath = path.join(dataDir, 'latest-db-dump.sql');
    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

    // Header metadata
    writeStream.write('-- ========================================================\n');
    writeStream.write(`-- Arcadia Community Bot — Latest Database Dump\n`);
    writeStream.write(`-- Dump Date: ${new Date().toISOString()}\n`);
    writeStream.write(`-- Source Database: ${database}\n`);
    writeStream.write('-- ========================================================\n\n');
    writeStream.write('SET NAMES utf8mb4;\n');
    writeStream.write('SET FOREIGN_KEY_CHECKS = 0;\n\n');

    // List all tables
    const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_Type = "BASE TABLE"');
    const tableNames = tables.map((r) => Object.values(r)[0]);

    logger.info(`Found ${pc.bold(tableNames.length)} tables to export.`);

    let totalRowsExported = 0;

    for (const tableName of tableNames) {
      // 1. Table schema
      const [createResult] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createResult[0]['Create Table'];

      writeStream.write(`-- --------------------------------------------------------\n`);
      writeStream.write(`-- Table structure for \`${tableName}\`\n`);
      writeStream.write(`-- --------------------------------------------------------\n`);
      writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
      writeStream.write(`${createSql};\n\n`);

      // 2. Table records
      const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
      const count = rows.length;
      totalRowsExported += count;

      if (count > 0) {
        writeStream.write(`-- Dumping data for table \`${tableName}\` (${count} rows)\n`);

        const columns = Object.keys(rows[0])
          .map((c) => `\`${c}\``)
          .join(', ');

        // Chunk inserts to avoid giant packets
        const CHUNK_SIZE = 250;
        for (let i = 0; i < count; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const valuesSql = chunk
            .map((row) => `(${Object.values(row).map(escapeSqlValue).join(', ')})`)
            .join(',\n');

          writeStream.write(`INSERT INTO \`${tableName}\` (${columns}) VALUES\n${valuesSql};\n`);
        }
        writeStream.write('\n');
      }

      logger.success(`Exported table: ${pc.bold(tableName)} (${pc.cyan(count)} rows)`);
    }

    writeStream.write('SET FOREIGN_KEY_CHECKS = 1;\n');
    writeStream.write('-- Dump completed.\n');
    writeStream.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    logger.success(
      `Database copy successfully created at: ${pc.bold(outputPath)} (${sizeMb} MB, ${totalRowsExported} total rows)`
    );
  } catch (err) {
    logger.error('Failed to export database dump:', err);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

if (require.main === module) {
  dumpDatabase().catch((err) => {
    logger.error('Fatal database dump error:', err);
    process.exit(1);
  });
}

module.exports = { dumpDatabase };
