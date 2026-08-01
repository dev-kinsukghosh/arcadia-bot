# Directory Mapping

This file serves as a reference guide for the directory structure and file responsibilities within the Arcadia Community Bot codebase.

## Codebase Tree Structure

```text
.
├── .agents/
│   └── AGENTS.md
├── .github/
│   ├── workflows/
│   │   └── deploy.yml
│   └── gitlab-sync.yml
├── dashboard/
│   ├── index.html
│   ├── vite.config.mjs
│   ├── .env
│   ├── .env.example
│   └── src/
│       ├── App.vue
│       ├── main.js
│       ├── style.css
│       └── components/
│           ├── ConvoyStock.vue
│           ├── ExchangeCalculator.vue
│           ├── HistoryChart.vue
│           ├── MarketMonitor.vue
│           └── TownyMonitor.vue
├── scripts/
│   ├── setup.js
│   ├── migrate-safe.js
│   ├── export-wiki-table.js
│   └── upload-emojis.js
├── src/
│   ├── server.js
│   ├── deploy-commands.js
│   ├── commands/
│   │   └── general/
│   │       ├── blacklist.js
│   │       ├── chistory.js
│   │       ├── cis-info.js
│   │       ├── cstats.js
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
│   │       ├── test.js
│   │       └── towny.js
│   ├── heads/
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
│   │   ├── currencySync.js
│   │   └── headManager.js
│   └── utils/
│       ├── apiClient.js
│       ├── blacklistHelper.js
│       ├── db.js
│       ├── embedHelper.js
│       ├── emitter.js
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
├── .dockerignore
├── .gitignore
├── Dockerfile
├── drizzle.config.js
├── eslint.config.js
├── .prettierrc
├── package.json
└── wiki_table.md
```

## Directory & File Details

### 📂 Root Directory

- [bot.js](./bot.js): Main application entry point. Loads configuration, starts the logger, initializes DB/Redis clients, and boots up the Discord client.
- [drizzle.config.js](./drizzle.config.js): Database configurations mapping Drizzle schema generation to the MySQL server environment.
- [eslint.config.js](./eslint.config.js): ESLint static analysis configuration provided by the user.
- [.prettierrc](./.prettierrc): Settings for the Prettier formatter.
- [package.json](./package.json): Workspace script targets (`npm start`, `npm run dev`, `npm run deploy`, `npm run lint`, etc.) and dependencies listing.
- [.env.example](./.env.example): Template configuration containing environment variable keys.
- [.dockerignore](./.dockerignore): Excludes non-essential files (node_modules, tests, docs, logs, git) from Docker build context.
- [Dockerfile](./Dockerfile): Multi-stage production Docker image — installs only production deps in a slim Node 22 base with a non-root user.
- [Api.enpoints.md](./Api.enpoints.md): API endpoint mapping documentation for the ArcadiaMC server.
- [fs.md](./fs.md): _(This file)_ File system reference guide.
- [GEMINI.md](./GEMINI.md): Development rule book, project context, and daily change-log repository.
- [.agents/AGENTS.md](./.agents/AGENTS.md): Project-scoped customization rules for Antigravity developer agent.
- [wiki_table.md](./wiki_table.md): Exported MediaWiki format table containing convoy items.

### 📂 .github/

- [.github/gitlab-sync.yml](./.github/gitlab-sync.yml): Mirror synchronization workflow for GitLab.
- [.github/workflows/deploy.yml](./.github/workflows/deploy.yml): CI/CD deployment pipeline for building and publishing Docker image to GHCR, connecting to server via SSH, deploying with secrets/vars, and pruning unused images.

### 📂 scripts/

- [scripts/setup.js](./scripts/setup.js): Assistant script to bootstrap directories and setup the `.env` template config.
- [scripts/migrate-safe.js](./scripts/migrate-safe.js): Programmatic schema migrator for Drizzle ORM.
- [scripts/export-wiki-table.js](./scripts/export-wiki-table.js): Utility script to fetch and export all convoy items to a MediaWiki-formatted table in a markdown file.
- [scripts/upload-emojis.js](./scripts/upload-emojis.js): Utility script to upload cached item icon PNGs to Discord Application Emojis.

### 📂 dashboard/

