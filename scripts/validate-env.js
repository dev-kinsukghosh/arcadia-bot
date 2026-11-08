const axios = require('axios');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const pc = require('picocolors');
const { validateKey } = require('./keygen.js');

dotenv.config();

/**
 * Validates Discord Bot Token against the Discord REST API
 * @param {string} token
 * @returns {Promise<{ valid: boolean, bot?: { id: string, tag: string }, error?: string }>}
 */
async function validateDiscordToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is empty or not provided.' };
  }

  const trimmed = token.trim();
  if (trimmed.length < 50) {
    return { valid: false, error: 'Token length is too short to be a valid Discord bot token.' };
  }

  try {
    const res = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${trimmed}`,
        'User-Agent': 'ArcadiaSetupValidator/3.0',
      },
      timeout: 8000,
    });

    if (res.status === 200 && res.data && res.data.id) {
      return {
        valid: true,
        bot: {
          id: res.data.id,
          tag: `${res.data.username}#${res.data.discriminator || '0'}`,
        },
      };
    }
    return { valid: false, error: `Unexpected Discord API response status: ${res.status}` };
  } catch (err) {
    if (err.response) {
      if (err.response.status === 401) {
        return { valid: false, error: '401 Unauthorized — Invalid Bot Token.' };
      }
      return {
        valid: false,
        error: `Discord API Error (${err.response.status}): ${err.response.data?.message || err.message}`,
      };
    }
    return { valid: false, error: `Network error reaching Discord API: ${err.message}` };
  }
}

/**
 * Validates a Discord snowflake ID format (17-20 digits)
 * @param {string} id
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSnowflake(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is empty or missing.' };
  }
  const trimmed = id.trim();
  if (!/^\d{17,20}$/.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid snowflake format '${trimmed}'. Must be a 17-20 digit integer.`,
    };
  }
  return { valid: true };
}

/**
 * Validates MySQL / MariaDB database connectivity
 * @param {object} cfg
 * @returns {Promise<{ valid: boolean, dbExists: boolean, version?: string, error?: string }>}
 */
async function validateDatabase(cfg) {
  const host = cfg.host || cfg.DB_IP || '127.0.0.1';
  const port = parseInt(cfg.port || cfg.DB_PORT || 3306, 10);
  const user = cfg.user || cfg.DB_USER || 'root';
  const password =
    cfg.password !== undefined
      ? cfg.password
      : cfg.DB_PASSWORD !== undefined
        ? cfg.DB_PASSWORD
        : '';
  const database = cfg.database || cfg.name || cfg.DB_NAME || '';

  let conn;
  try {
    // Attempt connecting to MySQL server
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 7000,
    });

    const [verRows] = await conn.query('SELECT VERSION() AS version');
    const version = verRows[0]?.version || 'Unknown';

    let dbExists = true;
    if (database) {
      try {
        await conn.query(`USE \`${database}\``);
      } catch (dbErr) {
        if (dbErr.code === 'ER_BAD_DB_ERROR') {
          dbExists = false;
        } else {
          throw dbErr;
        }
      }
    }

    await conn.end();
    return { valid: true, dbExists, version };
  } catch (err) {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
    return { valid: false, dbExists: false, error: err.message, code: err.code };
  }
}

/**
 * Validates Redis cache connectivity and measures latency
 * @param {object} cfg
 * @returns {Promise<{ valid: boolean, latencyMs?: number, error?: string }>}
 */
async function validateRedis(cfg) {
  const host = cfg.host || cfg.REDIS_HOST || '127.0.0.1';
  const port = parseInt(cfg.port || cfg.REDIS_PORT || 6379, 10);
  const password = cfg.password !== undefined ? cfg.password : cfg.REDIS_PASSWORD || undefined;
  const db = parseInt(cfg.db !== undefined ? cfg.db : cfg.REDIS_DB || 0, 10);

  return new Promise((resolve) => {
    let settled = false;
    const client = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Do not auto-retry on fail
      lazyConnect: true,
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          client.disconnect();
        } catch {
          /* ignore */
        }
        resolve({ valid: false, error: 'Redis connection timed out after 5000ms.' });
      }
    }, 6000);

    const start = Date.now();
    client
      .connect()
      .then(async () => {
        const pingRes = await client.ping();
        const latencyMs = Date.now() - start;
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          try {
            client.disconnect();
          } catch {
            /* ignore */
          }
          if (pingRes === 'PONG') {
            resolve({ valid: true, latencyMs });
          } else {
            resolve({ valid: false, error: `Unexpected PING response: ${pingRes}` });
          }
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          try {
            client.disconnect();
          } catch {
            /* ignore */
          }
          resolve({ valid: false, error: err.message });
        }
      });
  });
}

/**
 * Validates connection to the external ArcadiaMC API
 * @param {string} baseUrl
 * @returns {Promise<{ valid: boolean, latencyMs?: number, status?: number, error?: string }>}
 */
