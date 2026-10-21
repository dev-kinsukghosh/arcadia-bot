const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { isOptionEnabled } = require('../../utils/guildOptionsHelper.js');

const CC_COMMANDS = ['pemoji', 'al-nadd', 'al-nrm', 'al-setseat', 'al-seatcalc', 'pokemon'];

const PUBLIC_COMMANDS = [
  {
    name: 'cstock',
    category: '🚚 Convoy & Market',
    summary: 'View current Convoy shop stock & live prices',
    usage: '/cstock',
    details:
      'Queries current Convoy shop items in active rotation. Displays items grouped by rarity tier with stock count, buy/sell prices, and converted values based on your server preferred currency.',
  },
  {
    name: 'cis-info',
    category: '🚚 Convoy & Market',
    summary: 'Check item rotation history & rarity rank',
    usage: '/cis-info [item]',
    details:
      'Run without arguments to view overall Convoy statistics and catalog lists. Specify an item name to check its rarity tier, frequency rank, total times seen in shop, active status, and historical pricing.',
  },
  {
    name: 'notifyiic',
    category: '🚚 Convoy & Market',
    summary: 'Manage stock notification pings for items',
    usage: '/notifyiic <add|remove|list> [item]',
    details:
      'Allows you to manage stock notifications in the current channel. The bot will send a direct ping and visual item embed whenever your subscribed items rotate into the Convoy shop.',
  },
  {
    name: 'currencies',
    category: '🪙 Currencies & Economy',
    summary: 'Browse active nation currencies & ARC rates',
    usage: '/currencies',
    details:
      'Displays a paginated catalog of all active nation currencies on ArcadiaMC, showing nation owners, base ARC values, live exchange rates, and standard backing item icons.',
  },
  {
    name: 'cstats',
    category: '🪙 Currencies & Economy',
    summary: 'View 120-day currency health & market ranks',
    usage: '/cstats',
    details:
      'Analyzes currency health metrics across all monitored nation currencies. Classifies currencies into Steady (≥85), Mixed (65-84), or Risky (<65) stability categories.',
  },
  {
    name: 'chistory',
    category: '🪙 Currencies & Economy',
    summary: 'View 30-day rate trends & volatility',
    usage: '/chistory <currency>',
    details:
      'Renders historical telemetry for a selected nation currency over the past 30 days, including rate volatility, 30-day percentage changes, minimum/maximum values, and peak historical records.',
  },
  {
    name: 'ccompare',
    category: '🪙 Currencies & Economy',
    summary: 'Compare rates between two currencies',
    usage: '/ccompare <currency_a> <currency_b>',
    details:
      'Provides a direct side-by-side comparative analysis between two nation currencies, evaluating exchange rate ratios, stability scores, 30-day rate changes, and overall market dominance.',
  },
  {
    name: 'exchange',
    category: '🪙 Currencies & Economy',
    summary: 'Convert amounts between nation currencies',
    usage: '/exchange <amount> <from> <to> [include_tax]',
    details:
      'Calculates exact conversion rates and output amounts between any two nation currencies or base ARC. Supports optional 5% server conversion tax calculations (tax is omitted when converting to ARC).',
  },
  {
    name: 'ncurrency',
    category: '🪙 Currencies & Economy',
    summary: 'View or set your server preferred currency',
    usage: '/ncurrency <view|set> [currency_id]',
    details:
      'Configures the active guild currency preference used by Convoy commands (`/cstock`, `/cis-info`) to automatically convert base ARC prices into your server nation currency.',
  },
  {
    name: 'towny',
    category: '🏰 Towny & Server',
    summary: 'View Towny stats, residents & top towns',
    usage: '/towny',
    details:
      'Displays real-time Towny server statistics, total towns and nations count, total online residents, and top 5 leaderboards for town population and claimed land chunks.',
  },
  {
    name: 'players',
    category: '🏰 Towny & Server',
    summary: 'View online player roster & player profiles',
    usage: '/players <online|info> [name]',
    details:
      'Check current roster of online players grouped by rank (`/players online`) or look up live map coordinates and recorded database history profiles for any player (`/players info [name]`).',
  },
  {
    name: 'events',
    category: '🏰 Towny & Server',
    summary: 'View active server events on ArcadiaMC',
    usage: '/events',
    details:
      'Displays active server events taking place or scheduled on ArcadiaMC. Shows event titles, descriptions, statuses, and countdowns.',
  },
  {
    name: 'wars',
    category: '🏰 Towny & Server',
    summary: 'View live war status, active wars & logs',
    usage: '/wars',
    details:
      'Displays live telemetry on server war status, active sieges roster (attacker vs defender with scores), and recent military event logs.',
  },
  {
    name: 'shops',
    category: '🏰 Towny & Server',
    summary: 'Search and locate player chest shops',
    usage: '/shops [search]',
    details:
      'Displays a paginated directory of player chest shops. Search by item name or shop owner to find exact location coordinates, item stock, and pricing details.',
  },
  {
    name: 'dashboard',
    category: '🛠️ Server & Utilities',
    summary: 'Get web dashboard link for live graphs',
    usage: '/dashboard',
    details:
      'Provides direct access link to the official web dashboard to explore interactive currency charts, real-time convoy stock monitors, towny maps, and shop directories.',
  },
  {
    name: 'suggest',
    category: '🛠️ Server & Utilities',
    summary: 'Submit a feature suggestion for the bot',
    usage: '/suggest <suggestion>',
    details:
      'Allows users to submit new feature requests or bot improvements. Submissions are dispatched to the developer channel with user avatar and details.',
  },
  {
    name: 'feedback',
    category: '🛠️ Server & Utilities',
    summary: 'Submit feedback or reviews about the bot',
    usage: '/feedback <feedback>',
    details:
      'Allows users to submit reviews, thoughts, or feedback about the bot to help developers improve features.',
  },
  {
    name: 'invite',
    category: '🛠️ Server & Utilities',
    summary: 'Get bot invite link to add to your server',
    usage: '/invite',
    details:
      'Generates the official Discord OAuth2 invite URL and web dashboard link to add ArcadiaMC Community Bot to your server.',
  },
  {
    name: 'pemoji',
    category: '🛠️ Server & Utilities',
    summary: 'Generate 3D skin render as guild emoji',
    usage: '/pemoji <username> [facing] [type-icon]',
    details:
      'Downloads a 3D Minecraft skin render for the specified username and programmatically uploads it as a custom guild emoji or resized 320x320 PNG sticker (requires server feature toggle).',
  },
  {
    name: 'al-nadd',
    category: '🏛️ Al-Sam Alliance (CC)',
    summary: 'Add a nation to the Al-Sam database list',
    usage: '/al-nadd <nationname>',
    details: 'Adds the specified nation to the tracked Al-Sam Alliance database table.',
  },
  {
    name: 'al-nrm',
    category: '🏛️ Al-Sam Alliance (CC)',
    summary: 'Remove a nation from the Al-Sam database list',
    usage: '/al-nrm <nationname>',
    details: 'Removes the specified nation from the tracked Al-Sam Alliance database table.',
  },
  {
    name: 'al-setseat',
    category: '🏛️ Al-Sam Alliance (CC)',
    summary: 'Set total representative seats for Al-Sam',
    usage: '/al-setseat <amount>',
    details:
      'Sets the total representative seats count used in Mukhtarun seat allocation calculations.',
  },
  {
    name: 'al-seatcalc',
    category: '🏛️ Al-Sam Alliance (CC)',
    summary: 'Calculate Al-Sam Mukhtarun seat allocations',
    usage: '/al-seatcalc',
    details:
      'Calculates proportional representative seat allocations for all registered Al-Sam nations based on online resident telemetry.',
  },
  {
    name: 'pokemon',
    category: '🎮 Pokemon (CC)',
    summary: 'Party, capture, transfer, or fightback',
    usage: '/pokemon <capture|list|summon|release|transfer|fightback|opt>',
    details:
      'Master Pokémon command. Capture members (/pokemon capture), view party (/pokemon list), summon companions (/pokemon summon), release (/pokemon release), transfer ownership (/pokemon transfer), fight back to escape (/pokemon fightback), or configure opt-in/opt-out status (/pokemon opt).',
  },
  {
    name: 'ping',
    category: '🛠️ Server & Utilities',
    summary: 'Check bot latency and API ping response',
    usage: '/ping',
    details:
      'Measures the real-time roundtrip latency between Discord, the bot engine, and the server API endpoint.',
  },
];

