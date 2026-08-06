const {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const {
  drawTopChart,
  drawCompareChart,
  drawHistoryLineChart,
} = require('../../utils/canvasGraph.js');
const { db } = require('../../utils/db.js');
const { townyHistory } = require('../../db/schema.js');
const { and, eq, gte, asc } = require('drizzle-orm');

// Map for autocomplete debouncing per user (500ms)
const userLastAutocomplete = new Map();

// Local cache for towny data during autocomplete to prevent excessive API requests
let townyCache = null;
let lastCacheFetch = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds TTL

async function fetchTownyData() {
  const now = Date.now();
  if (townyCache && now - lastCacheFetch < CACHE_TTL) {
    return townyCache;
  }
  try {
    const data = await arcadiaApi.getTowny();
    if (data) {
      townyCache = data;
      lastCacheFetch = now;
      return townyCache;
    }
  } catch {
    if (townyCache) return townyCache;
    return null;
  }
  return townyCache;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('towny')
    .setDescription('View Arcadia Towny statistics, rankings, comparisons, and profiles')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addSubcommand((sub) =>
      sub.setName('stats').setDescription('Display overall Arcadia Towny server statistics')
    )
    .addSubcommand((sub) =>
      sub
        .setName('town')
        .setDescription('Search and view detailed information for a town')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('The name or slug of the town')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('nation')
        .setDescription('Search and view detailed information for a nation')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('The name or slug of the nation')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('top')
        .setDescription('Display rankings and comparison charts for towns or nations')
        .addStringOption((opt) =>
          opt
            .setName('metric')
            .setDescription('The ranking criteria')
            .setRequired(true)
            .addChoices(
              { name: 'Towns by Population', value: 'towns_population' },
              { name: 'Towns by Territory Size (Chunks)', value: 'towns_chunks' },
              { name: 'Nations by Population', value: 'nations_population' },
              { name: 'Nations by Town Count', value: 'nations_towns' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('compare')
        .setDescription('Compare two towns side-by-side with a graph')
        .addStringOption((opt) =>
          opt
            .setName('town1')
            .setDescription('The first town to compare')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('town2')
            .setDescription('The second town to compare')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View population or territory history for a town or nation')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Type of target to check history for')
            .setRequired(true)
            .addChoices({ name: 'Town', value: 'town' }, { name: 'Nation', value: 'nation' })
        )
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Name of the town or nation')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('metric')
            .setDescription('Metric to display in the graph (default: Residents)')
            .setRequired(false)
            .addChoices(
              { name: 'Residents', value: 'residents' },
              { name: 'Claims (Chunks) / Town Count', value: 'chunks' }
            )
        )
        .addNumberOption((opt) =>
          opt
            .setName('days')
            .setDescription('Number of past days to fetch history for (default: 30)')
            .setRequired(false)
            .addChoices(
              { name: '7 Days', value: 7 },
              { name: '15 Days', value: 15 },
              { name: '30 Days', value: 30 },
              { name: '60 Days', value: 60 },
              { name: '90 Days', value: 90 },
              { name: '120 Days', value: 120 }
            )
        )
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value ? focusedOption.value.toLowerCase().trim() : '';

    // Debounce: Wait 500ms after user stops typing
    if (focusedValue !== '') {
      const userId = interaction.user.id;
      const currentInteractionId = interaction.id;
      userLastAutocomplete.set(userId, currentInteractionId);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (userLastAutocomplete.get(userId) !== currentInteractionId) {
        return; // Ignore older keystrokes
      }
    }

    const data = await fetchTownyData();
    if (!data) {
      return interaction.respond([]).catch(() => {});
    }

    const subcommand = interaction.options.getSubcommand();
    const type = interaction.options.getString('type') || 'town';
    let choices = [];

    if (
      (focusedOption.name === 'name' && subcommand === 'town') ||
      focusedOption.name === 'town1' ||
      focusedOption.name === 'town2' ||
      (focusedOption.name === 'name' && subcommand === 'history' && type === 'town')
    ) {
      const towns = Array.isArray(data.towns) ? data.towns : [];
      const filtered = towns.filter((t) => {
        if (!t) return false;
        const name = t.name ? t.name.toLowerCase() : '';
        const nameClean = t.name ? t.name.toLowerCase().replace(/_/g, ' ') : '';
        const slug = t.slug ? t.slug.toLowerCase() : '';
        return (
          name.includes(focusedValue) ||
          nameClean.includes(focusedValue) ||
          slug.includes(focusedValue)
        );
      });

      choices = filtered.slice(0, 25).map((t) => {
        const displayName = t.name ? t.name.replace(/_/g, ' ') : t.slug || 'Unknown Town';
        const nationTag = t.nation?.name ? ` [${t.nation.name.replace(/_/g, ' ')}]` : '';
        return {
          name: `${displayName}${nationTag}`.slice(0, 100),
          value: t.name || t.slug || t.id,
        };
      });
    } else if (
      (focusedOption.name === 'name' && subcommand === 'nation') ||
      (focusedOption.name === 'name' && subcommand === 'history' && type === 'nation')
    ) {
      const nations = Array.isArray(data.nations) ? data.nations : [];
      const filtered = nations.filter((n) => {
        if (!n) return false;
        const name = n.name ? n.name.toLowerCase() : '';
        const nameClean = n.name ? n.name.toLowerCase().replace(/_/g, ' ') : '';
        const slug = n.slug ? n.slug.toLowerCase() : '';
        return (
          name.includes(focusedValue) ||
          nameClean.includes(focusedValue) ||
          slug.includes(focusedValue)
        );
      });

      choices = filtered.slice(0, 25).map((n) => {
        const displayName = n.name ? n.name.replace(/_/g, ' ') : n.slug || 'Unknown Nation';
        const townsInfo = ` (${n.towns ?? 0} towns)`;
        return {
          name: `${displayName}${townsInfo}`.slice(0, 100),
          value: n.name || n.slug || n.id,
        };
      });
    }

    await interaction.respond(choices).catch(() => {});
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply();

    let data;
    try {
      data = await arcadiaApi.getTowny();
    } catch {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Towny API Error',
            'Failed to fetch Towny data from ArcadiaMC API. Please try again later.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!data) {
      return interaction.editReply({
        embeds: [
          errorEmbed('No Data Available', 'Towny dataset is currently empty or unavailable.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Subcommand: Stats ─────────────────────────────────────────────
    if (subcommand === 'stats') {
      const counts = data.counts || {};
      const claimedChunks = counts.claimedChunks || {};
      const byWorldObj = claimedChunks.byWorld || {};

      const byWorldLines = Object.entries(byWorldObj).map(
        ([world, count]) => `• \`${world.padEnd(10)}\` **${Number(count).toLocaleString()}** chunks`
      );
      const byWorldStr = byWorldLines.length > 0 ? byWorldLines.join('\n') : 'No world chunk data';

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('🏘️ ArcadiaMC Towny Stats')
        .setDescription('Overview of active towns, nations, residents, and claimed territory.')
        .addFields(
          {
            name: '🏘️ Towns Coverage',
            value:
              `• **Total Towns:** \`${counts.towns ?? 0}\`\n` +
              `• **In Nations:** \`${counts.townsInNation ?? 0}\`\n` +
              `• **Neutral:** \`${counts.townsNeutral ?? 0}\``,
            inline: true,
          },
          {
            name: '🏳️ Nations Coverage',
            value: `• **Total Nations:** \`${counts.nations ?? 0}\``,
            inline: true,
          },
          {
            name: '👥 Residents Activity',
            value:
              `• **Online:** \`${counts.onlineResidents ?? 0}\`\n` +
              `• **Total Registered:** \`${counts.residents ?? 0}\``,
            inline: true,
          },
          {
            name: '📦 Claimed Territory Chunks',
            value:
              `**Total Chunks:** \`${Number(claimedChunks.total ?? 0).toLocaleString()}\`\n\n` +
              `**Breakdown by World:**\n` +
              `\`\`\`text\n${byWorldStr}\n\`\`\``,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Subcommand: Town ──────────────────────────────────────────────
    if (subcommand === 'town') {
      const query = interaction.options.getString('name')?.trim();
      const queryLower = query?.toLowerCase() || '';
      const queryClean = queryLower.replace(/_/g, ' ');

      const towns = Array.isArray(data.towns) ? data.towns : [];
      const town = towns.find((t) => {
        if (!t) return false;
        const nameLower = t.name ? t.name.toLowerCase() : '';
        const nameClean = nameLower.replace(/_/g, ' ');
        const slugLower = t.slug ? t.slug.toLowerCase() : '';
        const idLower = t.id ? t.id.toLowerCase() : '';

        return (
          nameLower === queryLower ||
          nameClean === queryClean ||
          slugLower === queryLower ||
          idLower === queryLower
        );
      });

      if (!town) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Town Not Found',
              `No town matching \`${query}\` could be found. Please check your query or use autocomplete.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const flags = town.flags || {};
      const claims = town.claims || {};
      const spawn = town.spawn || {};
      const home = town.homeblock || {};
      const mayor = town.mayor || {};
      const nation = town.nation || null;

      const formattedName = town.name ? town.name.replace(/_/g, ' ') : 'Unknown Town';
      const mayorName = mayor.name || 'Unknown';
      const mayorUuid = mayor.uuid || 'N/A';
      const nationName = nation?.name ? nation.name.replace(/_/g, ' ') : 'None (Neutral)';

      const flagsStr = [
        `${flags.pvp ? '🟢' : '🔴'} PVP`,
        `${flags.mobs ? '🟢' : '🔴'} Mobs`,
        `${flags.fire ? '🟢' : '🔴'} Fire`,
        `${flags.explosion ? '🟢' : '🔴'} Explosions`,
        `${flags.open ? '🟢' : '🔴'} Open`,
        `${flags.public ? '🟢' : '🔴'} Public`,
      ].join('  ·  ');

      const spawnLoc = spawn.world
        ? `\`${spawn.world}\` (X: ${Math.round(spawn.x ?? 0)}, Y: ${Math.round(spawn.y ?? 0)}, Z: ${Math.round(spawn.z ?? 0)})`
        : 'N/A';

      const homeLoc = home.world
        ? `\`${home.world}\` (X: ${home.x ?? 0}, Z: ${home.z ?? 0})`
        : 'N/A';

      const createdTs = town.createdAt ? Math.floor(town.createdAt / 1000) : null;
      const lastOnlineTs = town.lastOnlineAt ? Math.floor(town.lastOnlineAt / 1000) : null;

      const createdStr = createdTs ? `<t:${createdTs}:F> (<t:${createdTs}:R>)` : 'Unknown';
      const lastOnlineStr = lastOnlineTs
        ? `<t:${lastOnlineTs}:F> (<t:${lastOnlineTs}:R>)`
        : 'Unknown';

      // Chunks visual bar helper
      const claimedVal = claims.claimedChunks ?? 0;
      const bonusVal = claims.bonusChunks ?? 0;
      const totalCapacity = claimedVal + bonusVal || 1;
      const claimedBarCount = Math.round((claimedVal / totalCapacity) * 10);
      const visualBar = '🟩'.repeat(claimedBarCount) + '⬜'.repeat(10 - claimedBarCount);

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`🏘️ Town Profile: ${formattedName}`)
        .setDescription(`Detailed profile telemetry for town **${formattedName}**.`)
        .addFields(
          {
            name: '👑 Leadership & Nation',
            value: `• **Mayor:** \`${mayorName}\`\n• **Mayor UUID:** \`${mayorUuid.substring(0, 8)}...\`\n• **Nation:** \`${nationName}\``,
            inline: true,
          },
          {
            name: '👥 Population',
            value: `• **Online:** \`${town.onlineResidents ?? 0}\`\n• **Total Residents:** \`${town.residents ?? 0}\``,
            inline: true,
          },
          {
            name: '🚩 Town Permissions & Flags',
            value: flagsStr,
            inline: false,
          },
          {
            name: '📦 Chunks Capacity & Territory',
            value:
              `• **Claimed:** \`${Number(claims.claimedChunks ?? 0).toLocaleString()}\` chunks\n` +
              `• **Bonus:** \`${Number(claims.bonusChunks ?? 0).toLocaleString()}\` chunks\n` +
              `• **Outpost:** \`${Number(claims.outpostChunks ?? 0).toLocaleString()}\` chunks\n` +
              `• **Capacity Distribution:**\n${visualBar}`,
            inline: false,
          },
          {
            name: '📍 Coordinates & Coordinates',
            value: `• **Homeblock:** ${homeLoc}\n• **Spawn Location:** ${spawnLoc}`,
            inline: false,
          },
          {
            name: '📅 Timeline',
            value: `• **Created:** ${createdStr}\n• **Last Online Activity:** ${lastOnlineStr}`,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Subcommand: Nation ────────────────────────────────────────────
    if (subcommand === 'nation') {
      const query = interaction.options.getString('name')?.trim();
      const queryLower = query?.toLowerCase() || '';
      const queryClean = queryLower.replace(/_/g, ' ');

      const nations = Array.isArray(data.nations) ? data.nations : [];
      const nation = nations.find((n) => {
        if (!n) return false;
        const nameLower = n.name ? n.name.toLowerCase() : '';
        const nameClean = nameLower.replace(/_/g, ' ');
        const slugLower = n.slug ? n.slug.toLowerCase() : '';
        const idLower = n.id ? n.id.toLowerCase() : '';

        return (
          nameLower === queryLower ||
          nameClean === queryClean ||
          slugLower === queryLower ||
          idLower === queryLower
        );
      });

      if (!nation) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Nation Not Found',
              `No nation matching \`${query}\` could be found. Please check your query or use autocomplete.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const flags = nation.flags || {};
      const king = nation.king || {};
      const capital = nation.capital || {};
      const diplomacy = nation.diplomacy || {};

      const formattedName = nation.name ? nation.name.replace(/_/g, ' ') : 'Unknown Nation';
      const kingName = king.name || 'Unknown';
      const kingUuid = king.uuid || 'N/A';
      const capitalName = capital.name ? capital.name.replace(/_/g, ' ') : 'N/A';

      const flagsStr = [
        `${flags.pvp ? '🟢' : '🔴'} PVP`,
        `${flags.neutral ? '🟢' : '🔴'} Neutrality`,
        `${flags.public ? '🟢' : '🔴'} Public Taxing`,
      ].join('  ·  ');

      const alliesList = Array.isArray(diplomacy.allies) ? diplomacy.allies : [];
      let alliesText =
        alliesList.length > 0
          ? alliesList
              .map((a) => (a.name ? a.name.replace(/_/g, ' ') : a.slug || 'Unknown'))
              .join(', ')
          : 'None';
      if (alliesText.length > 950) {
        alliesText = alliesText.slice(0, 950) + `... (${alliesList.length} total)`;
      }

      const enemiesList = Array.isArray(diplomacy.enemies) ? diplomacy.enemies : [];
      let enemiesText =
        enemiesList.length > 0
          ? enemiesList
              .map((e) => (e.name ? e.name.replace(/_/g, ' ') : e.slug || 'Unknown'))
              .join(', ')
          : 'None';
      if (enemiesText.length > 950) {
        enemiesText = enemiesText.slice(0, 950) + `... (${enemiesList.length} total)`;
      }

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`🏳️ Nation Profile: ${formattedName}`)
        .setDescription(`Detailed profile telemetry for nation **${formattedName}**.`)
        .addFields(
          {
            name: '👑 Leadership & Capital',
            value: `• **King:** \`${kingName}\`\n• **King UUID:** \`${kingUuid.substring(0, 8)}...\`\n• **Capital Town:** \`${capitalName}\``,
            inline: true,
          },
          {
            name: '📊 Coverage & Population',
            value: `• **Member Towns:** \`${Number(nation.towns ?? 0).toLocaleString()}\`\n• **Online Residents:** \`${Number(nation.onlineResidents ?? 0).toLocaleString()}\`\n• **Total Residents:** \`${Number(nation.residents ?? 0).toLocaleString()}\``,
            inline: true,
          },
          {
            name: '🚩 Nation Flags',
            value: flagsStr,
            inline: false,
          },
          {
            name: `🤝 Allies (${diplomacy.alliesCount ?? alliesList.length})`,
            value: `\`\`\`text\n${alliesText}\n\`\`\``,
            inline: false,
          },
          {
            name: `⚔️ Enemies (${diplomacy.enemiesCount ?? enemiesList.length})`,
            value: `\`\`\`text\n${enemiesText}\n\`\`\``,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Subcommand: Top ───────────────────────────────────────────────
    if (subcommand === 'top') {
      const metric = interaction.options.getString('metric');
      let title = '';
      let subtitle = '';
      let labels = [];
      let values = [];
      let listLines = [];
      let suffix = '';

      if (metric === 'towns_population') {
        const sorted = [...(data.towns || [])]
          .filter((t) => t && t.name)
          .sort((a, b) => (b.residents ?? 0) - (a.residents ?? 0))
          .slice(0, 10);
        title = '🏘️ Top Towns by Population';
        subtitle = 'Ranked by total resident population on ArcadiaMC';
        suffix = ' Residents';
        labels = sorted.map((t) => t.name);
        values = sorted.map((t) => t.residents ?? 0);
        listLines = sorted.map(
          (t, idx) =>
            `**#${idx + 1}** \`${t.name.replace(/_/g, ' ').padEnd(16)}\` — **${Number(t.residents ?? 0).toLocaleString()}** residents`
        );
      } else if (metric === 'towns_chunks') {
        const sorted = [...(data.towns || [])]
          .filter((t) => t && t.name)
          .sort((a, b) => (b.claims?.claimedChunks ?? 0) - (a.claims?.claimedChunks ?? 0))
          .slice(0, 10);
        title = '📦 Top Towns by Territory size';
        subtitle = 'Ranked by total claimed chunks count on ArcadiaMC';
        suffix = ' Chunks';
        labels = sorted.map((t) => t.name);
        values = sorted.map((t) => t.claims?.claimedChunks ?? 0);
        listLines = sorted.map(
          (t, idx) =>
            `**#${idx + 1}** \`${t.name.replace(/_/g, ' ').padEnd(16)}\` — **${Number(t.claims?.claimedChunks ?? 0).toLocaleString()}** chunks`
        );
      } else if (metric === 'nations_population') {
        const sorted = [...(data.nations || [])]
          .filter((n) => n && n.name)
          .sort((a, b) => (b.residents ?? 0) - (a.residents ?? 0))
          .slice(0, 10);
        title = '🏳️ Top Nations by Population';
        subtitle = 'Ranked by combined resident population on ArcadiaMC';
        suffix = ' Residents';
        labels = sorted.map((n) => n.name);
        values = sorted.map((n) => n.residents ?? 0);
        listLines = sorted.map(
          (n, idx) =>
            `**#${idx + 1}** \`${n.name.replace(/_/g, ' ').padEnd(16)}\` — **${Number(n.residents ?? 0).toLocaleString()}** residents`
        );
      } else if (metric === 'nations_towns') {
        const sorted = [...(data.nations || [])]
          .filter((n) => n && n.name)
          .sort((a, b) => (b.towns ?? 0) - (a.towns ?? 0))
          .slice(0, 10);
        title = '🏘️ Top Nations by Town Count';
        subtitle = 'Ranked by total member towns count on ArcadiaMC';
        suffix = ' Towns';
        labels = sorted.map((n) => n.name);
        values = sorted.map((n) => n.towns ?? 0);
        listLines = sorted.map(
          (n, idx) =>
            `**#${idx + 1}** \`${n.name.replace(/_/g, ' ').padEnd(16)}\` — **${Number(n.towns ?? 0).toLocaleString()}** towns`
        );
      }

      // Generate the visual bar chart
      let chartBuffer;
      try {
        chartBuffer = drawTopChart(labels, values, title.substring(3), subtitle, suffix);
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed('Chart Render Failure', `Failed to render bar chart image: ${err.message}`),
          ],
        });
      }

      const attachment = new AttachmentBuilder(chartBuffer, { name: 'top-chart.png' });

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(title)
        .setDescription(
          `**Top 10 Rankings Overview:**\n\n` + `\`\`\`text\n${listLines.join('\n')}\n\`\`\``
        )
        .setImage('attachment://top-chart.png');

      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    // ── Subcommand: Compare ───────────────────────────────────────────
    if (subcommand === 'compare') {
      const query1 = interaction.options.getString('town1')?.trim().toLowerCase();
      const query2 = interaction.options.getString('town2')?.trim().toLowerCase();

      const towns = Array.isArray(data.towns) ? data.towns : [];
      const t1 = towns.find(
        (t) =>
          t &&
          (t.name?.toLowerCase() === query1 ||
            t.slug?.toLowerCase() === query1 ||
            t.id?.toLowerCase() === query1)
      );
      const t2 = towns.find(
        (t) =>
          t &&
          (t.name?.toLowerCase() === query2 ||
            t.slug?.toLowerCase() === query2 ||
            t.id?.toLowerCase() === query2)
      );

      if (!t1 || !t2) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Towns Not Found',
              'One or both specified towns could not be found. Please check your query or use autocomplete.'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (t1.id === t2.id) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid Comparison',
              'You cannot compare a town with itself. Please select two different towns.'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Prepare stats for visual compare card
      const item1 = {
        name: t1.name || 'Town 1',
        leaderTitle: 'Mayor',
        leaderName: t1.mayor?.name || 'Unknown',
        residents: t1.residents ?? 0,
        chunks: t1.claims?.claimedChunks ?? 0,
        status: t1.nation?.name ? t1.nation.name.replace(/_/g, ' ') : 'Neutral',
        statusColor: t1.nation?.name ? '#3b82f6' : '#64748b',
      };

      const item2 = {
        name: t2.name || 'Town 2',
        leaderTitle: 'Mayor',
        leaderName: t2.mayor?.name || 'Unknown',
        residents: t2.residents ?? 0,
        chunks: t2.claims?.claimedChunks ?? 0,
        status: t2.nation?.name ? t2.nation.name.replace(/_/g, ' ') : 'Neutral',
        statusColor: t2.nation?.name ? '#10b981' : '#64748b',
      };

      let compareBuffer;
      try {
        compareBuffer = drawCompareChart(
          item1,
          item2,
          `Comparing: ${t1.name.replace(/_/g, ' ')} vs ${t2.name.replace(/_/g, ' ')}`
        );
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Comparison Chart Failure',
              `Failed to render comparison card: ${err.message}`
            ),
          ],
        });
      }

      const attachment = new AttachmentBuilder(compareBuffer, { name: 'compare-chart.png' });

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(
          `⚔️ Town Comparison: ${t1.name.replace(/_/g, ' ')} vs ${t2.name.replace(/_/g, ' ')}`
        )
        .setDescription(
          `Comparative profile analysis for **${t1.name.replace(/_/g, ' ')}** and **${t2.name.replace(/_/g, ' ')}**.\n` +
            `• Left Panel Color (**Blue**): **${t1.name.replace(/_/g, ' ')}**\n` +
            `• Right Panel Color (**Green**): **${t2.name.replace(/_/g, ' ')}**`
        )
        .setImage('attachment://compare-chart.png');

      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    // ── Subcommand: History ───────────────────────────────────────────
    if (subcommand === 'history') {
      const typeInput = interaction.options.getString('type') || 'town';
      const nameInput = interaction.options.getString('name')?.trim().toLowerCase() || '';
      const metric = interaction.options.getString('metric') || 'residents';
      const days = interaction.options.getNumber('days') ?? 30;

      if (!db) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Database Unavailable',
              'Database connection is currently not available to fetch history data.'
            ),
          ],
        });
      }

      // 1. Fetch history from DB
      const cutoffDate = new Date();
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      let historyData;
      try {
        historyData = await db
          .select()
          .from(townyHistory)
          .where(
            and(
              eq(townyHistory.name, nameInput),
              eq(townyHistory.type, typeInput),
              gte(townyHistory.date, cutoffStr)
            )
          )
          .orderBy(asc(townyHistory.date));
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed('Database Error', `Failed to fetch history data: ${err.message}`)],
        });
      }

      // 2. Fallback: If no history, check if currently active
      if (!historyData || historyData.length === 0) {
        let activeObj = null;
        if (typeInput === 'town') {
          const towns = Array.isArray(data.towns) ? data.towns : [];
          activeObj = towns.find(
            (t) => t?.name?.toLowerCase() === nameInput || t?.slug?.toLowerCase() === nameInput
          );
        } else {
          const nations = Array.isArray(data.nations) ? data.nations : [];
          activeObj = nations.find(
            (n) => n?.name?.toLowerCase() === nameInput || n?.slug?.toLowerCase() === nameInput
          );
        }

        if (!activeObj) {
          const capitalizedType = typeInput.charAt(0).toUpperCase() + typeInput.slice(1);
          return interaction.editReply({
            embeds: [
              errorEmbed(
                `${capitalizedType} Not Found`,
                `The ${typeInput} \`${nameInput}\` was not found in active listings or history records.`
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const formattedName = activeObj.name ? activeObj.name.replace(/_/g, ' ') : nameInput;
        const capitalizedType = typeInput.charAt(0).toUpperCase() + typeInput.slice(1);
        return interaction.editReply({
          embeds: [
            createBaseEmbed()
              .setColor(EMBED_COLORS.INFO)
              .setTitle(`ℹ️ No History for ${formattedName}`)
              .setDescription(
                `No historical snapshots exist for the ${typeInput} **${formattedName}** in the last ${days} days.\n\n` +
                  `*Note: The history tracker has recently been initialized. Please trigger a manual database sync via \`/forcesync\` or wait for the scheduler to capture stats.*`
              ),
          ],
        });
      }

      // 3. Process history records
      const formattedName = (historyData[0].name || nameInput)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const isNation = typeInput === 'nation';

      const records = historyData.map((row) => {
        const dateStr =
          typeof row.date === 'string'
            ? row.date.substring(0, 10)
            : new Date(row.date).toISOString().split('T')[0];

        const residents = row.residents || 0;
        const chunks = row.chunks || 0;
        const townsCount = row.townsCount || 0;

        let value = metric === 'residents' ? residents : chunks;

        return {
          dateStr,
          residents,
          chunks,
          townsCount,
          value,
        };
      });

      const values = records.map((r) => r.value);

      // 4. Summary metrics
      const startVal = values[0];
      const endVal = values[values.length - 1];
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const avgVal = values.reduce((sum, v) => sum + v, 0) / values.length;

      const changeVal = endVal - startVal;
      const pctChange = startVal > 0 ? (changeVal / startVal) * 100 : 0;
      const changeSign = changeVal >= 0 ? '+' : '';
      const changeStr = `${changeSign}${changeVal.toLocaleString()} (${changeSign}${pctChange.toFixed(2)}%)`;

      // Sparkline builder
      const sparklineBlocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      let sparklineStr = '[ No Data ]';
      if (values.length > 0) {
        if (values.length === 1) {
          sparklineStr = `[ ${sparklineBlocks[3]} ]`;
        } else {
          const min = Math.min(...values);
          const max = Math.max(...values);
          if (min === max) {
            sparklineStr = `[ ${sparklineBlocks[3].repeat(values.length)} ]`;
          } else {
            const spark = values
              .map((v) => {
                const norm = (v - min) / (max - min);
                const idx = Math.min(7, Math.max(0, Math.round(norm * 7)));
                return sparklineBlocks[idx];
              })
              .join('');
            sparklineStr = `[ ${spark} ]`;
          }
        }
      }

      // 5. Generate line chart
      let chartBuffer;
      const metricLabel =
        metric === 'residents' ? 'Residents' : isNation ? 'Town Count' : 'Claimed Chunks';

      try {
        chartBuffer = drawHistoryLineChart(
          records.map((r) => r.dateStr),
          [
            {
              label: `${formattedName} (${metricLabel})`,
              rates: values,
            },
          ],
          `${formattedName} ${metricLabel} History (${days}d)`
        );
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Chart Render Failure',
              `Failed to render history line chart: ${err.message}`
            ),
          ],
        });
      }

      const file = new AttachmentBuilder(chartBuffer, { name: 'towny-history-chart.png' });

      // Table formatting utility
      const buildTable = (chunk) => {
        const headerDate = 'Date';
        let headerVal =
          metric === 'residents' ? 'Residents' : isNation ? 'Towns (Chunks)' : 'Chunks';
        const header = `${headerDate.padEnd(12)} ${headerVal}`;
        const separator = '─'.repeat(28);

        const rows = chunk.map((item) => {
          const dStr = item.dateStr.padEnd(12);
          let vStr;
          if (metric === 'residents') {
            vStr = `${item.residents.toLocaleString()}`;
          } else {
            vStr = isNation
              ? `${item.townsCount} (${item.chunks.toLocaleString()})`
              : `${item.chunks.toLocaleString()}`;
          }
          return `${dStr} ${vStr}`;
        });

        return '```text\n' + [header, separator, ...rows].join('\n') + '\n```';
      };

      // 6. Pagination layout setup (reverse to show newest first in log)
      const displayRecords = [...records].reverse();
      const ITEMS_PER_PAGE = 8;
      const pages = [];
      for (let i = 0; i < displayRecords.length; i += ITEMS_PER_PAGE) {
        pages.push(displayRecords.slice(i, i + ITEMS_PER_PAGE));
      }
      const totalPages = pages.length;
      let currentPage = 0;

      const buildEmbed = (pageIdx) => {
        const chunk = pages[pageIdx];
        const displayMetric = metric === 'residents' ? 'Residents' : 'Claimed Chunks';

        return createBaseEmbed()
          .setColor(EMBED_COLORS.CYBER)
          .setTitle(`📈 ${formattedName} History`)
          .setDescription(
            `**Type:** ${typeInput.toUpperCase()} · **Metric:** ${displayMetric} · **Window:** Past ${days} Days`
          )
          .addFields(
            {
              name: `📊 ${days}-Day Trend (${metricLabel})`,
              value: `\`${sparklineStr}\``,
              inline: false,
            },
            {
              name: `▶️ Start ${metricLabel}`,
              value: `\`${startVal.toLocaleString()}\``,
              inline: true,
            },
            {
              name: `⏹️ End ${metricLabel}`,
              value: `\`${endVal.toLocaleString()}\``,
              inline: true,
            },
            {
              name: '📈 Total Change',
              value: `\`${changeStr}\``,
              inline: true,
            },
            {
              name: `⬇️ Min ${metricLabel}`,
              value: `\`${minVal.toLocaleString()}\``,
              inline: true,
            },
            {
              name: `⬆️ Max ${metricLabel}`,
              value: `\`${maxVal.toLocaleString()}\``,
              inline: true,
            },
            {
              name: `⚖️ Average ${metricLabel}`,
              value: `\`${Math.round(avgVal).toLocaleString()}\``,
              inline: true,
            },
            {
              name: `📜 History Log (Page ${pageIdx + 1}/${totalPages})`,
              value: buildTable(chunk),
              inline: false,
            }
          )
          .setImage('attachment://towny-history-chart.png');
      };

      const buildButtons = (pageIdx) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`townyhist_prev_${interaction.id}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIdx === 0),
          new ButtonBuilder()
            .setCustomId(`townyhist_page_${interaction.id}`)
            .setLabel(`${pageIdx + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`townyhist_next_${interaction.id}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIdx === totalPages - 1)
        );
      };

      const message = await interaction.editReply({
        embeds: [buildEmbed(currentPage)],
        components: totalPages > 1 ? [buildButtons(currentPage)] : [],
        files: [file],
      });

      if (totalPages > 1) {
        const collector = message.createMessageComponentCollector({
          time: 5 * 60 * 1000,
        });

        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) {
            return btn.reply({
              content: '❌ Only the command invoker can use these buttons.',
              flags: MessageFlags.Ephemeral,
            });
          }

          if (btn.customId === `townyhist_prev_${interaction.id}`) {
            currentPage = Math.max(0, currentPage - 1);
            await btn.update({
              embeds: [buildEmbed(currentPage)],
              components: [buildButtons(currentPage)],
            });
          } else if (btn.customId === `townyhist_next_${interaction.id}`) {
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            await btn.update({
              embeds: [buildEmbed(currentPage)],
              components: [buildButtons(currentPage)],
            });
          }
        });

        collector.on('end', async () => {
          try {
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('townyhist_prev_done')
                .setLabel('◀ Prev')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('townyhist_page_done')
                .setLabel(`${currentPage + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('townyhist_next_done')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
            await interaction.editReply({
              embeds: [buildEmbed(currentPage)],
              components: [disabledRow],
            });
          } catch {
            // Message may have been deleted
          }
        });
      }
      return;
    }
  },
};
