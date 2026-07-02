# Project Context & Rules

This file documents the core project context, custom development rules defined by the user, and a log of updates for the **Arcadia Community Bot**.

---

## 📋 Project Context

- **Project Name**: Arcadia Community Bot
- **Purpose**: Discord bot for the ArcadiaMC server community.
- **Stack**:
  - **Runtime**: Node.js (CommonJS format)
  - **Discord Wrapper**: `discord.js` (v14)
  - **Database ORM**: Drizzle ORM (MySQL driver utilizing `mysql2` connection pools)
  - **Caching**: Redis client powered by `ioredis`
  - **HTTP Client**: `axios` for fetching ArcadiaMC APIs
  - **Graphics**: `@napi-rs/canvas` for premium glassmorphic Welcome Card image generation
  - **Logger**: Custom cyber-style logger powered by `dayjs`, `picocolors`, and `gradient-string`
  - **Linter & Formatter**: ESLint (v9 flat config) + Prettier

---

## ⚖️ Custom Developer Rules

The following rules MUST be followed at all times:

1. ⚠️ **Ask Before Installing**: Always consult the user and ask for explicit permission before running any package installs (`npm install` / `npm i`).
2. 💡 **Suggest Alternatives**: If a package or technical implementation is requested, suggest better/optimized alternatives if they exist.
3. 📝 **Directory Mapping (`fs.md`)**: Maintain [fs.md](./fs.md) up-to-date. Every time a new file is added, moved, or deleted, update the directory mapping.
4. 📄 **Chat Completion Updates**:
   - Update `fs.md` if any file structures changed.
   - Update `GEMINI.md` at the end of every chat session to document the latest changes.
5. 📂 **Exclusions**: Always ignore the `node_modules/` and `logs/` folders from documentation lookups and directories list references.
6. 🚫 **No Direct Ephemeral Options**: Never supply `ephemeral: true` directly in Discord interaction response options (deprecated). Always utilize `flags: MessageFlags.Ephemeral` instead.
7. 📂 **Relative Project Links**: Never use absolute Windows paths (e.g., `C:/...` or `file:///C:/...`) or `file:///src` link schemes in chat responses, logs, or documentation. Always refer to files using relative text paths (e.g. `src/commands/general/cis-info.js`) or simple code formatting (e.g. `cis-info.js`). When explaining file changes or structural additions, use a tree-like text structure to outline the directories, followed by a list of files with their descriptions next to them, avoiding any inline link syntax.
8. ⚠️ **Emoji URL Deprecation**: Never use `Emoji.url` (deprecated in Discord.js v14). Always utilize `Emoji.imageURL()` instead to prevent console deprecation warning logs.

---

## 🪵 Daily Change Log

### 28-06-2026

- **Initial Setup**:
  - Initialized package environment. Installed core dependencies (`discord.js`, `dotenv`, `axios`, `picocolors`, `@napi-rs/canvas`, `ioredis`, `mysql2`, `winston`) and devDependencies (`eslint`, `prettier`, `drizzle-kit`).
  - Created `bot.js` root entrypoint.
  - Added configuration manager, Axios API client wrapper for ArcadiaMC endpoints, Redis connection client, and Winston colored logger.
  - Created event handler/command loader systems.
- **Database (Drizzle Integration)**:
  - Added Drizzle ORM schema mappings inside `src/db/schema.js`.
  - Created a safe, programmatic schema migrator inside `scripts/migrate-safe.js`.
  - Updated database client to return Drizzle connections.
  - Configured `convoy_items` table schema mapping fields to the ArcadiaMC API properties.
  - Added `current_p` boolean column to track which items are currently in the shop.
- **Redis-OM Integration**:
  - Installed `redis-om` dependency for ORM-like object mapping wrapper in Redis.
  - Created `src/utils/redisOm.js` to initialize the client wrapper by wrapping the active ioredis connection pool.
  - Created a custom standard-hash repository wrapper inside `src/db/redisSchema.js` to bypass RediSearch server requirements (preventing `FT.SEARCH` command crashes).
  - Configured `bot.js` to load `redisOm.js` module automatically during startup.
- **Convoy Synchronization Worker**:
  - Created `src/services/convoySync.js` to handle fetching and tracking convoy shop items.
  - Configured price comparison logic to update `times_seen` (+1) only when price or rarity changes, and update only stock values if identical.
  - Scheduled the sync worker to execute immediately on bot startup and recur every 5 minutes.
  - Integrated the synchronization routine inside the `bot.js` startup lifecycle.
  - Configured indefinite auto-reconnection backoff retryStrategy for Redis to keep connections active and prevent packet drops.
  - Added an application-level ping heartbeat every 2 minutes to keep the Redis connection active and prevent server-side idle timeouts (ECONNRESET).
  - Programmed automated `current_p` status resets before each API scan to flag present items as `true` and missing items as `false` in both MySQL and Redis.
