const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { config } = require('../config.js');
const logger = require('./logger.js');
const schema = require('../db/schema.js');

let db = null;
let connection = null;

if (config.db.name && config.db.user) {
  try {
    connection = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
    });

    db = drizzle(connection, { schema, mode: 'default' });

    logger.info(`Drizzle MySQL initialized on ${config.db.host}:${config.db.port}`);
  } catch (error) {
    logger.error('Failed to create Drizzle connection:', error);
  }
} else {
  logger.warn('MySQL configuration is incomplete in .env. Drizzle helper will not be active.');
}

module.exports = {
  db,
  connection,
};