/**
 * Filter public commands to only include standard commands and CC commands enabled for the guild.
 * @param {string|null} guildId - The Discord guild ID.
 * @returns {Array} List of available commands.
 */
function getAvailableCommands(guildId) {
  return PUBLIC_COMMANDS.filter((cmd) => {
    if (CC_COMMANDS.includes(cmd.name)) {
      return isOptionEnabled(guildId, cmd.name);
    }
    return true;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available commands and instructions on how to use them')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Optional specific command to view detailed usage instructions for')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const availableCommands = getAvailableCommands(interaction.guildId);
    const filtered = availableCommands
      .filter((cmd) => cmd.name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map((cmd) => ({ name: `/${cmd.name} - ${cmd.summary}`, value: cmd.name }));

    await interaction.respond(filtered);
  },

  async execute(interaction) {
    const selectedCmdName = interaction.options.getString('command');
    const availableCommands = getAvailableCommands(interaction.guildId);

    // Specific command detail lookup
    if (selectedCmdName) {
      const cmd = availableCommands.find(
        (c) => c.name.toLowerCase() === selectedCmdName.toLowerCase()
      );

      if (!cmd) {
        return interaction.reply({
          embeds: [
            createBaseEmbed()
              .setColor(EMBED_COLORS.ERROR)
              .setTitle('❌ Command Not Found')
              .setDescription(
                `Could not find command \`/${selectedCmdName}\`. Run \`/help\` to view all available commands.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const detailEmbed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`📖 Command Help: /${cmd.name}`)
        .setDescription(cmd.details)
        .addFields(
          { name: '🏷️ Category', value: cmd.category, inline: true },
          { name: '💻 Usage', value: `\`${cmd.usage}\``, inline: true },
          { name: '📝 Short Summary', value: cmd.summary, inline: false }
        );

      return interaction.reply({ embeds: [detailEmbed] });
    }

    // General command directory list grouped by category
    const categories = {};
    for (const cmd of availableCommands) {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
    }

    const helpEmbed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('📚 ArcadiaMC Community Bot — Command Directory')
      .setDescription(
        'Here is the complete guide for all available public commands.\n' +
          'Use `/help [command]` for detailed usage instructions on any specific command.\n'
      );

    for (const [categoryName, cmds] of Object.entries(categories)) {
      const lines = cmds.map((c) => `• **\`${c.usage}\`**\n  -${c.summary}`);
      helpEmbed.addFields({
        name: categoryName,
        value: lines.join('\n'),
        inline: false,
      });
    }

    return interaction.reply({ embeds: [helpEmbed] });
  },
};