- **Minecraft Asset Icon Downloader**:
  - Created `src/utils/iconDownloader.js` to automatically download missing item/block texture icons from `assets.mcasset.cloud`.
  - Configured rate-limited download scheduling utilizing a 5-second queue delay to avoid rate-limits or server overhead.
  - Programmed a double-path lookup (tries block/ path first, falling back to item/ path on 404) and suffix variants (tries _top, _front, _side, _bottom, _empty suffixes) to support block, item, and double tall textures (e.g., peony_top).
  - Linked the icon check scan to execute automatically at the end of each convoy synchronization run.
- **Canvas Welcome Cards**:
  - Programmed custom canvas generator inside `src/utils/canvasHelper.js`.
  - Linked generator to the `guildMemberAdd` event handler and added a testing slash command `/welcome-test`.
- **Ready Event & Interaction Deprecation Resolutions**:
  - Renamed the `ready` event handler to `clientReady` inside `src/events/ready.js` to resolve the Discord.js v14 deprecation warning.
  - Replaced the deprecated `fetchReply` options property inside `src/commands/general/ping.js` with a separate `interaction.fetchReply()` call.
- **Custom Cyber Logger**:
  - Installed `dayjs` and `gradient-string` dependencies after getting user confirmation.
  - Configured the new cyber-style gradient logger inside `src/utils/logger.js`.
  - Dereferenced the `.default` property on the `gradient-string` CommonJS import to resolve type execution errors.
  - Updated API client logger calls in `src/utils/apiClient.js` to log requests under the new `.system()` logger level.
  - Added robust case-insensitive parsing and safety fallbacks for the `LOG_LEVEL` environment variable.
- **Global Error Handler**:
  - Created `src/utils/errorHandler.js` to catch global exceptions and promise rejections (preventing bot crashes) and dispatch alert embeds to a Discord channel.
  - Integrated `reportError` tracking into command execution, guild joins, and convoy synchronization workflows.
  - Replaced inline listeners in `bot.js` with the global error handler.
- **Central Embed Helper Utility**:
  - Created `src/utils/embedHelper.js` central helper module to build uniform styled Discord Embeds (success, error, info, and brand cyber layouts).
  - Updated `src/commands/general/ping.js` to use the central embed helper for standard latency results.
  - Refactored `src/utils/errorHandler.js` to dispatch warning alerts using the new embed helper.
- **Commands & Schema Cleanup**:
  - Removed all slash commands except `/ping` per user instructions.
  - Cleared all predefined database tables in `src/db/schema.js` to allow the user to build their custom schema.
- **Linting & Formatting**:
  - Created Prettier configuration `.prettierrc` and ESLint flat configuration `eslint.config.js`.
  - Executed codebase-wide formatting and lint resolution to clean up all warnings.
  - Removed unused `winston` `{ log }` import from `src/config.js` to fix ESLint warnings.
- **Context Mapping**:
  - Created [fs.md](./fs.md) and [GEMINI.md](./GEMINI.md) files to preserve context and developer rules.
- **Health Checks**:
  - Created `env.test.js` at the project root to check environment variables, Redis pings, and MySQL connection pool health.
- **Slash Commands — `/cstock`**:
  - Created `src/commands/general/cstock.js` to display current Convoy shop stock via a Components V2 paginated Container with ₳ currency, separators, and buttons.
  - Queries the `convoy_items` MySQL table for items with `current_p = true` and groups them by rarity.
  - Limits items to 5 per sub-page to strictly adhere to Discord's 40-component limits (e.g., Common 1/2, 2/2).
  - Programmed custom nearest-neighbor upscaling inside `src/utils/iconDownloader.js` (using `@napi-rs/canvas` pixel loop) to upscale raw textures to crisp 128x128px.
  - Swapped texture download priority to attempt `item/` textures before `block/` textures.
  - Deduplicated page assets in `src/commands/general/cstock.js` so each PNG is attached exactly once.
  - Registered `/cstock` alongside `/ping` in the Velaris development guild.
  - Programmed a hybrid 3D Render API + flat texture fallback downloader inside `src/utils/iconDownloader.js` to retrieve high-res 3D inventory renders of blocks/items from `api.minecraftitems.xyz`.
  - Added self-healing asset recovery block directly inside the `/cstock` slash command to automatically detect and download any missing icons from the cache before serving the response.
  - Configured thematic chest boat icons (`OAK_CHEST_BOAT`, `SPRUCE_CHEST_BOAT`, `BIRCH_CHEST_BOAT`, `JUNGLE_CHEST_BOAT`, `ACACIA_CHEST_BOAT`) to serve as page headers for the 5 rarity pages of `/cstock`.
  - Allowed rendering inline icons for all items on page (including the first item on index 0), since header icons are now chest boats and no longer duplicate.
