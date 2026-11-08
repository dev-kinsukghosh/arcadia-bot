# ArcadiaMC Community Bot & Web Suite

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B%20%7C%2024%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14.26-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-MySQL-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Vue 3](https://img.shields.io/badge/Vue%203-Vite%20%2B%20Tailwind-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)

> **To everyone watching this repo:**
> This is a passion project I made for a Minecraft server I played on. I am leaving the server, which also means I won’t be maintaining this bot any longer or pushing updates to it.
>
> **You may fork, redesign, and use the code/design however you like, or follow this guide to host it yourself.**
>
> _If you are unaware or using an AI agent (Claude, Cursor, Copilot, Gemini, etc.), all architectural context and technical documentation are fully detailed below._

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [The Two Core Services](#-the-two-core-services)
- [Core Features](#-core-features)
- [Prerequisites](#-prerequisites)
- [Automated Quick Setup (Recommended)](#-automated-quick-setup-recommended)
- [Standalone CLI Utilities](#-standalone-cli-utilities)
  - [Key Generator & Entropy Validator](#key-generator--entropy-validator)
  - [Environment & Health Diagnostic Validator](#environment--health-diagnostic-validator)
- [Discord Bot Setup (Production)](#-discord-bot-setup-production)
- [Web Service & Dashboard Setup (Production)](#-web-service--dashboard-setup-production)
- [Docker & CI/CD Deployment](#-docker--cicd-deployment)
- [Environment Configuration Reference](#-environment-configuration-reference)
- [Slash Commands Reference](#-slash-commands-reference)
- [Developer & Telemetry API](#-developer--telemetry-api)
- [License](#-license)

---

## 🏛️ Architecture Overview

The **Arcadia Community Bot** is a high-performance, modular Node.js application that integrates Discord community management, live Minecraft server synchronizations, and an interactive web monitoring dashboard.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Arcadia Community Suite                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│       1. Discord Bot Engine     │           │      2. Web Service & API        │
│  - Discord.js v14 Gateway       │           │  - Express 5 REST API Server     │
│  - Slash Commands & In-Embed UI │           │  - Developer Telemetry & Logs    │
│  - Canvas Glassmorphic Cards    │           │  - Vue 3 + Tailwind Dashboard    │
│  - 7 Background Sync Workers    │           │  - SSG Prerendering Pipeline     │
└───────────────┬─────────────────┘           └────────────────┬─────────────────┘
                │                                              │
                └──────────────────────┬───────────────────────┘
                                       ▼
                ┌──────────────────────────────────────────────┐
                │             Data & Persistence               │
                │  - MySQL / MariaDB via Drizzle ORM           │
                │  - Redis In-Memory Cache (ioredis)           │
                │  - External ArcadiaMC REST Endpoints         │
                └──────────────────────────────────────────────┘
```

---

## 📦 The Two Core Services

The project is split into two primary components that work synergistically:

### 1. Discord Bot (Core Engine — Required)

- **Role**: Base framework responsible for community commands, automated event scheduling, database record upkeep, and background data synchronization.
- **Background Sync Workers**:
  - `ConvoySync`: Real-time convoy chest inventory, timers, and loot value computations.
  - `CurrencySync`: Circulating supply, reserve values, and cross-exchange rates.
  - `HeadsSync`: Automatic download and caching of Minecraft player head skins.
  - `ShopsSync`: Player chest shop inventories, pricing, coordinates, and deal arbitrage.
  - `TownySync`: Hourly snapshots of Towny towns, nations, mayors, residents, and territories.
  - `PlayerSync`: Active online player telemetry and server population statistics.
  - `EmptyEndpointsSync`: API endpoint discovery and candidate route verification.

### 2. Web Service & Dashboard (Optional Web Monitor)

- **Role**: Lightweight web server and modern analytics dashboard.
- **Backend API**: Express REST server exposing `/api/convoy`, `/api/shops`, `/api/towny`, `/api/currencies`, `/api/players`, and authenticated `/api/dev/*` telemetry endpoints.
- **Frontend Dashboard**: Vue 3 SPA built with Vite, Tailwind CSS v4, Pinia, and FontAwesome, featuring SSG prerendering (`npm run dashboard:build`) for instant page loads.
- _Note: If you only want the Discord bot, you can run the bot in `--bot-only` mode without hosting the frontend._

---

## ✨ Core Features

- 🏙️ **Towny & Nation Analytics**:
  - Deep town and nation inspection embeds with live mayor avatars, coordinates, and resident lists.
  - **Multi-Entity Comparator**: Compare 2, 3, or 4 towns or nations simultaneously with side-by-side metric cards and dual distribution bars rendered via `@napi-rs/canvas`.
  - **Town Owner Recovery**: Intelligently preserves original player town mayors across ruined states, preventing overwrite by fake NPC placeholder accounts (`NPCX`).
- 🛒 **Dynamic Economy & Player Shops**:
  - Full player chest shop catalog search with item price analysis, coordinates, and stock filters.
  - Item Stock Tracker with historical line graphs and arbitrage deal finder.
  - Nation currency cross-exchange matrix calculating direct conversion rates.
- 🚚 **Convoy Tracking & Live Alerts**:
  - Automated convoy chest notifications, loot value calculations, and item restock pings.
- 🎮 **Interactive Pokémon Mini-Game**:
  - Random spawn encounters, battle refusals, interactive fight-back buttons, user party listings, summon embeds, and release workflows.
- 🪪 **Glassmorphic Welcome Cards**:
  - Hardware-accelerated canvas engine producing custom glassmorphic welcome cards with user avatar and server stats.
- 🧭 **In-Embed Breadcrumb Navigation Router**:
  - Interactive Discord ActionRow buttons allowing users to seamlessly browse related towns, mayors, shops, and currencies with session state history and invoker permission checks.
- 🛡️ **Developer Telemetry & Maintenance System**:
  - Real-time CPU, RAM, and event-loop lag monitoring.
  - Circular in-memory and Redis log buffers for remote log querying (`/api/dev/logs` & `/dev-logs`).
  - Maintenance mode toggle with bypass tokens (`DEV_SECRET`) and custom 403 pages.

---

## 📋 Prerequisites

Before setting up, ensure you have the following installed on your system or server:

1. **Node.js**: v18.0.0 or higher (Node 20 or 24 LTS recommended).
2. **MySQL** or **MariaDB**: Version 8.0+ or MariaDB 10.5+.
3. **Redis**: Version 6.0+ (running locally or accessible remotely).
4. **Discord Bot Application**: Created on the [Discord Developer Portal](https://discord.com/developers/applications).
   - Under **Bot -> Privileged Gateway Intents**, enable:
     - ✅ **Server Members Intent** (`GatewayIntentBits.GuildMembers`)
     - ✅ **Message Content Intent** (`GatewayIntentBits.MessageContent`)

---

## ⚡ Automated Quick Setup (Recommended)

The repository includes an interactive command-line setup wizard built with the project's signature **cyber neon logger styling**. It configures your `.env` file, validates your credentials against live services, tests database and Redis connectivity, imports pre-packaged community data, and deploys commands.

```bash
# 1. Clone repository
git clone https://github.com/your-username/Arc-community-bot.git
cd Arc-community-bot

# 2. Install dependencies
npm ci

# 3. Run the interactive setup wizard (or press Enter for Express mode)
npm run setup

# Or run completely unattended / non-interactive (hands-free)
npm run setup:quick
```

### 🚀 Setup Modes

- **Express Auto-Setup (Default — just press Enter)**: Automatically validates credentials, generates missing secrets, configures directories, and prepares your environment hands-free.
- **Unattended / Inactive Mode (`npm run setup:quick` or `--inactive`)**: Executes completely hands-free without any terminal prompts, ideal for automated scripts or container initialization.
- **Guided Custom Setup**: Step-by-step walkthrough to review and customize each port, database credential, and setting manually.

### 💾 Community Database Data Copy

The repository includes a ready-to-use database data copy (`data/latest-db-dump.sql`) containing 17,450 rows of historical Towny snapshots, convoy items, nation currencies, player heads, and shops:

```bash
# Import the included database dump into your MySQL instance
npm run db:import

# Or export a fresh database copy at any time
npm run db:dump
```

### 🔁 The "Repeat If Wrong" Validator System

The setup script actively validates each configuration step in real time and will not proceed blindly with broken keys:

1. **Discord Bot Token**: Immediately probes `https://discord.com/api/v10/users/@me`. If the token is invalid or returns a 401 error, it alerts you with the exact reason and **prompts you to retry until valid**.
2. **Discord Client ID & Guild ID**: Validates snowflake digit lengths (17-20 digits).
3. **Dev Secret Key**: Offers one-click cryptographic key generation (64-character hex) or validates custom key entropy.
4. **MySQL / MariaDB**: Probes the database server. If the server is reachable but the database does not exist, the script **offers to automatically create it for you** (`CREATE DATABASE IF NOT EXISTS`). If credentials fail, it loops to allow immediate re-entry.
5. **Redis Cache**: Sends a live `PING` command and checks roundtrip latency.
6. **Automatic Migration & Deployment**: Offers to push database tables (`npm run db:push`) and deploy slash commands (`npm run deploy`) directly at the end of setup.

---

## 🛠️ Standalone CLI Utilities

### Key Generator & Entropy Validator

Used to generate and validate cryptographically secure keys for `DEV_SECRET`, webhook secrets, or session tokens:

```bash
# Interactive CLI menu
npm run keygen

# Quick generate 64-character hex key and output Shannon entropy
node scripts/keygen.js --generate

# Generate key and automatically save as DEV_SECRET in .env
node scripts/keygen.js --generate --save

# Generate 44-character Base64 key
node scripts/keygen.js --generate --base64

# Validate an existing secret key's entropy and strength
node scripts/keygen.js --validate "your_secret_key_here"
```

### Environment & Health Diagnostic Validator

Test all your `.env` configurations without modifying files:

```bash
npm run env:validate
```

This verifies:

- ✅ Discord Bot Token authentication & bot user identity
- ✅ Discord Client ID snowflake formatting
- ✅ MySQL / MariaDB connection pool & target database existence
- ✅ Redis connection & `PING` latency
- ✅ External ArcadiaMC API connectivity
- ✅ `DEV_SECRET` entropy and security rating

---

## 🤖 Discord Bot Setup (Production)

### 1. Database Schema Initialization

Push the Drizzle ORM schema to your MySQL instance:

```bash
npm run db:push
```

### 2. Slash Commands Registration

Register all application commands with Discord:

```bash
# Register commands globally (takes ~1-5 minutes to propagate across Discord)
npm run deploy

# Or deploy to a specific testing guild immediately (requires DISCORD_GUILD_ID in .env)
node src/deploy-commands.js --guild

# Clear old commands if needed
node src/deploy-commands.js --clear-global
```

### 3. Launching the Bot

Choose the startup mode that matches your workload:

```bash
# Start bot + Express web server with global command deployment (Production)
npm start

# Start Discord Bot only (no web server / background services only)
npm run start:bot

# Start without background sync workers (useful for lightweight staging)
npm run start:nos

# Development mode with nodemon auto-reloading
npm run dev
```

### Running with PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start bot.js --name "arcadia-bot" --time
pm2 logs arcadia-bot
```

---

## 🌐 Web Service & Dashboard Setup (Production)

### 1. Web Service (Express API Backend)

The backend REST API can run either alongside the bot or independently:

```bash
# Run web server standalone
npm run dev:server
```

Default port is `5556` (configurable via `PORT` in `.env`).

### 2. Web Dashboard (Frontend)

The dashboard is located in the `dashboard/` directory.

```bash
# Development server (Vite hot reload)
npm run dashboard:dev

# Build for production (SSG prerendered static files)
npm run dashboard:build

# Preview production build locally
npm run dashboard:preview
```

### 3. Concurrent Development Mode

To run both the backend bot and frontend Vite server concurrently with a single command:

```bash
npm run dev:all
```

### 4. Reverse Proxy (Nginx Example)

To expose the Web API and Dashboard publicly:

```nginx
server {
    server_name arcapi.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5556;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐳 Docker & CI/CD Deployment

### Multi-Stage Dockerfile

A production-ready multi-stage `Dockerfile` is included in the root directory:

```bash
# Build Docker image
docker build -t arcadia-bot:latest .

# Run container
docker run -d \
  -p 5556:5556 \
  --name arcadia-bot \
  --restart unless-stopped \
  --env-file .env \
  arcadia-bot:latest
```

### Docker Compose Example

Create a `docker-compose.yml` to spin up MySQL, Redis, and the Bot together:

```yaml
version: '3.8'

services:
  mysql:
    image: mariadb:11.4
    container_name: arcadia-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: secretpassword
      MYSQL_DATABASE: arcadia_bot
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - '3306:3306'

  redis:
    image: redis:7-alpine
    container_name: arcadia-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'

  bot:
    build: .
    container_name: arcadia-bot
    restart: unless-stopped
    depends_on:
      - mysql
      - redis
    env_file:
      - .env
    ports:
      - '5556:5556'

volumes:
  mysql_data:
  redis_data:
```

### Automated CI/CD (GitHub Actions)

The repository contains an automated workflow at `.github/workflows/deploy.yml` that:

1. Runs on every push to `main` (or manual dispatch).
2. Sets up Node.js 24 and builds the frontend dashboard with `npm run dashboard:build`.
3. Packages the application into a Docker container and publishes it to GitHub Container Registry (`ghcr.io`).
4. Connects to your production server via SSH (`appleboy/ssh-action`), pulls the new image, updates environment variables, and restarts the container with zero downtime.

---

## ⚙️ Environment Configuration Reference

| Variable              | Description                                          |  Required   | Default                                       |
| :-------------------- | :--------------------------------------------------- | :---------: | :-------------------------------------------- |
| `DISCORD_BOT_TOKEN`   | Discord Bot Application Token                        |   **Yes**   | —                                             |
| `DISCORD_CLIENT_ID`   | Discord Application (Client) ID                      |   **Yes**   | —                                             |
| `DISCORD_GUILD_ID`    | Guild ID for instant test command registration       |     No      | _Empty (Global)_                              |
| `DB_IP`               | MySQL / MariaDB host IP                              |   **Yes**   | `127.0.0.1`                                   |
| `DB_PORT`             | MySQL / MariaDB port                                 |   **Yes**   | `3306`                                        |
| `DB_NAME`             | Database name                                        |   **Yes**   | `arcadia_bot`                                 |
| `DB_USER`             | Database username                                    |   **Yes**   | `root`                                        |
| `DB_PASSWORD`         | Database user password                               |   **Yes**   | —                                             |
| `DB_CONNECTION_LIMIT` | MySQL connection pool size                           |     No      | `30`                                          |
| `REDIS_HOST`          | Redis host IP                                        |   **Yes**   | `127.0.0.1`                                   |
| `REDIS_PORT`          | Redis port                                           |   **Yes**   | `6379`                                        |
| `REDIS_PASSWORD`      | Redis authentication password                        |     No      | _Empty_                                       |
| `REDIS_DB`            | Redis database index                                 |     No      | `0`                                           |
| `DEV_SECRET`          | Secret token for `/api/dev/*` and maintenance bypass | Recommended | _Generated via `npm run keygen`_              |
| `DEV_ID`              | Comma-separated Discord User IDs for dev bypass      | Recommended | —                                             |
| `PORT`                | Express REST API server port                         |     No      | `5556`                                        |
| `API_BASE_URL`        | ArcadiaMC API endpoint                               |     No      | `https://api.arcadiamc.net`                   |
| `DASHBOARD_URL`       | Public URL where the dashboard frontend is hosted    |     No      | `http://localhost:5173`                       |
| `ALLOWED_ORIGINS`     | CORS origins for Express API server                  |     No      | `http://localhost:5173,http://localhost:5556` |
| `LOG_LEVEL`           | Logging verbosity (`debug`, `info`, `warn`, `error`) |     No      | `debug`                                       |
| `BOT_PREFIX`          | Legacy message command prefix                        |     No      | `a!`                                          |

---

## 📜 Slash Commands Reference

### 🏙️ Towny & Nations

- `/towny town <name>` — Detailed town inspection (mayor, population, coordinates, bank, nation).
- `/towny nation <name>` — Detailed nation inspection (king, capital, member towns, population).
- `/towny compare <type> <t1> <t2> [t3] [t4]` — Side-by-side comparison of 2-4 towns or nations with Canvas chart.
- `/towny top <category>` — Leaderboards for highest population, territory claims, and banks.
- `/towny map [name]` — Town claim territorial boundaries and location preview.

### 💰 Economy, Shops & Convoy

- `/cstock <item>` — Real-time stock quantity, base value, and restock status.
- `/chistory <item>` — Interactive Canvas historical price line chart (24h/7d).
- `/ccompare <item1> <item2> ...` — Side-by-side commodity price comparison.
- `/shops <search>` — Search player chest shops for items with coordinates, stock, and prices.
- `/dealfinder` — Arbitrage deal finder comparing player shop prices against server base stock values.
- `/currencies` — Nation-backed currency listing and exchange rates.
- `/exchange <amount> <from> <to>` — Live currency exchange calculator.
- `/convoy` — Active convoy locations, spawn schedules, and chest inventory contents.

### 🎮 Pokémon Mini-Game

- `/pokemon encounter` — Trigger a wild Pokémon encounter with fight-back battles.
- `/pokemon party` — View and inspect your captured Pokémon party roster.
- `/pokemon release <id>` — Release a Pokémon back to the wild.
- `/pokemon toggle` — Enable or disable wild encounter interruptions for yourself.

### 🛠️ Developer & Admin Tools

- `/maintenance toggle <status> [reason]` — Toggle maintenance mode across bot & dashboard.
- `/dev-logs [level] [limit]` — Query real-time circular log buffer directly inside Discord.
- `/dev-slist` — View real-time background sync workers status and execution metrics.
- `/devconfig` — Manage runtime configurations stored in `webyCustom`.
- `/healthz` — System health diagnostic (CPU, RAM, Event Loop latency, Redis ping).
- `/blacklist add/remove/list <user>` — Manage bot permission blacklist.

---

## 🔒 Developer & Telemetry API

Developer endpoints are authenticated via developer tokens. You can supply the token via:

- HTTP Header: `x-dev-token: <DEV_SECRET>`
- Bearer Authorization: `Authorization: Bearer <DEV_SECRET>`
- Query Parameter: `?key=<DEV_SECRET>`

### Key Endpoints:

- `GET /health` — Service health, memory usage, uptime, and Redis connection state.
- `GET /api/dev/telemetry` — Live telemetry snapshot (CPU load, process memory, Discord WS ping, command latencies).
- `GET /api/dev/logs` — In-memory log buffer retrieval with level and timestamp filtering.
- `POST /api/dev/maintenance` — Toggle maintenance mode programmatically.
- `POST /api/dev/web-telemetry` — Ingest web frontend client telemetry and error reports.

---

## 📄 License

This project is licensed under the [ISC License](./LICENSE). You are free to fork, adapt, redesign, or host this software for personal or community purposes.
