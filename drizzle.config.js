const { defineConfig } = require('drizzle-kit');
const dotenv = require('dotenv');

// Load environment variables for local CLI commands
dotenv.config();

module.exports = defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_IP || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'arcadia_bot',
  },
});
