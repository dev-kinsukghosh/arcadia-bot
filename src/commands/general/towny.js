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
const logger = require('../../utils/logger.js');
const {
  drawTopChart,
  drawCompareChart,
  drawHistoryLineChart,
} = require('../../utils/canvasGraph.js');
const { db } = require('../../utils/db.js');
const { townyHistory, playerProfiles } = require('../../db/schema.js');
const { getPlayersCache } = require('../../services/playerSync.js');
const { and, eq, gte, asc, or } = require('drizzle-orm');

// Local cache for towny data during autocomplete to prevent excessive API requests
let townyCache = null;
let lastCacheFetch = 0;
const CACHE_TTL = 300 * 1000; // 5 minutes TTL

async function fetchTownyData() {
  const now = Date.now();
  if (townyCache && now - lastCacheFetch < CACHE_TTL) {
    return townyCache;
  }

  // 1. Try Redis cache first (populated by background worker townySync)
  const redisClient = require('../../utils/redis.js');
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:towny');
      if (cached) {
        townyCache = JSON.parse(cached);
        lastCacheFetch = now;
        return townyCache;
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback to API if Redis is down or empty
  try {
    const rawData = await arcadiaApi.getTowny();
    if (rawData) {
      const { processTownyData } = require('../../utils/townOwnerManager.js');
      townyCache = await processTownyData(rawData);
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
        .setDescription('Compare 2 to 4 towns or nations side-by-side with a graph')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Type of comparison (Towns or Nations)')
            .setRequired(true)
            .addChoices(
              { name: 'Towns', value: 'town' },
              { name: 'Nations', value: 'nation' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('target1')
            .setDescription('The first town or nation to compare')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('target2')
            .setDescription('The second town or nation to compare')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('target3')
            .setDescription('Optional third town or nation to compare')
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('target4')
            .setDescription('Optional fourth town or nation to compare')
            .setRequired(false)
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
    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value ? focusedOption.value.toLowerCase().trim() : '';

      const data = await fetchTownyData();
      if (!data) {
        return interaction.respond([]).catch(() => {});
      }

      const subcommand = interaction.options.getSubcommand();
      const type = interaction.options.getString('type') || 'town';
      let choices = [];

      const isCompareTarget =
        subcommand === 'compare' &&
        (focusedOption.name.startsWith('target') ||
          focusedOption.name === 'town1' ||
          focusedOption.name === 'town2');

      const isTownLookup =
        (focusedOption.name === 'name' && subcommand === 'town') ||
        (isCompareTarget && type === 'town') ||
        (focusedOption.name === 'name' && subcommand === 'history' && type === 'town');

      const isNationLookup =
        (focusedOption.name === 'name' && subcommand === 'nation') ||
        (isCompareTarget && type === 'nation') ||
        (focusedOption.name === 'name' && subcommand === 'history' && type === 'nation');

      if (isTownLookup) {
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
      } else if (isNationLookup) {
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

      await interaction.respond(choices);
    } catch {
      // Silently ignore autocomplete errors
    }
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply();

    const { processTownyData, isNpcPlayer } = require('../../utils/townOwnerManager.js');
    let data;
    try {
      const rawData = await arcadiaApi.getTowny();
      data = await processTownyData(rawData);
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
            value:
              `• **Mayor / Owner:** \`${mayorName}\`${town.ruined ? ' *(Preserved)*' : ''}\n` +
              (town.ruined ? `• **Status:** \`⚠️ Ruined (Fallen into ruin)\`\n` : '') +
              `• **Mayor UUID:** \`${mayorUuid.substring(0, 8)}...\`\n• **Nation:** \`${nationName}\``,
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

      // Fetch 30 days history for graph
      let historyData = [];
      if (db) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];

          historyData = await db
            .select()
            .from(townyHistory)
            .where(
              and(
                eq(townyHistory.name, town.name.toLowerCase()),
                eq(townyHistory.type, 'town'),
                gte(townyHistory.date, cutoffStr)
              )
            )
            .orderBy(asc(townyHistory.date));
        } catch {
          // ignore DB error
        }
      }

      let chartFile = null;
      if (historyData && historyData.length > 0) {
        try {
          const dates = historyData.map((row) => {
            const dateStr =
              typeof row.date === 'string'
                ? row.date
                : new Date(row.date).toISOString().split('T')[0];
            return dateStr;
          });
          const residentsRates = historyData.map((row) => row.residents || 0);

          const chartBuffer = drawHistoryLineChart(
            dates,
            [
              {
                label: 'Residents',
                rates: residentsRates,
              },
            ],
            `${formattedName} Residents History (30d)`
          );
          chartFile = new AttachmentBuilder(chartBuffer, { name: 'town-history.png' });
          embed.setImage('attachment://town-history.png');
        } catch {
          // ignore graph render error
        }
      }

      const { createTownNavRow } = require('../../utils/discordNavHelper.js');
      const { initNavState } = require('../../utils/discordNavState.js');
      const navRow = createTownNavRow(
        town.name,
        mayorName !== 'Unknown' ? mayorName : null,
        nation?.name || null,
        { ownerId: interaction.user.id }
      );

      const initialResponse = await interaction.editReply({
        embeds: [embed],
        files: chartFile ? [chartFile] : [],
        components: navRow ? [navRow] : [],
      });

      if (initialResponse?.id) {
        initNavState(initialResponse.id, interaction.user.id, { type: 'town', name: town.name });
      }

      if (initialResponse) {
        const collector = initialResponse.createMessageComponentCollector({ time: 300000 });
        let residentPage = 0;

        collector.on('collect', async (i) => {
          // Ignore global navigation buttons (nav_player, nav_town, nav_nation) handled by interactionCreate.js
          if (!i.customId.startsWith('towny_btn_') && !i.customId.startsWith('towny_res_page_')) {
            return;
          }

          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: 'Only the command user can interact with these buttons.',
              flags: MessageFlags.Ephemeral,
            });
          }

          try {
            if (!i.deferred && !i.replied) {
              await i.deferUpdate().catch(() => {});
            }

            // ── Action: Back to Town Main Info ───────────────────────────
            if (i.customId === 'towny_btn_town_info') {
              return interaction.editReply({
                embeds: [embed],
                files: chartFile ? [chartFile] : [],
                components: navRow ? [navRow] : [],
              });
            }

            // ── Action: View Residents List ──────────────────────────────
            if (
              i.customId.startsWith('towny_btn_residents_') ||
              i.customId.startsWith('towny_res_page_')
            ) {
              if (i.customId.startsWith('towny_res_page_prev')) residentPage--;
              if (i.customId.startsWith('towny_res_page_next')) residentPage++;

              const residentsMap = new Map();

              // 1. Query DB player_profiles for residents recorded in this town
              if (db) {
                try {
                  const dbRes = await db
                    .select()
                    .from(playerProfiles)
                    .where(
                      or(eq(playerProfiles.townId, town.id), eq(playerProfiles.townName, town.name))
                    );
                  for (const r of dbRes) {
                    if (isNpcPlayer(r.name)) continue;
                    residentsMap.set(r.name.toLowerCase(), {
                      name: r.name,
                      displayName: r.displayName || r.name,
                      rank: r.rank || 'PLAYER',
                      isOnline: false,
                      lastSeen: r.lastSeen,
                      isMayor:
                        r.name?.toLowerCase() === mayorName.toLowerCase() ||
                        r.uuid?.toLowerCase() === mayorUuid.toLowerCase(),
                    });
                  }
                } catch {
                  // ignore DB query error
                }
              }

              // 2. Query Live Online Players Cache
              const playersCache = await getPlayersCache();
              const onlineList = Array.isArray(playersCache?.players) ? playersCache.players : [];
              for (const p of onlineList) {
                if (isNpcPlayer(p.name)) continue;
                if (
                  p.town?.id === town.id ||
                  p.town?.name?.toLowerCase() === town.name.toLowerCase()
                ) {
                  const existing = residentsMap.get(p.name.toLowerCase()) || {};
                  residentsMap.set(p.name.toLowerCase(), {
                    ...existing,
                    name: p.name,
                    displayName: p.displayName || p.name,
                    rank: p.rank || 'PLAYER',
                    isOnline: true,
                    location: p.location,
                    chatChannel: p.chatChannel,
                    isMayor:
                      p.name?.toLowerCase() === mayorName.toLowerCase() ||
                      p.uuid?.toLowerCase() === mayorUuid.toLowerCase(),
                  });
                }
              }

              // 3. Include Mayor if not in map yet
              if (
                mayorName &&
                mayorName !== 'Unknown' &&
                !isNpcPlayer(mayorName) &&
                !residentsMap.has(mayorName.toLowerCase())
              ) {
                residentsMap.set(mayorName.toLowerCase(), {
                  name: mayorName,
                  displayName: mayorName,
                  rank: town.ruined ? 'MAYOR / OWNER' : 'MAYOR',
                  isOnline: false,
                  isMayor: true,
                });
              }

              const allResidents = Array.from(residentsMap.values());
              // Sort: Mayor first, then online, then offline
              allResidents.sort((a, b) => {
                if (a.isMayor) return -1;
                if (b.isMayor) return 1;
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return a.name.localeCompare(b.name);
              });

              const pageSize = 8;
              const totalResPages = Math.ceil(allResidents.length / pageSize) || 1;
              if (residentPage < 0) residentPage = 0;
              if (residentPage >= totalResPages) residentPage = totalResPages - 1;

              const pageItems = allResidents.slice(
                residentPage * pageSize,
                (residentPage + 1) * pageSize
              );

              const residentLines = pageItems.map((r, idx) => {
                const num = residentPage * pageSize + idx + 1;
                const mayorBadge = r.isMayor
                  ? town.ruined
                    ? ' 👑 **[MAYOR / PRESERVED OWNER]**'
                    : ' 👑 **[MAYOR]**'
                  : '';
                const rankTag = r.rank ? ` \`[${r.rank}]\`` : '';
                const dispStr =
                  r.displayName && r.displayName !== r.name ? ` (*${r.displayName}*)` : '';

                if (r.isOnline) {
                  const locStr = r.location?.world
                    ? ` — 📍 \`${r.location.world}\` (${Math.round(r.location.x ?? 0)}, ${Math.round(r.location.y ?? 0)}, ${Math.round(r.location.z ?? 0)})`
                    : '';
                  return `**${num}.** 🟢 **\`${r.name}\`**${dispStr}${mayorBadge}${rankTag}${locStr}`;
                }

                const lastSeenTs = r.lastSeen
                  ? Math.floor(new Date(r.lastSeen).getTime() / 1000)
                  : null;
                const timeStr = lastSeenTs ? ` (Last seen <t:${lastSeenTs}:R>)` : '';
                return `**${num}.** ⚪ **\`${r.name}\`**${dispStr}${mayorBadge}${rankTag}${timeStr}`;
              });

              const resEmbed = createBaseEmbed()
                .setColor(EMBED_COLORS.CYBER)
                .setTitle(
                  `👥 Residents Directory: ${formattedName} (Page ${residentPage + 1}/${totalResPages})`
                )
                .setDescription(
                  `Showing **${allResidents.length}** recorded resident(s) for town **${formattedName}**.\n\n` +
                    (residentLines.length > 0
                      ? residentLines.join('\n')
                      : 'No resident telemetry recorded yet.')
                );

              const navRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('towny_res_page_prev')
                  .setLabel('◀ Prev')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(residentPage === 0),
                new ButtonBuilder()
                  .setCustomId('towny_res_page_indicator')
                  .setLabel(`Page ${residentPage + 1} of ${totalResPages}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId('towny_res_page_next')
                  .setLabel('Next ▶')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(residentPage >= totalResPages - 1),
                new ButtonBuilder()
                  .setCustomId('towny_btn_town_info')
                  .setLabel('🏠 Town Overview')
                  .setStyle(ButtonStyle.Primary)
              );

              await interaction.editReply({
                embeds: [resEmbed],
                files: [],
                components: [navRow],
              });
            }

            // ── Action: View Nation ────────────────────────────────────────
            if (i.customId.startsWith('towny_btn_nation_')) {
              const nSlug = i.customId.replace('towny_btn_nation_', '');
              const nationsList = Array.isArray(data.nations) ? data.nations : [];
              const targetNation = nationsList.find(
                (n) =>
                  n?.slug?.toLowerCase() === nSlug.toLowerCase() ||
                  n?.name?.toLowerCase() === nSlug.toLowerCase()
              );

              if (targetNation) {
                const nKing = targetNation.king || {};
                const nCap = targetNation.capital || {};
                const nFmtName = targetNation.name ? targetNation.name.replace(/_/g, ' ') : nSlug;

                const nationEmbed = createBaseEmbed()
                  .setColor(EMBED_COLORS.CYBER)
                  .setTitle(`🏳️ Nation Profile: ${nFmtName}`)
                  .setDescription(`Detailed profile telemetry for nation **${nFmtName}**.`)
                  .addFields(
                    {
                      name: '👑 Leadership & Capital',
                      value: `• **King:** \`${nKing.name || 'Unknown'}\`\n• **Capital:** \`${nCap.name ? nCap.name.replace(/_/g, ' ') : 'N/A'}\``,
                      inline: true,
                    },
                    {
                      name: '📊 Coverage & Population',
                      value: `• **Member Towns:** \`${targetNation.towns ?? 0}\`\n• **Online Residents:** \`${targetNation.onlineResidents ?? 0}\`\n• **Total Residents:** \`${targetNation.residents ?? 0}\``,
                      inline: true,
                    }
                  );

                const backRow = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('towny_btn_town_info')
                    .setLabel('🏠 Back to Town Profile')
                    .setStyle(ButtonStyle.Primary)
                );

                await interaction.editReply({
                  embeds: [nationEmbed],
                  files: [],
                  components: [backRow],
                });
              }
            }
          } catch (err) {
            logger.error(`Towny collector error: ${err.message}`);
          }
        });
      }
      return;
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

      // Fetch 30 days history for graph
      let historyData = [];
      if (db) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];

          historyData = await db
            .select()
            .from(townyHistory)
            .where(
              and(
                eq(townyHistory.name, nation.name.toLowerCase()),
                eq(townyHistory.type, 'nation'),
                gte(townyHistory.date, cutoffStr)
              )
            )
            .orderBy(asc(townyHistory.date));
        } catch {
          // ignore DB error
        }
      }

      let chartFile = null;
      if (historyData && historyData.length > 0) {
        try {
          const dates = historyData.map((row) => {
            const dateStr =
              typeof row.date === 'string'
                ? row.date
                : new Date(row.date).toISOString().split('T')[0];
            return dateStr;
          });
          const residentsRates = historyData.map((row) => row.residents || 0);
          const townsRates = historyData.map((row) => row.townsCount || 0);

          const chartBuffer = drawHistoryLineChart(
            dates,
            [
              {
                label: 'Residents',
                rates: residentsRates,
              },
              {
                label: 'Towns',
                rates: townsRates,
              },
            ],
            `${formattedName} History (30d)`
          );
          chartFile = new AttachmentBuilder(chartBuffer, { name: 'nation-history.png' });
          embed.setImage('attachment://nation-history.png');
        } catch {
          // ignore graph render error
        }
      }

      const { createNationNavRow } = require('../../utils/discordNavHelper.js');
      const { initNavState } = require('../../utils/discordNavState.js');
      const navRow = createNationNavRow(
        nation.name,
        kingName !== 'Unknown' ? kingName : null,
        capital.name || null,
        { ownerId: interaction.user.id }
      );

      const initialResponse = await interaction.editReply({
        embeds: [embed],
        files: chartFile ? [chartFile] : [],
        components: navRow ? [navRow] : [],
      });

      if (initialResponse?.id) {
        initNavState(initialResponse.id, interaction.user.id, {
          type: 'nation',
          name: nation.name,
        });
      }

      return initialResponse;
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
      const type = (interaction.options.getString('type') || 'town').toLowerCase();
      const isNation = type === 'nation';
      const entityLabelSingular = isNation ? 'Nation' : 'Town';
      const entityLabelPlural = isNation ? 'Nations' : 'Towns';

      const rawTargets = [
        interaction.options.getString('target1') || interaction.options.getString('town1'),
        interaction.options.getString('target2') || interaction.options.getString('town2'),
        interaction.options.getString('target3'),
        interaction.options.getString('target4'),
      ]
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0);

      if (rawTargets.length < 2) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Insufficient Targets',
              `Please provide at least 2 ${entityLabelPlural.toLowerCase()} to compare (minimum 2, maximum 4).`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const towns = Array.isArray(data.towns) ? data.towns : [];
      const nations = Array.isArray(data.nations) ? data.nations : [];

      const findEntity = (query) => {
        const ql = query.toLowerCase();
        const qc = ql.replace(/_/g, ' ');
        const pool = isNation ? nations : towns;
        return pool.find((item) => {
          if (!item) return false;
          const nameLower = item.name?.toLowerCase() || '';
          const nameClean = nameLower.replace(/_/g, ' ');
          const slugLower = item.slug?.toLowerCase() || '';
          const idLower = item.id ? String(item.id).toLowerCase() : '';
          return nameLower === ql || nameClean === qc || slugLower === ql || idLower === ql;
        });
      };

      const matched = [];
      const notFound = [];
      for (const targetQuery of rawTargets) {
        const item = findEntity(targetQuery);
        if (!item) {
          notFound.push(targetQuery);
        } else {
          matched.push(item);
        }
      }

      if (notFound.length > 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              `${entityLabelPlural} Not Found`,
              `The following ${entityLabelPlural.toLowerCase()} could not be found: ${notFound.map((q) => `\`${q}\``).join(', ')}. Please verify the spelling or select from autocomplete.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const uniqueKeys = new Set(matched.map((m) => m.id || m.name?.toLowerCase()));
      if (uniqueKeys.size < matched.length) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Duplicate Comparison',
              `You cannot compare identical ${entityLabelPlural.toLowerCase()}. Please select distinct ${entityLabelPlural.toLowerCase()}.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const BADGES = ['🟦', '🟩', '🟪', '🟧'];
      const HEX_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];

      const items = matched.map((m, idx) => {
        const cleanName = m.name ? m.name.replace(/_/g, ' ') : `${entityLabelSingular} ${idx + 1}`;
        if (isNation) {
          let totalChunks = Number(m.chunks || 0);
          if (!totalChunks && Array.isArray(data.towns)) {
            totalChunks = data.towns
              .filter((t) => t.nation && (t.nation.name === m.name || t.nation.id === m.id))
              .reduce((sum, t) => sum + (t.claims?.claimedChunks || 0), 0);
          }
          return {
            id: m.id,
            name: cleanName,
            rawName: m.name,
            type: 'nation',
            tag: `NATION ${idx + 1}`,
            badge: BADGES[idx],
            color: HEX_COLORS[idx],
            leaderTitle: 'King',
            leaderName: m.king?.name || 'Unknown',
            residents: Number(m.residents ?? 0),
            towns: Number(m.towns ?? 0),
            chunks: totalChunks,
            statusTitle: 'CAPITAL',
            status: m.capital?.name ? m.capital.name.replace(/_/g, ' ') : 'N/A',
            pvp: m.flags?.pvp,
          };
        } else {
          return {
            id: m.id,
            name: cleanName,
            rawName: m.name,
            type: 'town',
            tag: `TOWN ${idx + 1}`,
            badge: BADGES[idx],
            color: HEX_COLORS[idx],
            leaderTitle: 'Mayor',
            leaderName: m.mayor?.name || 'Unknown',
            residents: Number(m.residents ?? 0),
            chunks: Number(m.claims?.claimedChunks ?? 0),
            statusTitle: 'NATION',
            status: m.nation?.name ? m.nation.name.replace(/_/g, ' ') : 'Neutral',
            pvp: m.flags?.pvp,
            spawnWorld: m.spawn?.world || 'N/A',
          };
        }
      });

      const chartTitle =
        items.length === 2
          ? `Comparing: ${items[0].name} vs ${items[1].name}`
          : `Comparing ${items.length} ${entityLabelPlural}: ${items.map((it) => it.name).join(' vs ')}`;

      let compareBuffer;
      try {
        compareBuffer = drawCompareChart(items, chartTitle);
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

      // Calculate head-to-head leaders
      const maxPop = Math.max(...items.map((it) => it.residents));
      const popLeaders = items.filter((it) => it.residents === maxPop);
      let popLeaderText = 'Tied';
      if (popLeaders.length === 1) {
        if (items.length === 2) {
          const diff = Math.abs(items[0].residents - items[1].residents);
          popLeaderText = `**${popLeaders[0].name}** (+${diff.toLocaleString()} residents)`;
        } else {
          popLeaderText = `**${popLeaders[0].name}** (${popLeaders[0].residents.toLocaleString()} residents)`;
        }
      } else if (popLeaders.length < items.length) {
        popLeaderText = `${popLeaders.map((it) => `**${it.name}**`).join(', ')} (${maxPop.toLocaleString()} residents)`;
      }

      let territoryLeaderText = 'Tied';
      if (isNation) {
        const maxTowns = Math.max(...items.map((it) => it.towns));
        const townLeaders = items.filter((it) => it.towns === maxTowns);
        if (townLeaders.length === 1) {
          if (items.length === 2) {
            const diff = Math.abs(items[0].towns - items[1].towns);
            territoryLeaderText = `**${townLeaders[0].name}** (+${diff.toLocaleString()} towns)`;
          } else {
            territoryLeaderText = `**${townLeaders[0].name}** (${townLeaders[0].towns.toLocaleString()} towns)`;
          }
        } else if (townLeaders.length < items.length) {
          territoryLeaderText = `${townLeaders.map((it) => `**${it.name}**`).join(', ')} (${maxTowns.toLocaleString()} towns)`;
        }
      } else {
        const maxChunks = Math.max(...items.map((it) => it.chunks));
        const chunkLeaders = items.filter((it) => it.chunks === maxChunks);
        if (chunkLeaders.length === 1) {
          if (items.length === 2) {
            const diff = Math.abs(items[0].chunks - items[1].chunks);
            territoryLeaderText = `**${chunkLeaders[0].name}** (+${diff.toLocaleString()} chunks)`;
          } else {
            territoryLeaderText = `**${chunkLeaders[0].name}** (${chunkLeaders[0].chunks.toLocaleString()} chunks)`;
          }
        } else if (chunkLeaders.length < items.length) {
          territoryLeaderText = `${chunkLeaders.map((it) => `**${it.name}**`).join(', ')} (${maxChunks.toLocaleString()} chunks)`;
        }
      }

      const embedFields = items.map((it) => {
        let valueLines = [];
        if (isNation) {
          valueLines = [
            `• **King:** \`${it.leaderName}\``,
            `• **Capital:** \`${it.status}\``,
            `• **Member Towns:** \`${it.towns.toLocaleString()}\``,
            `• **Residents:** \`${it.residents.toLocaleString()}\``,
            `• **Total Chunks:** \`${it.chunks.toLocaleString()}\``,
            `• **PVP Status:** \`${it.pvp ? '🟢 Enabled' : '🔴 Disabled'}\``,
          ];
        } else {
          valueLines = [
            `• **Mayor:** \`${it.leaderName}\``,
            `• **Nation:** \`${it.status}\``,
            `• **Residents:** \`${it.residents.toLocaleString()}\``,
            `• **Claimed Chunks:** \`${it.chunks.toLocaleString()}\``,
            `• **PVP Status:** \`${it.pvp ? '🟢 Enabled' : '🔴 Disabled'}\``,
          ];
        }
        return {
          name: `${it.badge} ${it.name}`,
          value: valueLines.join('\n'),
          inline: true,
        };
      });

      const leaderSummaryLines = [
        `• **Population Leader:** ${popLeaderText}`,
        `• **${isNation ? 'Town Count Leader' : 'Territory Leader'}:** ${territoryLeaderText}`,
      ];
      if (!isNation && items.length === 2) {
        leaderSummaryLines.push(
          `• **Spawn Worlds:** \`${items[0].spawnWorld}\` vs \`${items[1].spawnWorld}\``
        );
      }

      embedFields.push({
        name: '📊 Head-to-Head Leaders',
        value: leaderSummaryLines.join('\n'),
        inline: false,
      });

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(
          items.length === 2
            ? `⚔️ ${entityLabelSingular} Comparison: ${items[0].name} vs ${items[1].name}`
            : `⚔️ ${entityLabelSingular} Comparison (${items.length} ${entityLabelPlural})`
        )
        .setDescription(
          `Side-by-side profile telemetry comparison for **${items.map((it) => it.name).join('**, **')}**.`
        )
        .addFields(embedFields)
        .setImage('attachment://compare-chart.png');

      const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';
      const buttonStyles = [
        ButtonStyle.Primary,
        ButtonStyle.Success,
        ButtonStyle.Secondary,
        ButtonStyle.Secondary,
      ];

      const navButtons = items.map((it, idx) => {
        const shortLabel = it.name.length > 18 ? it.name.slice(0, 16) + '…' : it.name;
        const navPrefix = isNation ? 'nav_nation' : 'nav_town';
        return new ButtonBuilder()
          .setCustomId(`${navPrefix}:${encodeURIComponent(it.rawName)}:u_${interaction.user.id}`)
          .setLabel(`Inspect ${shortLabel}`)
          .setEmoji(isNation ? '🏳️' : '🏙️')
          .setStyle(buttonStyles[idx] || ButtonStyle.Secondary);
      });

      navButtons.push(
        new ButtonBuilder()
          .setURL(`${dashboardUrl}/towny?tab=${isNation ? 'nations' : 'towns'}`)
          .setLabel('Web Dashboard')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Link)
      );

      const navRow = new ActionRowBuilder().addComponents(navButtons);

      const compareResponse = await interaction.editReply({
        embeds: [embed],
        files: [attachment],
        components: [navRow],
      });

      if (compareResponse?.id) {
        const { initNavState } = require('../../utils/discordNavState.js');
        initNavState(compareResponse.id, interaction.user.id, {
          type: isNation ? 'nation' : 'town',
          name: items[0].rawName,
        });
      }

      return compareResponse;
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
        const activeObj =
          typeInput === 'town'
            ? (Array.isArray(data.towns) ? data.towns : []).find(
                (t) => t?.name?.toLowerCase() === nameInput || t?.slug?.toLowerCase() === nameInput
              )
            : (Array.isArray(data.nations) ? data.nations : []).find(
                (n) => n?.name?.toLowerCase() === nameInput || n?.slug?.toLowerCase() === nameInput
              );

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