- **TimesSeen Bug Resolution**:
  - Fixed a logic bug in `src/services/convoySync.js` where `timesSeen` was incrementing on every scan due to the database `current_p` reset query running before the selection lookup query. Cached previously active items in a memory `Set` before reset.
- **Restructured Testing Suite**:
  - Created a dedicated `tests/` directory and moved `env.test.js` to `tests/env.test.js`.
  - Created `tests/api.test.js`, `tests/database.test.js`, and `tests/runner.js` to test APIs, Database query mappings, and environment config variables. Added process exits to prevent hanging connection handles.
  - Updated `package.json` scripts (`npm test`, `npm run test:env`, `npm run test:api`, `npm run test:db`, `npm run dev`).
- **Atomic Convoy Synchronization**:
  - Restructured `syncConvoy` in `./src/services/convoySync.js` to eliminate pre-sync table/Redis resets.
  - Used in-place upsert checks comparing against `existing.current_p` to accurately increment `timesSeen` only on true rotations.
  - Set all absent items to `current_p = false` at the very end of the sync iteration.
  - Optimized execution speed using concurrent `Promise.all()` queries to process convoy items in parallel instead of sequentially.
- **Global Embed Branded Theme**:
  - Configured `setAuthor` and `setFooter` globally inside `./src/utils/embedHelper.js`'s `createBaseEmbed` to unify styling.
- **Slash Commands & Developer Utilities**:
  - Created `/forcesync` (`./src/commands/general/forcesync.js`) to trigger manual synchronization from the API (developer only).
  - Created `/healthz` (`./src/commands/general/healthz.js`) to view bot uptime, OS platform, memory allocation, and connection health states (developer only).
  - Created `/dev-slist` (`./src/commands/general/dev-slist.js`) to list all guilds the bot is currently in with paginated navigation (10 per page, max 10 pages) showing server name and ID (developer only).
  - Created `/stats-dev` (`./src/commands/general/stats-dev.js`) to monitor command usage statistics retrieved from Redis (lifetime commands, most used command, active guilds count) (developer only).
  - Created `/invite-bd` (`./src/commands/general/invite-bd.js`) to dynamically generate single-use, 24-hour instant invite links for servers the bot is in by name/ID search, allowing the developer to join any server (developer only).
  - Added command usage tracking inside `./src/events/interactionCreate.js` using Redis keys `stats:commands:total` (counter) and `stats:commands:usage` (hash map per command name).
- **Security & Deprecation Resolutions**:
  - Replaced all instances of deprecated `ephemeral: true` in interaction responses with the safer `flags: MessageFlags.Ephemeral` format.
  - Created a developer rule to prohibit `ephemeral: true` usage.
  - Replaced absolute Windows directory links inside `./fs.md` and `./GEMINI.md` with relative links to support Linux portability.
  - Replaced the Mermaid diagram in `./fs.md` with a text-based tree block.
  - Fixed hanging Node processes during command deployment by adding `process.exit(0)` to `./src/deploy-commands.js`.

### 01-07-2026

- **Slash Commands — `/cis-info`**:
  - Created `src/commands/general/cis-info.js` to display detailed convoy rotation information for items.
  - Implemented autocomplete for the optional `item` string option, querying the database and listing items with formatted names showing their rarities.
  - Formatted individual item queries with an advanced embed displaying rarity, frequency rank, times seen, shop active status, buy/sell prices, stock configuration, and last rotated timestamp.
  - Implemented automatic Minecraft icon retrieval and on-the-fly upscaling using `downloadItemIcon` if a queried item's texture is missing.
  - Built a comprehensive overview page when run without options, showing total unique items tracked, currently active items count, top 5 most frequent items, top 5 rarest items, and rarity distribution.
  - Added full interactive navigation components allowing users to switch from the overview page to a paginated tabular catalog of all convoy items.
  - Integrated dynamic Discord **Application Emojis** support: Prefixes catalog names in the paginated lists and title names in specific searches with the uploaded custom emoji. Automatically sets the embed thumbnail to the emoji's CDN URL, bypassing file reads/uploads and accelerating response speeds. Fallbacks safely to local upscaled attachments if the emoji is not found.
