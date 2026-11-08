const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
const pc = require('picocolors');
const gradient = require('gradient-string').default;
const logger = require('../src/utils/logger.js');
const { generateKey, validateKey } = require('./keygen.js');
const {
  validateDiscordToken,
  validateSnowflake,
  validateDatabase,
  validateRedis,
} = require('./validate-env.js');
const { importDatabase } = require('./import-database.js');

// Cyber-Style Neon Gradients matching project palette
const gradients = {
  banner: gradient(['#7f00ff', '#e100ff']), // Purple to Neon Pink (SYSTEM)
  success: gradient(['#00ff00', '#00ff99']), // Neon Green to Teal (SUCCESS)
  cyan: gradient(['#00c6ff', '#0072ff']), // Cyan to Blue (INFO)
  warning: gradient(['#ff9900', '#ffcc00']), // Orange to Yellow (WARNING)
  error: gradient(['#ff0000', '#ff6666']), // Red to Coral (ERROR)
};

/**
 * Creates an interactive readline interface wrapper
 */
function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    question: (query) => new Promise((resolve) => rl.question(query, resolve)),
    close: () => rl.close(),
  };
}

/**
 * Parses existing .env file into key-value map
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

/**
 * Saves a dictionary of key-value pairs back to .env
 * @param {string} filePath
 * @param {Record<string, string>} envData
 */
