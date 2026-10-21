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
├── changelogs/
│   ├── 06-2026.md
│   ├── 07-2026.md
│   ├── 08-2026.md
│   ├── 09-2026.md
│   └── 10-2026.md
├── dashboard/

│   ├── index.html
│   ├── prerender.mjs
│   ├── vite.config.mjs
│   ├── .env
│   ├── .env.example
│   ├── public/
│   │   ├── 403.html
│   │   ├── 404.html
│   │   ├── 500.html
│   │   ├── 502.html
│   │   └── 503.html
│   └── src/
│       ├── App.vue
│       ├── main.js
│       ├── router.js
│       ├── style.css
│       ├── components/
│       │   ├── ConvoyStock.vue
│       │   ├── EventsWarsMonitor.vue
│       │   ├── ExchangeCalculator.vue
│       │   ├── HistoryChart.vue
│       │   ├── MaintenanceView.vue
│       │   ├── MarketMonitor.vue
│       │   ├── PlayerMonitor.vue
│       │   ├── ShopsMonitor.vue
│       │   └── TownyMonitor.vue
│       └── stores/
│           ├── convoyStore.js
│           ├── eventsWarsStore.js
│           ├── marketStore.js
│           ├── playersStore.js
│           ├── shopsStore.js
│           └── townyStore.js
├── scripts/
│   ├── setup.js
│   ├── migrate-safe.js
│   ├── export-wiki-table.js
│   ├── upload-emojis.js
│   ├── scan-endpoints-fast.js
│   └── sync-missing-shop-icons.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── deploy-commands.js
│   ├── commands/
│   │   └── general/
│   │       ├── al-nadd.js
│   │       ├── al-nrm.js
│   │       ├── al-seatcalc.js
│   │       ├── al-setseat.js
│   │       ├── blacklist.js
│   │       ├── broadcast.js
│   │       ├── cc.js
│   │       ├── ccompare.js
│   │       ├── ccl.js
│   │       ├── ccr.js
│   │       ├── dashboard.js
│   │       ├── chistory.js
│   │       ├── cis-info.js
│   │       ├── cstats.js
│   │       ├── cstock.js
│   │       ├── currencies.js
│   │       ├── dealfinder.js
│   │       ├── devconfig.js
│   │       ├── dev-logs.js
│   │       ├── dev-slist.js
│   │       ├── enotify.js
│   │       ├── events.js
│   │       ├── exchange.js
│   │       ├── feedback.js
│   │       ├── forcesync.js
│   │       ├── healthz.js
│   │       ├── help.js
│   │       ├── invite.js
│   │       ├── invite-bd.js
│   │       ├── maintenance.js
│   │       ├── ncurrency.js
│   │       ├── notifyiic.js
│   │       ├── pemoji.js
│   │       ├── ping.js
│   │       ├── players.js
│   │       ├── pokemon.js
│   │       ├── shops.js
│   │       ├── stats-dev.js
│   │       ├── suggest.js
│   │       ├── test.js
│   │       ├── towny.js
│   │       └── wars.js
│   ├── heads/
│   ├── icons/
│   ├── db/
│   │   ├── schema.js
│   │   └── redisSchema.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   ├── ready.js
│   │   └── serverjoinlog.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── middleware/
│   │   ├── cache.js
│   │   ├── errorHandler.js
│   │   ├── hostRouter.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── assetRoutes.js
│   │   ├── currencyRoutes.js
│   │   ├── devRoutes.js
│   │   ├── eventsRoutes.js
│   │   ├── index.js
│   │   ├── playersRoutes.js
│   │   ├── shopsRoutes.js
│   │   ├── townyRoutes.js
│   │   └── warsRoutes.js
│   ├── services/
│   │   ├── convoySync.js
│   │   ├── currencySync.js
│   │   ├── emptyEndpointsSync.js
│   │   ├── endpointScanner.js
│   │   ├── headManager.js
│   │   ├── playerSync.js
│   │   ├── shopsSync.js
│   │   └── townySync.js
│   ├── ws/
│   │   └── websocketServer.js
│   └── utils/
│       ├── alAuthHelper.js
│       ├── apiClient.js
│       ├── blacklistHelper.js
│       ├── canvasGraph.js
│       ├── db.js
│       ├── devConfigHelper.js
│       ├── discordNavHelper.js
│       ├── discordNavRouter.js
│       ├── discordNavState.js
│       ├── emojiCache.js
│       ├── embedHelper.js
│       ├── emitter.js
│       ├── errorHandler.js
│       ├── guildConfigHelper.js
│       ├── guildOptionsHelper.js
│       ├── iconDownloader.js
│       ├── logBuffer.js
│       ├── logger.js
│       ├── maintenanceHelper.js
│       ├── minecraftWordlist.js
│       ├── pokemonHelper.js
│       ├── redis.js
│       ├── redisOm.js
│       └── telemetry.js
├── tests/
│   ├── setup.js
│   ├── blacklist.test.js
│   ├── embedHelper.test.js
│   ├── endpointScanner.test.js
│   ├── env.test.js
│   ├── heads.test.js
│   ├── maintenance.test.js
│   ├── api.test.js
│   ├── database.test.js
│   ├── notify.test.js
│   ├── options.test.js
│   ├── redis.test.js
│   └── telemetry.test.js

