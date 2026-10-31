# Project Context & Rules

This file documents the core project context, custom development rules defined by the user, and an index of monthly change logs for the **Arcadia Community Bot**.

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

The following rules MUST be followed at all times in this workspace:

1. ⚠️ **Ask Before Installing**: Always consult the user and ask for explicit permission before running any package installs (`npm install` / `npm i`).
2. 💡 **Suggest Alternatives**: If a package or technical implementation is requested, suggest better/optimized alternatives if they exist.
3. 📝 **Directory Mapping (`fs.md`)**: Maintain [fs.md](./fs.md) up-to-date. Every time a new file is added, moved, or deleted, update the directory mapping.
4. 📄 **Chat Completion Updates**:
   - Update `fs.md` if any file structures changed.
   - Record newly implemented changes in monthly changelogs under `changelogs/MM-YYYY.md` (e.g., `changelogs/10-2026.md`) and keep `GEMINI.md` clean and updated.
5. 📂 **Exclusions**: Always ignore the `node_modules/` and `logs/` folders from documentation lookups and directories list references.
6. 🚫 **No Direct Ephemeral Options**: Never supply `ephemeral: true` directly in Discord interaction response options (deprecated). Always utilize `flags: MessageFlags.Ephemeral` instead.
7. 📂 **Relative Project Links**: Never use absolute Windows paths (e.g., `C:/...` or `file:///C:/...`) or `file:///src` link schemes in chat responses, logs, or documentation. Always refer to files using relative text paths (e.g. `src/commands/general/cis-info.js`) or simple code formatting (e.g. `cis-info.js`). When explaining file changes or structural additions, use a tree-like text structure to outline the directories, followed by a list of files with their descriptions next to them, avoiding any inline link syntax.
8. ⚠️ **Emoji URL Deprecation**: Never use `Emoji.url` (deprecated in Discord.js v14). Always utilize `Emoji.imageURL()` instead to prevent console deprecation warning logs.
9. 🧪 **Do Not Auto-Run Integration Tests**: Never run bot integration tests (`npm test` or specific suites) automatically on your own. Only execute tests when the user explicitly instructs you to do so.
10. ⚡ **Developer Experience & Hot Reloads**: Never let the backend hot-reloader (nodemon) watch frontend directories like `dashboard/` or downloaded assets cache folders like `src/icons/` and `src/heads/`. This prevents redundant backend restarts during active web page design iterations.
11. 📦 **Production Bundle & Code-Splitting**: Keep large assets and libraries (e.g., `chart.js`, `@fortawesome`) code-split into distinct chunks (`manualChunks` configuration in `vite.config.mjs`) to accelerate production bundle downloads and optimize browser caching.
12. 🛠️ **Concurrent Development**: Support starting both backend bot nodes and frontend Vite dev servers simultaneously using the unified concurrent command `npm run dev:all` (leveraging `run-p` under the hood) to reduce terminal management overhead.
13. 🎨 **Clean and Self-Documenting Code**: Ensure new Javascript files inside the dashboard are classified in `eslint.config.js` under the ES module parser and keep component code highly readable/modular.
14. 🧩 **ESLint Tailwind Whitelist**: When using custom CSS class names (e.g., `custom-scrollbar`, `animate-pulse-glow`, `hover:scale-1.03`) in dashboard Vue components, always add them to the `whitelist` array inside the `tailwindcss/no-custom-classname` rule in `eslint.config.js`. Include the full modifier-prefixed form (e.g., `hover:scale-1.02`, `group-hover:animate-shine`) to suppress `no-custom-classname` warnings.
15. 🔒 **Custom CC Commands Visibility in `/help`**: Custom CC commands (e.g., `/pemoji`, `/al-nadd`, `/al-nrm`, `/al-setseat`, `/al-seatcalc`) MUST NOT be displayed in `/help` listings, detailed command lookups, or `/help` option autocompletes unless explicitly enabled for that guild (`isOptionEnabled(guildId, commandName)`).
16. 📏 **Concise Summaries in `/help` Autocomplete**: Keep command `summary` strings in `/help` short and concise (under ~45 characters) so that autocomplete option choices (`/${cmd.name} - ${cmd.summary}`) fit within Discord's 100-character limit cleanly without mid-word truncation or cut-offs.
17. 🚫 **Do Not Auto-Run Format & Linting**: Never automatically run codebase formatting (`npm run format`) or linting (`npm run lint`) commands on your own. Always prompt/ask the user to run them or ask for permission before executing.

---

## 🪵 Change Logs

All daily changelog entries have been organized chronologically by month into the [`changelogs/`](./changelogs/) directory in `MM-YYYY.md` format:

- [June 2026](./changelogs/06-2026.md) (`changelogs/06-2026.md`)
- [July 2026](./changelogs/07-2026.md) (`changelogs/07-2026.md`)
- [August 2026](./changelogs/08-2026.md) (`changelogs/08-2026.md`)
- [September 2026](./changelogs/09-2026.md) (`changelogs/09-2026.md`)
- [October 2026](./changelogs/10-2026.md) (`changelogs/10-2026.md`)
- [November 2026](./changelogs/11-2026.md) (`changelogs/11-2026.md`)

When completing tasks in future sessions, append new daily change entries to the corresponding month's markdown file (`changelogs/MM-YYYY.md`).
