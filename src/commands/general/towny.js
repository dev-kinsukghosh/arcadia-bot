const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');

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
    .setDescription('View Arcadia Towny statistics, towns, and nations')
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
    let choices = [];

    if (subcommand === 'town') {
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
    } else if (subcommand === 'nation') {
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

    if (subcommand === 'stats') {
      const counts = data.counts || {};
      const claimedChunks = counts.claimedChunks || {};
      const byWorldObj = claimedChunks.byWorld || {};

      const byWorldLines = Object.entries(byWorldObj).map(
        ([world, count]) => `• **${world}**: ${Number(count).toLocaleString()} chunks`
      );
      const byWorldStr = byWorldLines.length > 0 ? byWorldLines.join('\n') : 'No world chunk data';

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('🏘️ Arcadia Towny Statistics')
        .setDescription(
          'Overview of active towns, nations, residents, and claimed chunks on ArcadiaMC.'
        )
        .addFields(
          {
            name: '🏘️ Towns',
            value: `**${Number(counts.towns ?? 0).toLocaleString()}**\n*(${counts.townsInNation ?? 0} in nations • ${counts.townsNeutral ?? 0} neutral)*`,
            inline: true,
          },
          {
            name: '🏳️ Nations',
            value: `**${Number(counts.nations ?? 0).toLocaleString()}**`,
            inline: true,
          },
          {
            name: '👥 Residents',
            value: `**${Number(counts.onlineResidents ?? 0).toLocaleString()}** / **${Number(counts.residents ?? 0).toLocaleString()}** Online`,
            inline: true,
          },
          {
            name: '📦 Claimed Chunks',
            value: `**${Number(claimedChunks.total ?? 0).toLocaleString()}** total chunks`,
            inline: false,
          },
          {
            name: '🌐 Chunks Breakdown by World',
            value: byWorldStr,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

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
        `• **PVP:** ${flags.pvp ? '🟢 On' : '🔴 Off'}`,
        `• **Mobs:** ${flags.mobs ? '🟢 On' : '🔴 Off'}`,
        `• **Fire:** ${flags.fire ? '🟢 On' : '🔴 Off'}`,
        `• **Explosions:** ${flags.explosion ? '🟢 On' : '🔴 Off'}`,
        `• **Open:** ${flags.open ? '🟢 Yes' : '🔴 No'}`,
        `• **Public:** ${flags.public ? '🟢 Yes' : '🔴 No'}`,
      ].join('\n');

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

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`🏘️ Town: ${formattedName}`)
        .setDescription(`Detailed profile telemetry for town **${formattedName}**.`)
        .addFields(
          {
            name: '👑 Leadership & Nation',
            value: `• **Mayor:** ${mayorName}\n• **Mayor UUID:** \`${mayorUuid}\`\n• **Nation:** ${nationName}`,
            inline: true,
          },
          {
            name: '👥 Population',
            value: `• **Online:** ${town.onlineResidents ?? 0}\n• **Total Residents:** ${town.residents ?? 0}`,
            inline: true,
          },
          {
            name: '📦 Territory Chunks',
            value: `• **Claimed:** ${Number(claims.claimedChunks ?? 0).toLocaleString()}\n• **Bonus:** ${Number(claims.bonusChunks ?? 0).toLocaleString()}\n• **Outpost:** ${Number(claims.outpostChunks ?? 0).toLocaleString()}`,
            inline: true,
          },
          {
            name: '🚩 Town Flags',
            value: flagsStr,
            inline: true,
          },
          {
            name: '📍 Coordinates',
            value: `• **Spawn:** ${spawnLoc}\n• **Homeblock:** ${homeLoc}`,
            inline: false,
          },
          {
            name: '📅 Timeline & Activity',
            value: `• **Created:** ${createdStr}\n• **Last Online:** ${lastOnlineStr}`,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

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
        `• **PVP:** ${flags.pvp ? '🟢 On' : '🔴 Off'}`,
        `• **Neutral:** ${flags.neutral ? '🟢 Yes' : '🔴 No'}`,
        `• **Public:** ${flags.public ? '🟢 Yes' : '🔴 No'}`,
      ].join('\n');

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
        .setTitle(`🏳️ Nation: ${formattedName}`)
        .setDescription(`Detailed telemetry for nation **${formattedName}**.`)
        .addFields(
          {
            name: '👑 Leadership & Capital',
            value: `• **King:** ${kingName}\n• **King UUID:** \`${kingUuid}\`\n• **Capital Town:** ${capitalName}`,
            inline: true,
          },
          {
            name: '📊 Towns & Residents',
            value: `• **Towns:** ${Number(nation.towns ?? 0).toLocaleString()}\n• **Online Residents:** ${Number(nation.onlineResidents ?? 0).toLocaleString()}\n• **Total Residents:** ${Number(nation.residents ?? 0).toLocaleString()}`,
            inline: true,
          },
          {
            name: '🚩 Nation Flags',
            value: flagsStr,
            inline: true,
          },
          {
            name: `🤝 Allies (${diplomacy.alliesCount ?? alliesList.length})`,
            value: alliesText,
            inline: false,
          },
          {
            name: `⚔️ Enemies (${diplomacy.enemiesCount ?? enemiesList.length})`,
            value: enemiesText,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