│   ├── shops.test.js
│   ├── sql.test.js
│   ├── suggestFeedback.test.js
│   └── towny.test.js
├── .env
├── .env.example
├── .dockerignore
├── .gitignore
├── .nvmrc
├── .node-version
├── Dockerfile
├── drizzle.config.js
├── eslint.config.js
├── architecture.md
├── Api.enpoints.md
├── fs.md
├── GEMINI.md
├── .agents/AGENTS.md
└── wiki_table.md
```

## Directory & File Details

### 📂 Root Directory

- [bot.js](./bot.js): Main application entry point. Loads configuration, starts the logger, initializes DB/Redis clients, and boots up the Discord client.
- [architecture.md](./architecture.md): Complete Mermaid system architecture diagram and component overview.
- [drizzle.config.js](./drizzle.config.js): Database configurations mapping Drizzle schema generation to the MySQL server environment.
- [eslint.config.js](./eslint.config.js): ESLint static analysis configuration provided by the user.
- [vitest.config.js](./vitest.config.js): Vitest compiler and runner configuration options for executing sequentially.
- [.prettierrc](./.prettierrc): Settings for the Prettier formatter.
- [package.json](./package.json): Workspace script targets (`npm start`, `npm run dev`, `npm run deploy`, `npm run lint`, etc.) and dependencies listing.
- [.env.example](./.env.example): Template configuration containing environment variable keys.
- [.dockerignore](./.dockerignore): Excludes non-essential files (node_modules, tests, docs, logs, git) from Docker build context.
- [.nvmrc](./.nvmrc): Specifies Node.js version 24 for Node Version Manager.
- [.node-version](./.node-version): Specifies Node.js version 24 for tools like fnm, asdf, and mise.
- [Dockerfile](./Dockerfile): Multi-stage production Docker image — installs only production deps in a slim Node 24 base with a non-root user.
- [Api.enpoints.md](./Api.enpoints.md): API endpoint mapping documentation for the ArcadiaMC server.
- [fs.md](./fs.md): _(This file)_ File system reference guide.
- [GEMINI.md](./GEMINI.md): Development rule book, project context, and daily change-log repository.
- [.agents/AGENTS.md](./.agents/AGENTS.md): Project-scoped customization rules for Antigravity developer agent.
- [wiki_table.md](./wiki_table.md): Exported MediaWiki format table containing convoy items.

### 📂 .github/

- [.github/gitlab-sync.yml](./.github/gitlab-sync.yml): Mirror synchronization workflow for GitLab.
- [.github/workflows/deploy.yml](./.github/workflows/deploy.yml): CI/CD deployment pipeline for building and publishing Docker image to GHCR, connecting to server via SSH, deploying with secrets/vars, and pruning unused images.

### 📂 changelogs/

- [changelogs/06-2026.md](./changelogs/06-2026.md): Monthly change log for June 2026 covering initial bot setup, Drizzle ORM, Redis-OM, convoy sync, canvas cards, and custom cyber logger.
- [changelogs/07-2026.md](./changelogs/07-2026.md): Monthly change log for July 2026 covering `/cis-info`, emoji uploader, blacklist system, stock notifications (`notifyiic`), currencies sync, `/exchange`, and web dashboard initialization.
- [changelogs/08-2026.md](./changelogs/08-2026.md): Monthly change log for August 2026 covering testing suites, player heads manager, Towny synchronization, Player Shops monitor, interactive charts, and DoS security shields.
- [changelogs/09-2026.md](./changelogs/09-2026.md): Monthly change log for September 2026 covering Al-Sam governance commands, developer config management, suggestion/feedback submission streaming, and ESLint flat config tuning.
- [changelogs/10-2026.md](./changelogs/10-2026.md): Monthly change log for October 2026 covering Node 24 runtime migration, security patching, `/towny compare` fixes, database checker suites, navigation breadcrumbs, and developer telemetry & logging architecture.

### 📂 scripts/

- [scripts/setup.js](./scripts/setup.js): Assistant script to bootstrap directories and setup the `.env` template config.
- [scripts/migrate-safe.js](./scripts/migrate-safe.js): Programmatic schema migrator for Drizzle ORM.
- [scripts/export-wiki-table.js](./scripts/export-wiki-table.js): Utility script to fetch and export all convoy items to a MediaWiki-formatted table in a markdown file.
- [scripts/upload-emojis.js](./scripts/upload-emojis.js): Utility script to upload cached item icon PNGs to Discord Application Emojis.
- [scripts/scan-endpoints-fast.js](./scripts/scan-endpoints-fast.js): Fast standalone scanner script probing 5,000 candidate API endpoints concurrently over ~5 minutes.
- [scripts/sync-missing-shop-icons.js](./scripts/sync-missing-shop-icons.js): Script to dynamically identify active player shop trade items, download any missing textures from Mojang/mcasset APIs, and upload them to Discord.

### 📂 dashboard/

- [dashboard/index.html](./dashboard/index.html): Web entrypoint template for mounting the dashboard.
- [dashboard/vite.config.mjs](./dashboard/vite.config.mjs): Vite compilation config with proxy endpoints.
- [dashboard/.env.example](./dashboard/.env.example): Frontend environment configuration template containing `VITE_API_URL`.
- 📂 **dashboard/public/**: Static public assets and custom gitignored HTML error pages.
  - [dashboard/public/403.html](./dashboard/public/403.html): Custom Access Forbidden (403) error page.
  - [dashboard/public/404.html](./dashboard/public/404.html): Custom Page Not Found (404) error page.
  - [dashboard/public/500.html](./dashboard/public/500.html): Custom Internal Server Error (500) page.
  - [dashboard/public/502.html](./dashboard/public/502.html): Custom Bad Gateway (502) error page.
  - [dashboard/public/503.html](./dashboard/public/503.html): Custom Service Unavailable/Maintenance (503) error page.
- 📂 **dashboard/src/**: Frontend Vue codebases.
  - [dashboard/src/App.vue](./dashboard/src/App.vue): Main dashboard component containing Watchlist, Metrics filters, and tab layouts.
  - [dashboard/src/main.js](./dashboard/src/main.js): Vue bootstrap file registering FontAwesome icons.
  - [dashboard/src/style.css](./dashboard/src/style.css): Links Tailwind CSS v4 imports.
  - 📂 **dashboard/src/components/**:
    - [dashboard/src/components/ConvoyStock.vue](./dashboard/src/components/ConvoyStock.vue): Convoy Shop monitor with segmented **Convoy Live** / **All Items** view toggle, rarity-grouped card sections, and TransitionGroup animations.
    - [dashboard/src/components/ExchangeCalculator.vue](./dashboard/src/components/ExchangeCalculator.vue): Conversion widget to calculate rates between nation currencies.
    - [dashboard/src/components/HistoryChart.vue](./dashboard/src/components/HistoryChart.vue): Comparison Line chart graphing historical rates over 7-120 days.
    - [dashboard/src/components/MaintenanceView.vue](./dashboard/src/components/MaintenanceView.vue): Real-time maintenance and infrastructure health monitor displaying active reasons, status badges, operational services grid, and developer access unlock gateway.
    - [dashboard/src/components/MarketMonitor.vue](./dashboard/src/components/MarketMonitor.vue): Unified market table view displaying pinned favorites and category filters.
    - [dashboard/src/components/ShopsMonitor.vue](./dashboard/src/components/ShopsMonitor.vue): Player Shops directory with searching, item filtering, coordinates copy tool, and detail modal.
    - [dashboard/src/components/TownyMonitor.vue](./dashboard/src/components/TownyMonitor.vue): Towny monitor displaying overview counts, towns, and nations with detail modals.
  - 📂 **dashboard/src/stores/**: Pinia global state management stores.
    - [dashboard/src/stores/convoyStore.js](./dashboard/src/stores/convoyStore.js): Manages convoy shop stock trades, search queries, and filters.
    - [dashboard/src/stores/marketStore.js](./dashboard/src/stores/marketStore.js): Manages active nation currencies stats, loading states, and API fetching.
    - [dashboard/src/stores/shopsStore.js](./dashboard/src/stores/shopsStore.js): Manages player shop directories, categorization filters, and modal details.
    - [dashboard/src/stores/townyStore.js](./dashboard/src/stores/townyStore.js): Manages Towny nations/towns datasets, search parameters, and modal details.

### 📂 src/

- [src/app.js](./src/app.js): Express application factory configuring compression, Helmet, CORS, body parsers, rate limiting, domain routing, and error handlers.
- [src/server.js](./src/server.js): HTTP server entry point initializing network timeouts and binding the real-time WebSocket server.
- [src/deploy-commands.js](./src/deploy-commands.js): Slash Command deployment script utilizing the Discord REST API.
  - 📂 **src/commands/**: Contains category subfolders containing Discord Slash Commands.
    - 📂 **src/commands/general/**:
      - [src/commands/general/al-nadd.js](./src/commands/general/al-nadd.js): `/al-nadd` — Add a nation to the Al-Sam database list with autocomplete (Developer Only).
      - [src/commands/general/al-nrm.js](./src/commands/general/al-nrm.js): `/al-nrm` — Remove a nation from the Al-Sam database list with autocomplete (Developer Only).
      - [src/commands/general/al-seatcalc.js](./src/commands/general/al-seatcalc.js): `/al-seatcalc` — Calculate representative seat allocations (Mukhtarun) for Al-Sam nations (Developer Only).
      - [src/commands/general/al-setseat.js](./src/commands/general/al-setseat.js): `/al-setseat` — Set the number of seats for Al-Sam in the `weby_custom` database table (Developer Only).
      - [src/commands/general/blacklist.js](./src/commands/general/blacklist.js): `/blacklist` — Manage user blacklist add, remove, and list (Developer Only).
      - [src/commands/general/broadcast.js](./src/commands/general/broadcast.js): `/broadcast` — Broadcast an announcement embed to all servers (Developer Only).
      - [src/commands/general/cc.js](./src/commands/general/cc.js): `/cc` — Configure/Enable custom commands or events for a specific server (Developer Only).
      - [src/commands/general/ccompare.js](./src/commands/general/ccompare.js): `/ccompare` — Compare the exchange rates of two nation currencies side-by-side with a graph.
      - [src/commands/general/ccl.js](./src/commands/general/ccl.js): `/ccl` — List all guilds the bot is in along with their enabled options (Developer Only).
      - [src/commands/general/ccr.js](./src/commands/general/ccr.js): `/ccr` — Remove/Disable custom commands or events for a specific server (Developer Only).
      - [src/commands/general/dashboard.js](./src/commands/general/dashboard.js): `/dashboard` — Returns direct link to the web stats panel.
      - [src/commands/general/chistory.js](./src/commands/general/chistory.js): `/chistory` — View historical price charts and trend sparklines for nation currencies with raw/percentage mode.
      - [src/commands/general/cis-info.js](./src/commands/general/cis-info.js): `/cis-info` — Displays historical, rarity, and frequency telemetry for convoy items.
      - [src/commands/general/cstats.js](./src/commands/general/cstats.js): `/cstats` — View currency market health metrics and performers ranking.
      - [src/commands/general/cstock.js](./src/commands/general/cstock.js): `/cstock` — Displays current Convoy shop stock grouped by rarity.
      - [src/commands/general/currencies.js](./src/commands/general/currencies.js): `/currencies` — Displays active list of nation currencies and their rates.
      - [src/commands/general/dealfinder.js](./src/commands/general/dealfinder.js): `/dealfinder` — Calculates instant arbitrage profit deals between Player Shops and Convoy Shop.
      - [src/commands/general/exchange.js](./src/commands/general/exchange.js): `/exchange` — Calculates conversions and exchange rates between nation currencies.
      - [src/commands/general/forcesync.js](./src/commands/general/forcesync.js): `/forcesync` — Forces manual convoy data synchronization from the API (Developer Only).
      - [src/commands/general/dev-logs.js](./src/commands/general/dev-logs.js): `/dev-logs` — Displays formatted application and system logs with level filters, search, and stats (Developer Only).
      - [src/commands/general/dev-slist.js](./src/commands/general/dev-slist.js): `/dev-slist` — Displays paginated active server roster with network statistics and deep server metadata inspection (Developer Only).
      - [src/commands/general/devconfig.js](./src/commands/general/devconfig.js): `/devconfig` — Configure dynamic bot features, output channels, and parameters (Developer Only).

      - [src/commands/general/exchange.js](./src/commands/general/exchange.js): `/exchange` — Convert amounts between any two nation currencies or base ARC.
      - [src/commands/general/feedback.js](./src/commands/general/feedback.js): `/feedback` — Submit feedback or reviews about the bot to developers.
      - [src/commands/general/forcesync.js](./src/commands/general/forcesync.js): `/forcesync` — Manually trigger convoy stock synchronization (Developer Only).
      - [src/commands/general/healthz.js](./src/commands/general/healthz.js): `/healthz` — System health check showing bot uptime, RAM allocation, OS details, and connection states (Developer Only).
      - [src/commands/general/help.js](./src/commands/general/help.js): `/help` — Categorized command directory list and detailed usage instructions.
      - [src/commands/general/invite.js](./src/commands/general/invite.js): `/invite` — Get official Discord invite link to add bot to server.
      - [src/commands/general/invite-bd.js](./src/commands/general/invite-bd.js): `/invite-bd` — Generates a single-use invite to join a server the bot is in (Developer Only).
      - [src/commands/general/maintenance.js](./src/commands/general/maintenance.js): `/maintenance` — Toggle system maintenance mode on/off with optional reason (Developer Only).
      - [src/commands/general/ncurrency.js](./src/commands/general/ncurrency.js): `/ncurrency` — Set this server's nation currency config (Admin Only).
      - [src/commands/general/notifyiic.js](./src/commands/general/notifyiic.js): `/notifyiic` — Subscribe to item stock notifications in a specific channel.
      - [src/commands/general/pemoji.js](./src/commands/general/pemoji.js): `/pemoji` — Download a Minecraft player skin render and upload it as a server emoji.
      - [src/commands/general/ping.js](./src/commands/general/ping.js): Ping/latency check.
      - [src/commands/general/pokemon.js](./src/commands/general/pokemon.js): `/pokemon` — Master Pokémon command for capture, list, summon, release, transfer ownership, captive fightback breakout, and opt-in/opt-out configuration subcommands (CC).
      - [src/commands/general/shops.js](./src/commands/general/shops.js): `/shops` — List player shops, view shop listings/coordinates, and search for active item offers.
      - [src/commands/general/stats-dev.js](./src/commands/general/stats-dev.js): `/stats-dev` — Displays command execution telemetry and active servers count (Developer Only).
      - [src/commands/general/suggest.js](./src/commands/general/suggest.js): `/suggest` — Submit feature suggestions for the bot to developers.
      - [src/commands/general/test.js](./src/commands/general/test.js): `/test` — Runs Bot integration and connection test suites from Discord (Developer Only).
      - [src/commands/general/towny.js](./src/commands/general/towny.js): `/towny` — Displays Towny stats, town info, and nation info with autocomplete.
  - 📂 **src/icons/**: Cache directory containing block and item texture PNG images downloaded from mcasset.cloud.
  - 📂 **src/heads/**: Cache directory containing player head skin avatars downloaded from minotar.net.
  - 📂 **src/db/**: Database schema definitions.
  - [src/db/schema.js](./src/db/schema.js): Drizzle ORM model schemas for MySQL databases.
  - [src/db/redisSchema.js](./src/db/redisSchema.js): Schema models and repositories mapping for Redis-OM.
  - 📂 **src/events/**: Discord event handlers.
  - [src/events/ready.js](./src/events/ready.js): Triggered on client login success.
  - [src/events/interactionCreate.js](./src/events/interactionCreate.js): Command execution event router and activity tracking.
  - [src/events/messageCreate.js](./src/events/messageCreate.js): Tracks recent user message activity for Pokémon capture validity.
  - [src/events/serverjoinlog.js](./src/events/serverjoinlog.js): Logs new guild join occurrences to developer channels.
- 📂 **src/handlers/**: Dynamic modules loaders.
  - [src/handlers/commandHandler.js](./src/handlers/commandHandler.js): Registers and maps command files category-wise.
  - [src/handlers/eventHandler.js](./src/handlers/eventHandler.js): Imports and registers bot listeners dynamically.
- 📂 **src/middleware/**: Express middleware functions for caching, rate limiting, and domain routing.
  - [src/middleware/cache.js](./src/middleware/cache.js): In-memory Redis cache and client Cache-Control header middleware (`cacheEndpoint`).
  - [src/middleware/errorHandler.js](./src/middleware/errorHandler.js): Global Express error handling middleware.
  - [src/middleware/hostRouter.js](./src/middleware/hostRouter.js): Conditional hostname routing discriminating between web dashboard SPA and API requests.
  - [src/middleware/rateLimiter.js](./src/middleware/rateLimiter.js): IP and device fingerprint rate limiting with DDoS slow-down tarpitting.
- 📂 **src/routes/**: Modular Express route handlers.
  - [src/routes/index.js](./src/routes/index.js): Main API router aggregating and mounting modular route handlers.
  - [src/routes/assetRoutes.js](./src/routes/assetRoutes.js): Player avatar head streaming proxy and static shop item icon serving.
  - [src/routes/currencyRoutes.js](./src/routes/currencyRoutes.js): Active nation currency listings, convoy trades, price history, and market stability stats.
  - [src/routes/devRoutes.js](./src/routes/devRoutes.js): Developer telemetry and administration routes for telemetry snapshots, log querying, web client telemetry ingestion, and Redis cache clearing.
  - [src/routes/eventsRoutes.js](./src/routes/eventsRoutes.js): Real-time server events and historical `s_events` logs.
  - [src/routes/playersRoutes.js](./src/routes/playersRoutes.js): Cached online player lists and player profile lookups.
  - [src/routes/shopsRoutes.js](./src/routes/shopsRoutes.js): Player shops catalog with cached Mojang UUID username resolutions.
  - [src/routes/townyRoutes.js](./src/routes/townyRoutes.js): Real-time Towny data and historical resident/chunk logs.
  - [src/routes/warsRoutes.js](./src/routes/warsRoutes.js): Live telemetry on server war status and military sieges.
- 📂 **src/ws/**: Real-time WebSocket server handling.
  - [src/ws/websocketServer.js](./src/ws/websocketServer.js): WebSocket server managing client subscriptions, 5-second telemetry broadcasts, and currency sync broadcasts.
- 📂 **src/services/**: Background synchronization services.
  - [src/services/convoySync.js](./src/services/convoySync.js): Synchronization worker to fetch and track convoy shop items.
  - [src/services/currencySync.js](./src/services/currencySync.js): Synchronization worker to fetch, track, and cache currencies.
  - [src/services/emptyEndpointsSync.js](./src/services/emptyEndpointsSync.js): Synchronization worker scanning `/api/events` and `/api/wars`, persisting event logs to `s_events` table (max 200 items, 3-month retention), and dispatching syslog notifications.
  - [src/services/endpointScanner.js](./src/services/endpointScanner.js): Background worker executing a slow 32-hour scan of 10,000 candidate endpoints every 3 days, saving discovered endpoints to `api_endpoints` table.
  - [src/services/headManager.js](./src/services/headManager.js): Backend manager controlling local serving, cache downloads, and 7-day batch sync checks of player head images.
  - [src/services/shopsSync.js](./src/services/shopsSync.js): Synchronization worker to fetch, resolve, and cache player shops in MySQL and Redis.
  - [src/services/townySync.js](./src/services/townySync.js): Synchronization worker to fetch, cache, and record daily historical snapshots of town/nation residents & claims.
- 📂 **src/utils/**: Helper modules.
  - [src/utils/alAuthHelper.js](./src/utils/alAuthHelper.js): Authorization helper managing role locks (`al-rolelock` in `weby_custom`) and developer bypasses for Al-* commands.
  - [src/utils/apiClient.js](./src/utils/apiClient.js): Axios HTTP wrapper configured for ArcadiaMC.
  - [src/utils/blacklistHelper.js](./src/utils/blacklistHelper.js): Manages blacklist checks, cache syncing, and database integrations.
  - [src/utils/canvasGraph.js](./src/utils/canvasGraph.js): Generates high-quality bar and line charts using @napi-rs/canvas.
  - [src/utils/db.js](./src/utils/db.js): Drizzle ORM database instance client.
  - [src/utils/devConfigHelper.js](./src/utils/devConfigHelper.js): Manages memory caching and persistence for developer configurations (`webyCustom`).
  - [src/utils/discordNavHelper.js](./src/utils/discordNavHelper.js): Helper module constructing Discord ActionRow navigation button rows with web dashboard deep links.
  - [src/utils/discordNavRouter.js](./src/utils/discordNavRouter.js): Navigation router module fetching telemetry and rendering interactive embeds for Town, Nation, Player, and Shop navigation buttons.
  - [src/utils/discordNavState.js](./src/utils/discordNavState.js): In-memory LRU cache session and stack manager for breadcrumb button navigation history and command invoker ownership validation.
  - [src/utils/emojiCache.js](./src/utils/emojiCache.js): Manages in-memory caching of application custom emojis.
  - [src/utils/embedHelper.js](./src/utils/embedHelper.js): Central helper module to build styled, uniform Discord embeds.
  - [src/utils/emitter.js](./src/utils/emitter.js): Central EventEmitter instance for cross-module real-time communications.
  - [src/utils/errorHandler.js](./src/utils/errorHandler.js): Exception wrapper to prevent process crashes and route alerts.
  - [src/utils/guildConfigHelper.js](./src/utils/guildConfigHelper.js): Manages memory caching of guild nation currency configurations.
  - [src/utils/guildOptionsHelper.js](./src/utils/guildOptionsHelper.js): Manages memory caching and DB state of guild custom command/event configurations.
  - [src/utils/iconDownloader.js](./src/utils/iconDownloader.js): Downloads missing block and item icons from assets.mcasset.cloud.
  - [src/utils/logBuffer.js](./src/utils/logBuffer.js): In-memory circular buffer and Redis list logger buffering structured log objects with search and level queries.
  - [src/utils/logger.js](./src/utils/logger.js): Winston/Picocolors logger integrated with logBuffer.
  - [src/utils/maintenanceHelper.js](./src/utils/maintenanceHelper.js): Central maintenance mode manager, state persistence (Redis + MySQL), dev verification, Express middleware, and 403 HTML generator.
  - [src/utils/minecraftWordlist.js](./src/utils/minecraftWordlist.js): Generates ~10,000 Minecraft and server-related endpoint candidate paths.
  - [src/utils/pokemonHelper.js](./src/utils/pokemonHelper.js): Central helper module for Pokémon mini-game managing encounters, interactive fight-back refusal battles, summon embeds with user pfp, release workflows, ownership transfers, captive breakout battles, party listings, opt-in/opt-out preferences, channel fight-back permissions validation, and user resolution.
  - [src/utils/redis.js](./src/utils/redis.js): Connection client for Redis cache operations.
  - [src/utils/redisOm.js](./src/utils/redisOm.js): Redis-OM client wrapper initialization.
  - [src/utils/telemetry.js](./src/utils/telemetry.js): Central performance & telemetry manager tracking system resources (CPU, RAM, Event Loop), Discord bot metrics, command latencies, sync workers, HTTP API, and web frontend telemetry.
  - [src/utils/townOwnerManager.js](./src/utils/townOwnerManager.js): Manages town owner preservation across ruined states, preventing overwrite by fake NPC player names (NPCX), caching owners in Redis/MySQL, and enriching Towny data.
- 📂 **tests/**: Codebase testing suite and validation tools.
  - [tests/setup.js](./tests/setup.js): Global Vitest setup configuring log levels during execution.
  - [tests/alAuth.test.js](./tests/alAuth.test.js): Integration tests for Al-Sam role-lock authorization and developer bypasses.
  - [tests/blacklist.test.js](./tests/blacklist.test.js): Integration tests for blacklist helper methods and caching.
  - [tests/devConfig.test.js](./tests/devConfig.test.js): Unit and integration tests for devConfigHelper key matching, aliases, and channel getters.
  - [tests/embedHelper.test.js](./tests/embedHelper.test.js): Unit tests for central Discord embed rendering helpers.
  - [tests/env.test.js](./tests/env.test.js): Health check test for configuration, database connection pools, and Redis pings.
  - [tests/heads.test.js](./tests/heads.test.js): Integration tests for player heads downloading, caching and cron updates.
  - [tests/maintenance.test.js](./tests/maintenance.test.js): Unit and integration tests for maintenanceHelper state toggling, dev authentication, and Express 403 middleware.
  - [tests/notify.test.js](./tests/notify.test.js): Integration tests for item stock notifications table mapping.
  - [tests/options.test.js](./tests/options.test.js): Integration tests for guild custom options toggles and memory cache synchronization.
  - [tests/redis.test.js](./tests/redis.test.js): Redis database checker testing connection latency, String lifecycle (SET/GET/TTL/DEL), Hash operations, and MessagePack binary serialization.
  - [tests/shops.test.js](./tests/shops.test.js): Integration tests for player shops database query mappings, sync scheduler, and 25-minute TTL cache.
  - [tests/sql.test.js](./tests/sql.test.js): MySQL/Drizzle database checker testing pool initialization, ping latency, server metadata, and CRUD operations on internal table.
  - [tests/suggestFeedback.test.js](./tests/suggestFeedback.test.js): Unit tests for suggestion and feedback channel getters, automation fallbacks, and payload JSON formatting.
  - [tests/telemetry.test.js](./tests/telemetry.test.js): Unit tests for logBuffer operations, ANSI stripping, capacity shifting, and telemetry metrics calculation.
  - [tests/towny.test.js](./tests/towny.test.js): Integration tests for towny sync, history snapshots, and database mappings.
  - [tests/api.test.js](./tests/api.test.js): Connection verification and response validation test for the ArcadiaMC API endpoints.
  - [tests/database.test.js](./tests/database.test.js): Direct query health validation for Drizzle ORM and MySQL tables.