- **Minecraft Custom Emoji Uploader & Automation**:
  - Refactored `scripts/upload-emojis.js` to programmatically scan local `src/icons/*.png` textures, check existing application-owned emojis, and upload missing ones. Includes a 3-second rate-limit spacing delay to prevent API timeouts.
  - Integrated the uploader to **autorun automatically** on bot startup (inside `src/events/ready.js`) and after manual sync triggers (inside `src/commands/general/forcesync.js`).
  - Registered `npm run upload:emojis` task script inside `package.json` for manual execution.
- **Directory Mapping**:
  - Registered `src/commands/general/cis-info.js` and `scripts/upload-emojis.js` inside `fs.md`.
- **Rate-Limiting & Timers Cleanup**:
  - Removed the recurring background `setInterval` schedule in `src/services/convoySync.js` so the synchronization worker only runs once upon startup, eliminating background API calls.
  - Implemented a robust client-side cooldown manager in `src/events/interactionCreate.js` to prevent bot rate-limits on Discord and the API. Configured a default 3-second cooldown on general commands, a 10-second cooldown on `/cstock` (`src/commands/general/cstock.js`), and a 60-second cooldown on `/forcesync` (`src/commands/general/forcesync.js`).
- **Rotation Detection Bug Fix**:
  - Programmed automated API response `updatedAt` tracking in `src/services/convoySync.js` (persisting the state across bot restarts via Redis or in-memory variables) to accurately detect true rotation changes. Ensures that when the same item appears across consecutive rotations, its `timesSeen` increments correctly while ignoring identical scan runs.

### 02-07-2026

- **Database (Blacklist Integration)**:
  - Added `blacklist` table schema definition inside `src/db/schema.js`.
  - Generated and safely executed schema migration using `npm run db:generate` and `npm run db:migrate:safe` after resolving duplicate column issues.
- **Blacklist Helper & State Management**:
  - Created `src/utils/blacklistHelper.js` to manage the blacklist state via memory caching, database synchronization, and Redis.
  - Linked the blacklist loader inside `bot.js` startup to populate cache on boot for fast O(1) checks.
- **Interaction & Event Interception**:
  - Integrated blacklist checks at the start of the `interactionCreate` event to block blacklisted users from running commands, autocompletes, or other component interactions.
  - Added blacklist check in `guildMemberAdd` event to skip generating and sending welcome cards for blacklisted users.
- **Slash Commands — `/blacklist`**:
  - Created developer-only slash command `src/commands/general/blacklist.js` with subcommands:
    - `/blacklist add [user] [reason]`: Validates and adds user to blacklist with developer check, self/dev block protection, and user resolution.
    - `/blacklist remove [user]`: Removes user from the blacklist.
    - `/blacklist list`: Displays list of blacklisted users, resolving Discord tags with parallelized cache fallbacks.
- **Testing & Formatting**:
  - Created `tests/blacklist.test.js` to execute integration tests verifying blacklist caching, database operations, and removal functions.
  - Integrated blacklist suite into the main master test runner `tests/runner.js`.
  - Resolved codebase-wide flat-config ESLint errors and executed Prettier formatting.
  - Updated `fs.md` mapping records.
- **Stock Notification System (`notifyiic`)**:
  - Defined the `item_notifications` Drizzle table structure inside `src/db/schema.js` with columns: `user_id`, `item`, and `channel_id`.
  - Generated and safely executed database migrations (`npm run db:generate` & `npm run db:migrate:safe`).
  - Created the `/notifyiic` Slash Command (`src/commands/general/notifyiic.js`) supporting:
    - `/notifyiic add [item]`: Subscribes to stock notifications for an item in the active channel.
    - `/notifyiic remove [item]`: Unsubscribes from notifications for an item.
    - `/notifyiic list`: Lists all active subscriptions.
  - Linked the stock notification dispatcher to `src/services/convoySync.js` to automatically query active subscriptions and broadcast direct loud pings (`<@userId>`) along with rich, visual stock embeds on true rotation updates.
  - Created `tests/notify.test.js` to integration-test subscription creation/removal and registered it inside the master `runner.js` test suite.
- **Slash Commands — `/test`**:
  - Created developer-only slash command `src/commands/general/test.js` allowing developers to execute test suites (`all`, `env`, `api`, `db`, `blacklist`, `notify`) directly from Discord.
  - Returns raw log attachments (`.txt`) with ANSI escape codes cleaned up, along with a truncated 15-line console output summary inside a Discord Embed.
  - Hides the command from non-administrators/non-developers by default using `setDefaultMemberPermissions`.
