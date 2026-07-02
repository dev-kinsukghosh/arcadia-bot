# Directory Mapping

This file serves as a reference guide for the directory structure and file responsibilities within the Arcadia Community Bot codebase.

## Codebase Tree Structure

```text
.
├── .agents/
│   └── AGENTS.md
├── scripts/
│   ├── setup.js
│   ├── migrate-safe.js
│   └── upload-emojis.js
├── src/
│   ├── deploy-commands.js
│   ├── commands/
│   │   └── general/
│   │       ├── blacklist.js
│   │       ├── cis-info.js
│   │       ├── cstock.js
│   │       ├── currencies.js
│   │       ├── dev-slist.js
│   │       ├── exchange.js
│   │       ├── forcesync.js
│   │       ├── healthz.js
│   │       ├── invite-bd.js
│   │       ├── ncurrency.js
│   │       ├── notifyiic.js
│   │       ├── ping.js
│   │       ├── stats-dev.js
│   │       └── test.js
│   ├── db/
│   │   ├── schema.js
│   │   └── redisSchema.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── guildMemberAdd.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── services/
│   │   ├── convoySync.js
│   │   └── currencySync.js
│   └── utils/
│       ├── apiClient.js
│       ├── blacklistHelper.js
│       ├── canvasHelper.js
│       ├── db.js
│       ├── embedHelper.js
│       ├── errorHandler.js
│       ├── iconDownloader.js
│       ├── logger.js
│       ├── redis.js
│       └── redisOm.js
├── tests/
│   ├── runner.js
│   ├── blacklist.test.js
│   ├── env.test.js
│   ├── api.test.js
│   ├── database.test.js
│   └── notify.test.js
├── .env
├── .env.example
├── .gitignore
├── drizzle.config.js
├── eslint.config.js
├── .prettierrc
└── package.json
```

## Directory & File Details

### 📂 Root Directory

- [bot.js](./bot.js): Main application entry point. Loads configuration, starts the logger, initializes DB/Redis clients, and boots up the Discord client.
- [drizzle.config.js](./drizzle.config.js): Database configurations mapping Drizzle schema generation to the MySQL server environment.
- [eslint.config.js](./eslint.config.js): ESLint static analysis configuration provided by the user.
- [.prettierrc](./.prettierrc): Settings for the Prettier formatter.
- [package.json](./package.json): Workspace script targets (`npm start`, `npm run dev`, `npm run deploy`, `npm run lint`, etc.) and dependencies listing.
- [.env.example](./.env.example): Template configuration containing environment variable keys.
- [Api.enpoints.md](./Api.enpoints.md): API endpoint mapping documentation for the ArcadiaMC server.
- [fs.md](./fs.md): _(This file)_ File system reference guide.
- [GEMINI.md](./GEMINI.md): Development rule book, project context, and daily change-log repository.
- [.agents/AGENTS.md](./.agents/AGENTS.md): Project-scoped customization rules for Antigravity developer agent.

### 📂 scripts/

- [scripts/setup.js](./scripts/setup.js): Assistant script to bootstrap directories and setup the `.env` template config.
- [scripts/migrate-safe.js](./scripts/migrate-safe.js): Programmatic schema migrator for Drizzle ORM.
- [scripts/upload-emojis.js](./scripts/upload-emojis.js): Utility script to upload cached item icon PNGs to Discord Application Emojis.

### 📂 src/