- [dashboard/index.html](./dashboard/index.html): Web entrypoint template for mounting the dashboard.
- [dashboard/vite.config.mjs](./dashboard/vite.config.mjs): Vite compilation config with proxy endpoints.
- [dashboard/.env.example](./dashboard/.env.example): Frontend environment configuration template containing `VITE_API_URL`.
- 📂 **dashboard/src/**: Frontend Vue codebases.
  - [dashboard/src/App.vue](./dashboard/src/App.vue): Main dashboard component containing Watchlist, Metrics filters, and tab layouts.
  - [dashboard/src/main.js](./dashboard/src/main.js): Vue bootstrap file registering FontAwesome icons.
  - [dashboard/src/style.css](./dashboard/src/style.css): Links Tailwind CSS v4 imports.
  - 📂 **dashboard/src/components/**:
    - [dashboard/src/components/ConvoyStock.vue](./dashboard/src/components/ConvoyStock.vue): Convoy Shop monitor with segmented **Convoy Live** / **All Items** view toggle, rarity-grouped card sections, and TransitionGroup animations.
    - [dashboard/src/components/ExchangeCalculator.vue](./dashboard/src/components/ExchangeCalculator.vue): Conversion widget to calculate rates between nation currencies.
    - [dashboard/src/components/HistoryChart.vue](./dashboard/src/components/HistoryChart.vue): Comparison Line chart graphing historical rates over 7-120 days.
    - [dashboard/src/components/MarketMonitor.vue](./dashboard/src/components/MarketMonitor.vue): Unified market table view displaying pinned favorites and category filters.
    - [dashboard/src/components/TownyMonitor.vue](./dashboard/src/components/TownyMonitor.vue): Towny monitor displaying overview counts, towns, and nations with detail modals.

### 📂 src/

- [src/server.js](./src/server.js): Express backend webserver managing API endpoints and DoS/DDoS security shields (fingerprints, connection limits).
- [src/deploy-commands.js](./src/deploy-commands.js): Slash Command deployment script utilizing the Discord REST API.
  - 📂 **src/commands/**: Contains category subfolders containing Discord Slash Commands.
    - 📂 **src/commands/general/**:
      - [src/commands/general/blacklist.js](./src/commands/general/blacklist.js): `/blacklist` — Manage user blacklist add, remove, and list (Developer Only).
      - [src/commands/general/chistory.js](./src/commands/general/chistory.js): `/chistory` — View historical price charts and trend sparklines for nation currencies with raw/percentage mode.
      - [src/commands/general/cis-info.js](./src/commands/general/cis-info.js): `/cis-info` — Displays historical, rarity, and frequency telemetry for convoy items.
      - [src/commands/general/cstats.js](./src/commands/general/cstats.js): `/cstats` — View currency market health metrics and performers ranking.
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
      - [src/commands/general/towny.js](./src/commands/general/towny.js): `/towny` — Displays Towny stats, town info, and nation info with autocomplete.
  - 📂 **src/icons/**: Cache directory containing block and item texture PNG images downloaded from mcasset.cloud.
  - 📂 **src/heads/**: Cache directory containing player head skin avatars downloaded from minotar.net.
  - 📂 **src/db/**: Database schema definitions.
  - [src/db/schema.js](./src/db/schema.js): Drizzle ORM model schemas for MySQL databases.
  - [src/db/redisSchema.js](./src/db/redisSchema.js): Schema models and repositories mapping for Redis-OM.
  - 📂 **src/events/**: Discord event handlers.
  - [src/events/ready.js](./src/events/ready.js): Triggered on client login success.
  - [src/events/interactionCreate.js](./src/events/interactionCreate.js): Command execution event router.
- 📂 **src/handlers/**: Dynamic modules loaders.
  - [src/handlers/commandHandler.js](./src/handlers/commandHandler.js): Registers and maps command files category-wise.
  - [src/handlers/eventHandler.js](./src/handlers/eventHandler.js): Imports and registers bot listeners dynamically.
- 📂 **src/services/**: Background synchronization services.
  - [src/services/convoySync.js](./src/services/convoySync.js): Synchronization worker to fetch and track convoy shop items.
  - [src/services/currencySync.js](./src/services/currencySync.js): Synchronization worker to fetch, track, and cache currencies.
  - [src/services/headManager.js](./src/services/headManager.js): Backend manager controlling local serving, cache downloads, and 7-day batch sync checks of player head images.
- 📂 **src/utils/**: Helper modules.
  - [src/utils/apiClient.js](./src/utils/apiClient.js): Axios HTTP wrapper configured for ArcadiaMC.
  - [src/utils/blacklistHelper.js](./src/utils/blacklistHelper.js): Manages blacklist checks, cache syncing, and database integrations.
  - [src/utils/db.js](./src/utils/db.js): Drizzle ORM database instance client.
  - [src/utils/embedHelper.js](./src/utils/embedHelper.js): Central helper module to build styled, uniform Discord embeds.
  - [src/utils/emitter.js](./src/utils/emitter.js): Central EventEmitter instance for cross-module real-time communications.
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
