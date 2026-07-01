# Custom Developer Rules

The following rules MUST be followed at all times in this workspace:

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