- [src/deploy-commands.js](./src/deploy-commands.js): Slash Command deployment script utilizing the Discord REST API.
  - 📂 **src/commands/**: Contains category subfolders containing Discord Slash Commands.
    - 📂 **src/commands/general/**:
      - [src/commands/general/blacklist.js](./src/commands/general/blacklist.js): `/blacklist` — Manage user blacklist add, remove, and list (Developer Only).
      - [src/commands/general/cis-info.js](./src/commands/general/cis-info.js): `/cis-info` — Displays historical, rarity, and frequency telemetry for convoy items.
      - [src/commands/general/cstock.js](./src/commands/general/cstock.js): `/cstock` — Displays current Convoy shop stock grouped by rarity.
      - [src/commands/general/currencies.js](./src/commands/general/currencies.js): `/currencies` — Displays active list of nation currencies and their rates.
      - [src/commands/general/exchange.js](./src/commands/general/exchange.js): `/exchange` — Calculates conversions and exchange rates between nation currencies.
      - [src/commands/general/forcesync.js](./src/commands/general/forcesync.js): `/forcesync` — Forces manual convoy data synchronization from the API (Developer Only).
      - [src/commands/general/dev-slist.js](./src/commands/general/dev-slist.js): `/dev-slist` — Lists all guilds the bot is currently in (Developer Only).
      - [src/commands/general/healthz.js](./src/commands/general/healthz.js): `/healthz` — Displays bot status, connection states, and server resources (Developer Only).
      - [src/commands/general/invite-bd.js](./src/commands/general/invite-bd.js): `/invite-bd` — Generates a single-use invite to join a server the bot is in (Developer Only).
      - [src/commands/general/ncurrency.js](./src/commands/general/ncurrency.js): `/ncurrency` — Set this server's nation currency config (Admin Only).
      - [src/commands/general/notifyiic.js](./src/commands/general/notifyiic.js): `/notifyiic` — Subscribe to item stock notifications in a specific channel.
      - [src/commands/general/ping.js](./src/commands/general/ping.js): Ping/latency check.
      - [src/commands/general/stats-dev.js](./src/commands/general/stats-dev.js): `/stats-dev` — Displays command execution telemetry and active servers count (Developer Only).
      - [src/commands/general/test.js](./src/commands/general/test.js): `/test` — Runs Bot integration and connection test suites from Discord (Developer Only).
  - 📂 **src/icons/**: Cache directory containing block and item texture PNG images downloaded from mcasset.cloud.
  - 📂 **src/db/**: Database schema definitions.
  - [src/db/schema.js](./src/db/schema.js): Drizzle ORM model schemas for MySQL databases.
  - [src/db/redisSchema.js](./src/db/redisSchema.js): Schema models and repositories mapping for Redis-OM.
  - 📂 **src/events/**: Discord event handlers.
  - [src/events/ready.js](./src/events/ready.js): Triggered on client login success.
  - [src/events/interactionCreate.js](./src/events/interactionCreate.js): Command execution event router.
  - [src/events/guildMemberAdd.js](./src/events/guildMemberAdd.js): Automatically runs and posts the Canvas-rendered welcome card when a user joins the server.
- 📂 **src/handlers/**: Dynamic modules loaders.
  - [src/handlers/commandHandler.js](./src/handlers/commandHandler.js): Registers and maps command files category-wise.
  - [src/handlers/eventHandler.js](./src/handlers/eventHandler.js): Imports and registers bot listeners dynamically.
- 📂 **src/services/**: Background synchronization services.
  - [src/services/convoySync.js](./src/services/convoySync.js): Synchronization worker to fetch and track convoy shop items.
  - [src/services/currencySync.js](./src/services/currencySync.js): Synchronization worker to fetch, track, and cache currencies.
- 📂 **src/utils/**: Helper modules.
  - [src/utils/apiClient.js](./src/utils/apiClient.js): Axios HTTP wrapper configured for ArcadiaMC.
  - [src/utils/blacklistHelper.js](./src/utils/blacklistHelper.js): Manages blacklist checks, cache syncing, and database integrations.
  - [src/utils/canvasHelper.js](./src/utils/canvasHelper.js): Renders premium welcome cards using `@napi-rs/canvas`.
  - [src/utils/db.js](./src/utils/db.js): Drizzle ORM database instance client.
  - [src/utils/embedHelper.js](./src/utils/embedHelper.js): Central helper module to build styled, uniform Discord embeds.
  - [src/utils/errorHandler.js](./src/utils/errorHandler.js): Exception wrapper to prevent process crashes and route alerts.
  - [src/utils/iconDownloader.js](./src/utils/iconDownloader.js): Downloads missing block and item icons from assets.mcasset.cloud.
  - [src/utils/logger.js](./src/utils/logger.js): Winston/Picocolors logger.
  - [src/utils/redis.js](./src/utils/redis.js): Connection client for Redis cache operations.
  - [src/utils/redisOm.js](./src/utils/redisOm.js): Redis-OM client wrapper initialization.
- 📂 **tests/**: Codebase testing suite and validation tools.
  - [tests/runner.js](./tests/runner.js): Master test runner executing all suites sequentially.
  - [tests/blacklist.test.js](./tests/blacklist.test.js): Integration tests for blacklist helper methods and caching.
  - [tests/env.test.js](./tests/env.test.js): Health check test for configuration, database connection pools, and Redis pings.
  - [tests/notify.test.js](./tests/notify.test.js): Integration tests for item stock notifications table mapping.
  - [tests/api.test.js](./tests/api.test.js): Connection verification and response validation test for the ArcadiaMC API endpoints.
  - [tests/database.test.js](./tests/database.test.js): Direct query health validation for Drizzle ORM and MySQL tables.