function writeEnvFile(filePath, envData) {
  const lines = [
    '# ========================================================',
    '# Arcadia Community Bot — Environment Configuration',
    '# Generated automatically via `npm run setup`',
    '# ========================================================',
    '',
    '# System Logs & Runtime Mode',
    `LOG_LEVEL=${envData.LOG_LEVEL || 'debug'}`,
    `MODE=${envData.MODE || 'development'}`,
    `NODE_ENV=${envData.NODE_ENV || 'development'}`,
    `BOT_PREFIX=${envData.BOT_PREFIX || 'a!'}`,
    '',
    '# Discord Bot Credentials',
    `DISCORD_BOT_TOKEN=${envData.DISCORD_BOT_TOKEN || ''}`,
    `DISCORD_CLIENT_ID=${envData.DISCORD_CLIENT_ID || ''}`,
    `DISCORD_GUILD_ID=${envData.DISCORD_GUILD_ID || ''}`,
    '',
    '# Developer Authorization & Telemetry Secret',
    `DEV_SECRET=${envData.DEV_SECRET || ''}`,
    `DEV_ID=${envData.DEV_ID || ''}`,
    '',
    '# MySQL / MariaDB Database Connection',
    `DB_IP=${envData.DB_IP || '127.0.0.1'}`,
    `DB_PORT=${envData.DB_PORT || '3306'}`,
    `DB_NAME=${envData.DB_NAME || 'arcadia_bot'}`,
    `DB_USER=${envData.DB_USER || 'root'}`,
    `DB_PASSWORD=${envData.DB_PASSWORD || ''}`,
    `DB_CONNECTION_LIMIT=${envData.DB_CONNECTION_LIMIT || '30'}`,
    '',
    '# Redis Cache Connection',
    `REDIS_HOST=${envData.REDIS_HOST || '127.0.0.1'}`,
    `REDIS_PORT=${envData.REDIS_PORT || '6379'}`,
    `REDIS_PASSWORD=${envData.REDIS_PASSWORD || ''}`,
    `REDIS_DB=${envData.REDIS_DB || '0'}`,
    '',
    '# External ArcadiaMC API',
    `API_BASE_URL=${envData.API_BASE_URL || 'https://api.arcadiamc.net'}`,
    `MC_VERSION=${envData.MC_VERSION || '1.21.1'}`,
    '',
    '# Web Server (Express API) & Dashboard Configuration',
    `PORT=${envData.PORT || '5556'}`,
    `ALLOWED_ORIGINS=${envData.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5556'}`,
    `DASHBOARD_URL=${envData.DASHBOARD_URL || 'http://localhost:5173'}`,
    '',
  ];

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

/**
 * Creates runtime directories needed for bot operations
 */
function ensureDirectories() {
  const dirs = [
    path.join(process.cwd(), 'logs'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), 'src', 'icons'),
    path.join(process.cwd(), 'src', 'heads'),
    path.join(process.cwd(), 'dashboard', 'dist'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Executes a shell command synchronously and inherits stdio
 * @param {string} cmd
 * @returns {boolean}
 */
function executeCommand(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
    return true;
  } catch {
    return false;
  }
}

/**
 * Displays Cyber Setup Banner
 */
function displayBanner() {
  const bannerText = `
  █████╗ ██████╗  ██████╗ █████╗ ██████╗ ██╗ █████╗ 
 ██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██║██╔══██╗
 ███████║██████╔╝██║     ███████║██║  ██║██║███████║
 ██╔══██║██╔══██╗██║     ██╔══██║██║  ██║██║██╔══██║
 ██║  ██║██║  ██║╚██████╗██║  ██║██████╔╝██║██║  ██║
 ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═╝
     ⚡ ARCADIA COMMUNITY BOT — SETUP WIZARD ⚡      `;

  console.log(gradients.banner(bannerText));
  console.log(pc.gray(' ─────────────────────────────────────────────────────────────'));
  console.log(` ${gradients.cyan('High-Performance Discord Bot, Sync Services & Web Monitor')}`);
  console.log(pc.gray(' ─────────────────────────────────────────────────────────────\n'));
}

/**
 * Main Setup Flow with Dual Mode:
 * 1. Express Auto-Setup (Ultra-easy, handles defaults hands-free)
 * 2. Guided Custom Setup (Step-by-step walkthrough)
 * Also supports non-interactive execution via --inactive, --quick, or --yes.
 */
async function runSetup() {
  displayBanner();

  const args = process.argv.slice(2);
  const isInactive =
    args.includes('--inactive') ||
    args.includes('--quick') ||
    args.includes('--yes') ||
    args.includes('-y');

  // 1. Ensure runtime directories
  ensureDirectories();
  logger.success('Runtime directories verified (logs/, data/, src/icons/, src/heads/).');

  // 2. Read existing .env or .env.example
  const envPath = path.join(process.cwd(), '.env');
  const examplePath = path.join(process.cwd(), '.env.example');
  let currentEnv = {};

  if (fs.existsSync(envPath)) {
    currentEnv = parseEnvFile(envPath);
    logger.info('Loaded existing configuration from .env as defaults.');
  } else if (fs.existsSync(examplePath)) {
    currentEnv = parseEnvFile(examplePath);
    logger.info('Initialized defaults from .env.example template.');
  }

  const prompt = createPrompt();

  try {
    let mode = '1'; // Default: 1 = Express Auto-Setup

    if (!isInactive) {
      console.log(`\n${gradients.cyan('Select Setup Mode:')}`);
      console.log(
        `  ${pc.bold(pc.green('❯ [1] Express Auto-Setup'))} ${pc.gray('(Press Enter — recommended, fast, hands-free)')}`
      );
      console.log(
        `  ${pc.bold('[2] Guided Custom Setup')} ${pc.gray('(Review and customize each setting step-by-step)')}\n`
      );

      const modeInput = (
        await prompt.question(pc.bold(gradients.cyan('Choose mode [1]: ')))
      ).trim();
      if (modeInput === '2') {
        mode = '2';
      }
    } else {
      logger.system('Running in unattended non-interactive mode (--inactive).');
    }

    const isExpress = mode === '1';

    // -------------------------------------------------------------
    // Step 1: Discord Bot Token Validation Loop
    // -------------------------------------------------------------
    logger.system('Verifying Discord Bot Token...');
    let discordToken = currentEnv.DISCORD_BOT_TOKEN || '';
    let validatedBotUser = null;
    let tokenValid = false;

    // Check if current token already works
    if (discordToken) {
      const quickTest = await validateDiscordToken(discordToken);
      if (quickTest.valid) {
        tokenValid = true;
        validatedBotUser = quickTest.bot;
        logger.success(
          `Verified Discord Bot: ${pc.bold(quickTest.bot.tag)} (ID: ${quickTest.bot.id})`
        );
      }
    }

    while (!tokenValid) {
      const defaultHint = discordToken ? ` [Current: ${discordToken.slice(0, 10)}...]` : '';
      const input = (
        await prompt.question(pc.bold(gradients.cyan(`Enter DISCORD_BOT_TOKEN${defaultHint}: `)))
      ).trim();

      const candidate = input || discordToken;

      if (!candidate) {
        logger.error('Discord bot token cannot be empty!');
        continue;
      }

      logger.info('Probing Discord REST API (/users/@me)...');
      const res = await validateDiscordToken(candidate);

      if (res.valid) {
        tokenValid = true;
        discordToken = candidate;
        validatedBotUser = res.bot;
        logger.success(`Logged in successfully as ${pc.bold(res.bot.tag)} (ID: ${res.bot.id})`);
      } else {
        logger.error(`Token validation failed: ${res.error}`);
        const action = (
          await prompt.question(
            pc.bold(
              gradients.warning('What would you like to do? [R]etry / [K]eep anyway / [S]kip [R]: ')
            )
          )
        )
          .trim()
          .toLowerCase();

        if (action === 'k' || action === 'keep') {
          discordToken = candidate;
          tokenValid = true;
        } else if (action === 's' || action === 'skip') {
          tokenValid = true;
        }
      }
    }

    // -------------------------------------------------------------
    // Step 2: Discord Client ID & Guild ID
    // -------------------------------------------------------------
    let clientId = validatedBotUser?.id || currentEnv.DISCORD_CLIENT_ID || '';
    let guildId = currentEnv.DISCORD_GUILD_ID || '';

    if (!isExpress) {
      logger.system('Configuring Application & Guild IDs...');
      let clientValid = false;
      while (!clientValid) {
        const defaultHint = clientId ? ` [${clientId}]` : '';
        const input = (
          await prompt.question(pc.bold(gradients.cyan(`Enter DISCORD_CLIENT_ID${defaultHint}: `)))
        ).trim();
        const candidate = input || clientId;
        const res = validateSnowflake(candidate);
        if (res.valid) {
          clientId = candidate;
          clientValid = true;
          logger.success(`Client ID set to: ${pc.bold(clientId)}`);
        } else {
          logger.warn(res.error);
          const act = (
            await prompt.question(pc.bold(gradients.warning('Retry or keep anyway? [R/k]: ')))
          )
            .trim()
            .toLowerCase();
          if (act === 'k') {
            clientId = candidate;
            clientValid = true;
          }
        }
      }

      const guildHint = guildId ? ` [${guildId}]` : ' [Leave blank for global]';
      const inputGuild = (
        await prompt.question(
          pc.bold(gradients.cyan(`Enter DISCORD_GUILD_ID (Optional)${guildHint}: `))
        )
      ).trim();
      guildId = inputGuild !== '' ? inputGuild : guildId;
    } else {
      if (clientId) {
        logger.success(`Using Client ID: ${pc.bold(clientId)}`);
      }
    }

    // -------------------------------------------------------------
    // Step 3: Developer Secret Key (DEV_SECRET) & DEV_ID
    // -------------------------------------------------------------
    let devSecret = currentEnv.DEV_SECRET || '';
    if (!devSecret) {
      // Auto-generate strong 64-char hex key
      devSecret = generateKey({ bytes: 32, format: 'hex' });
      logger.success(
        `Auto-generated secure DEV_SECRET: ${pc.bold(devSecret.slice(0, 16))}... (64 chars)`
      );
    } else {
      const val = validateKey(devSecret);
      logger.success(`Existing DEV_SECRET verified: ${val.level} (${val.entropy} bits/char)`);
    }

    let devId = currentEnv.DEV_ID || '';
    if (!isExpress) {
      const devHint = devId ? ` [${devId}]` : ' [Leave blank if none]';
      const inputDevId = (
        await prompt.question(
          pc.bold(gradients.cyan(`Enter Discord Developer User IDs (comma-separated)${devHint}: `))
        )
      ).trim();
      devId = inputDevId !== '' ? inputDevId : devId;
    }

    // -------------------------------------------------------------
    // Step 4: MySQL / MariaDB Database Connection & Auto-Creation
    // -------------------------------------------------------------
    logger.system('Validating MySQL / MariaDB Database Connection...');
    let dbIp = currentEnv.DB_IP || '127.0.0.1';
    let dbPort = currentEnv.DB_PORT || '3306';
    let dbName = currentEnv.DB_NAME || 'arcadia_bot';
    let dbUser = currentEnv.DB_USER || 'root';
    let dbPass = currentEnv.DB_PASSWORD !== undefined ? currentEnv.DB_PASSWORD : '';
    let dbValid = false;

    while (!dbValid) {
      if (!isExpress) {
        dbIp =
          (await prompt.question(pc.bold(gradients.cyan(`Database Host [${dbIp}]: `)))).trim() ||
          dbIp;
        dbPort =
          (await prompt.question(pc.bold(gradients.cyan(`Database Port [${dbPort}]: `)))).trim() ||
          dbPort;
        dbName =
          (await prompt.question(pc.bold(gradients.cyan(`Database Name [${dbName}]: `)))).trim() ||
          dbName;
        dbUser =
          (await prompt.question(pc.bold(gradients.cyan(`Database User [${dbUser}]: `)))).trim() ||
          dbUser;
        const passPrompt = (
          await prompt.question(
            pc.bold(gradients.cyan(`Database Password [Press Enter to keep current]: `))
          )
        ).trim();
        if (passPrompt !== '') dbPass = passPrompt;
      }

      logger.info(`Testing MySQL connection to ${pc.cyan(dbIp)}:${pc.cyan(dbPort)}...`);
      const dbCheck = await validateDatabase({
        host: dbIp,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPass,
      });

      if (dbCheck.valid) {
        if (!dbCheck.dbExists) {
          logger.warn(
            `MySQL Connected (${dbCheck.version}), but database '${dbName}' does not exist.`
          );
          let createDb = true;
          if (!isInactive) {
            const createAns = (
              await prompt.question(
                pc.bold(gradients.cyan(`Create database '${dbName}' automatically now? [Y/n]: `))
              )
            )
              .trim()
              .toLowerCase();
            createDb = createAns === '' || createAns === 'y' || createAns === 'yes';
          }

          if (createDb) {
            try {
              const adminConn = await mysql.createConnection({
                host: dbIp,
                port: parseInt(dbPort, 10),
                user: dbUser,
                password: dbPass,
              });
              await adminConn.query(
                `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
              );
              await adminConn.end();
              logger.success(`Database '${pc.bold(dbName)}' created successfully!`);
              dbValid = true;
            } catch (createErr) {
              logger.error(`Failed to auto-create database: ${createErr.message}`);
            }
          } else {
            dbValid = true;
          }
        } else {
          logger.success(
            `MySQL Connected! Version: ${pc.bold(dbCheck.version)} | Database: ${pc.bold(dbName)}`
          );
          dbValid = true;
        }
      } else {
        logger.error(`Database connection failed: ${dbCheck.error}`);
        if (isExpress || isInactive) {
          // In express mode, switch to guided prompt for DB to resolve
          logger.warn('Switching to interactive input for MySQL credentials...');
          isExpress = false;
        } else {
          const act = (
            await prompt.question(
              pc.bold(
                gradients.warning(
                  'Would you like to [R]etry credentials, [K]eep anyway, or [S]kip? [R/k/s]: '
                )
              )
            )
          )
            .trim()
            .toLowerCase();

          if (act === 'k' || act === 'keep' || act === 's' || act === 'skip') {
            dbValid = true;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Step 5: Redis Cache Verification
    // -------------------------------------------------------------
    logger.system('Validating Redis Cache Connection...');
    let redisHost = currentEnv.REDIS_HOST || '127.0.0.1';
    let redisPort = currentEnv.REDIS_PORT || '6379';
    let redisPass = currentEnv.REDIS_PASSWORD || '';
    let redisDb = currentEnv.REDIS_DB || '0';
    let redisValid = false;

    while (!redisValid) {
      if (!isExpress) {
        redisHost =
          (await prompt.question(pc.bold(gradients.cyan(`Redis Host [${redisHost}]: `)))).trim() ||
          redisHost;
        redisPort =
          (await prompt.question(pc.bold(gradients.cyan(`Redis Port [${redisPort}]: `)))).trim() ||
          redisPort;
        const passPrompt = (
          await prompt.question(
            pc.bold(gradients.cyan(`Redis Password [Press Enter to keep current]: `))
          )
        ).trim();
        if (passPrompt !== '') redisPass = passPrompt;
        redisDb =
          (
            await prompt.question(pc.bold(gradients.cyan(`Redis DB Index [${redisDb}]: `)))
          ).trim() || redisDb;
      }

      logger.info(`Sending PING to Redis at ${pc.cyan(redisHost)}:${pc.cyan(redisPort)}...`);
      const redisCheck = await validateRedis({
        host: redisHost,
        port: redisPort,
        password: redisPass,
        db: redisDb,
      });

      if (redisCheck.valid) {
        logger.success(
          `Redis Cache verified! PONG roundtrip latency: ${pc.bold(redisCheck.latencyMs)}ms`
        );
        redisValid = true;
      } else {
        logger.error(`Redis connection failed: ${redisCheck.error}`);
        if (isExpress || isInactive) {
          logger.warn('Redis is optional for development, continuing with configured parameters.');
          redisValid = true;
        } else {
          const act = (
            await prompt.question(
              pc.bold(
                gradients.warning(
                  'Would you like to [R]etry Redis credentials, [K]eep, or [S]kip? [R/k/s]: '
                )
              )
            )
          )
            .trim()
            .toLowerCase();

          if (act === 'k' || act === 'keep' || act === 's' || act === 'skip') {
            redisValid = true;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Step 6: Web Server & Network Ports
    // -------------------------------------------------------------
    let port = currentEnv.PORT || '5556';
    let apiBaseUrl = currentEnv.API_BASE_URL || 'https://api.arcadiamc.net';
    let dashboardUrl = currentEnv.DASHBOARD_URL || 'http://localhost:5173';

    if (!isExpress) {
      logger.system('Configuring Web Server & Dashboard URLs...');
      port =
        (
          await prompt.question(pc.bold(gradients.cyan(`Express Web API Port [${port}]: `)))
        ).trim() || port;
      apiBaseUrl =
        (
          await prompt.question(pc.bold(gradients.cyan(`ArcadiaMC API Base URL [${apiBaseUrl}]: `)))
        ).trim() || apiBaseUrl;
      dashboardUrl =
        (
          await prompt.question(pc.bold(gradients.cyan(`Dashboard URL [${dashboardUrl}]: `)))
        ).trim() || dashboardUrl;
    }

    // -------------------------------------------------------------
    // Step 7: Save .env Configuration
    // -------------------------------------------------------------
    logger.system('Writing unified .env configuration file...');

    const finalEnv = {
      ...currentEnv,
      DISCORD_BOT_TOKEN: discordToken,
      DISCORD_CLIENT_ID: clientId,
      DISCORD_GUILD_ID: guildId,
      DEV_SECRET: devSecret,
      DEV_ID: devId,
      DB_IP: dbIp,
      DB_PORT: dbPort,
      DB_NAME: dbName,
      DB_USER: dbUser,
      DB_PASSWORD: dbPass,
      DB_CONNECTION_LIMIT: currentEnv.DB_CONNECTION_LIMIT || '30',
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      REDIS_PASSWORD: redisPass,
      REDIS_DB: redisDb,
      PORT: port,
      API_BASE_URL: apiBaseUrl,
      DASHBOARD_URL: dashboardUrl,
      LOG_LEVEL: currentEnv.LOG_LEVEL || 'debug',
    };

    writeEnvFile(envPath, finalEnv);
    logger.success('Saved environment settings to .env');

    // Create dashboard/.env if absent
    const dashEnvPath = path.join(process.cwd(), 'dashboard', '.env');
    if (!fs.existsSync(dashEnvPath)) {
      const dashContent = `# Auto-generated by setup wizard\nVITE_API_URL=http://localhost:${port}\n`;
      fs.writeFileSync(dashEnvPath, dashContent, 'utf8');
      logger.success(`Created dashboard/.env with VITE_API_URL=http://localhost:${port}`);
    }

    // -------------------------------------------------------------
    // Step 8: Optional Database Import (Latest Data Copy)
    // -------------------------------------------------------------
    const dumpPath = path.join(process.cwd(), 'data', 'latest-db-dump.sql');
    if (fs.existsSync(dumpPath) && dbValid) {
      let shouldImport = false;
      if (!isInactive) {
        const importPrompt = (
          await prompt.question(
            pc.bold(
              gradients.cyan(
                'Found latest database data copy (latest-db-dump.sql). Import into database now? [Y/n]: '
              )
            )
          )
        )
          .trim()
          .toLowerCase();
        shouldImport = importPrompt === '' || importPrompt === 'y' || importPrompt === 'yes';
      }

      if (shouldImport) {
        logger.system('Importing data dump into MySQL database...');
        await importDatabase(dumpPath);
      }
    } else {
      // If no dump file, offer to run Drizzle Kit push
      if (!isInactive) {
        const pushDb = (
          await prompt.question(
            pc.bold(gradients.cyan('Run Drizzle Kit schema push to initialize tables? [Y/n]: '))
          )
        )
          .trim()
          .toLowerCase();

        if (pushDb === '' || pushDb === 'y' || pushDb === 'yes') {
          logger.info('Pushing database schema via drizzle-kit push...');
          executeCommand('npx drizzle-kit push');
        }
      }
    }

    // -------------------------------------------------------------
    // Step 9: Discord Slash Commands Deployment
    // -------------------------------------------------------------
    if (discordToken && clientId && !isInactive) {
      const deployCmds = (
        await prompt.question(
          pc.bold(gradients.cyan('Deploy slash commands to Discord now? [Y/n]: '))
        )
      )
        .trim()
        .toLowerCase();

      if (deployCmds === '' || deployCmds === 'y' || deployCmds === 'yes') {
        const flag = guildId ? '--guild' : '--global';
        logger.info(`Deploying commands (${flag})...`);
        executeCommand(`node src/deploy-commands.js ${flag}`);
      }
    }

    // -------------------------------------------------------------
    // Completion Banner & Command Tips
    // -------------------------------------------------------------
    console.log(pc.gray('\n ─────────────────────────────────────────────────────────────'));
    console.log(gradients.success('       🎉 ARCADIA SETUP COMPLETED SUCCESSFULLY! 🎉'));
    console.log(pc.gray(' ─────────────────────────────────────────────────────────────'));
    console.log(`\n ${pc.bold('Ready to launch:')}`);
    console.log(
      `   ${pc.cyan('npm run dev:all')}        Start both Discord Bot and Web Dashboard concurrently`
    );
    console.log(
      `   ${pc.cyan('npm start')}              Start production Discord Bot and Express Web API`
    );
    console.log(`   ${pc.cyan('npm run start:bot')}      Start Discord Bot only`);
    console.log(`   ${pc.cyan('npm run env:validate')}   Re-run diagnostics across all services`);
    console.log(
      `   ${pc.cyan('npm run keygen')}         Generate or test developer security keys\n`
    );
  } finally {
    prompt.close();
  }
}

if (require.main === module) {
  runSetup().catch((err) => {
    logger.critical('Fatal error during setup wizard:', err);
    process.exit(1);
  });
}

module.exports = {
  runSetup,
  parseEnvFile,
  writeEnvFile,
  ensureDirectories,
};