async function validateArcadiaApi(baseUrl) {
  const target = baseUrl || 'https://api.arcadiamc.net';
  const start = Date.now();
  try {
    const res = await axios.get(target, {
      timeout: 8000,
      headers: { 'User-Agent': 'ArcadiaSetupValidator/3.0' },
      validateStatus: () => true, // Accept any status code (server is alive)
    });
    const latencyMs = Date.now() - start;
    return { valid: true, latencyMs, status: res.status };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * CLI runner for standalone validation
 */
async function runEnvValidation() {
  console.log(pc.bold(pc.magenta('\n======================================================')));
  console.log(pc.bold(pc.magenta('  🔍 ARCADIA BOT ENVIRONMENT & CREDENTIALS CHECKER     ')));
  console.log(pc.bold(pc.magenta('======================================================\n')));

  let hasErrors = false;

  // 1. Discord Bot Token
  process.stdout.write('Testing Discord Bot Token... ');
  const tokenRes = await validateDiscordToken(process.env.DISCORD_BOT_TOKEN);
  if (tokenRes.valid) {
    console.log(
      pc.bold(pc.green(`[PASS] Logged in as ${tokenRes.bot.tag} (ID: ${tokenRes.bot.id})`))
    );
  } else {
    hasErrors = true;
    console.log(pc.bold(pc.red(`[FAIL] ${tokenRes.error}`)));
  }

  // 2. Discord Client ID
  process.stdout.write('Checking DISCORD_CLIENT_ID... ');
  const clientRes = validateSnowflake(process.env.DISCORD_CLIENT_ID);
  if (clientRes.valid) {
    if (tokenRes.valid && tokenRes.bot?.id && process.env.DISCORD_CLIENT_ID !== tokenRes.bot.id) {
      console.log(
        pc.yellow(
          `[WARN] Client ID (${process.env.DISCORD_CLIENT_ID}) does not match Token ID (${tokenRes.bot.id})`
        )
      );
    } else {
      console.log(pc.green(`[PASS] Valid snowflake (${process.env.DISCORD_CLIENT_ID})`));
    }
  } else {
    hasErrors = true;
    console.log(pc.red(`[FAIL] ${clientRes.error}`));
  }

  // 3. MySQL Database
  process.stdout.write('Testing MySQL Connection... ');
  const dbRes = await validateDatabase({
    host: process.env.DB_IP,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  if (dbRes.valid) {
    if (!dbRes.dbExists) {
      console.log(
        pc.yellow(
          `[WARN] MySQL Connected (${dbRes.version}), but database '${process.env.DB_NAME}' does not exist.`
        )
      );
    } else {
      console.log(
        pc.green(`[PASS] Connected (${dbRes.version}) to '${process.env.DB_NAME || 'default'}'`)
      );
    }
  } else {
    hasErrors = true;
    console.log(pc.red(`[FAIL] ${dbRes.error}`));
  }

  // 4. Redis Cache
  process.stdout.write('Testing Redis Ping... ');
  const redisRes = await validateRedis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
  });
  if (redisRes.valid) {
    console.log(pc.green(`[PASS] PONG received in ${redisRes.latencyMs}ms`));
  } else {
    hasErrors = true;
    console.log(pc.red(`[FAIL] ${redisRes.error}`));
  }

  // 5. ArcadiaMC API
  process.stdout.write('Testing ArcadiaMC API... ');
  const apiRes = await validateArcadiaApi(process.env.API_BASE_URL);
  if (apiRes.valid) {
    console.log(pc.green(`[PASS] Reachable (Status ${apiRes.status}, ${apiRes.latencyMs}ms)`));
  } else {
    console.log(pc.yellow(`[WARN] API check: ${apiRes.error}`));
  }

  // 6. Developer Secret
  process.stdout.write('Checking DEV_SECRET Strength... ');
  const devSecret = process.env.DEV_SECRET || '';
  if (!devSecret) {
    console.log(
      pc.yellow('[WARN] DEV_SECRET is not configured (Developer endpoints open to DEV_ID only).')
    );
  } else {
    const secRes = validateKey(devSecret);
    if (secRes.valid) {
      console.log(
        pc.green(`[PASS] ${secRes.level} (${secRes.entropy} bits/char, ${secRes.length} chars)`)
      );
    } else {
      console.log(
        pc.yellow(`[WARN] Key is ${secRes.level}. Run 'npm run keygen' to generate a strong key.`)
      );
    }
  }

  console.log(pc.cyan('\n------------------------------------------------------'));
  if (hasErrors) {
    console.log(
      pc.bold(pc.red('❌ Critical configuration issues detected! Please review errors above.'))
    );
    console.log(
      pc.gray('Tip: Run `npm run setup` for an interactive wizard to configure these settings.\n')
    );
    process.exit(1);
  } else {
    console.log(
      pc.bold(pc.green('✅ All critical environment connections verified successfully!'))
    );
    console.log(
      pc.gray('You are ready to launch the bot using `npm start` or `npm run dev:all`\n')
    );
    process.exit(0);
  }
}

if (require.main === module) {
  runEnvValidation().catch((err) => {
    console.error(pc.red('Validation runner error:'), err);
    process.exit(1);
  });
}

module.exports = {
  validateDiscordToken,
  validateSnowflake,
  validateDatabase,
  validateRedis,
  validateArcadiaApi,
};
