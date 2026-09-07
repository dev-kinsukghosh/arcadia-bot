const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getPlayersCache } = require('../../services/playerSync.js');
const { db } = require('../../utils/db.js');
const { playerProfiles } = require('../../db/schema.js');
const { eq, or, like } = require('drizzle-orm');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('players')
    .setDescription('View ArcadiaMC online players, database profiles, and player telemetry')
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
      sub.setName('online').setDescription('View list of currently online players on ArcadiaMC')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Look up any player profile (online or recorded in database)')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Name or display name of the player')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase().trim();
      const choices = [];
      const seenNames = new Set();

      // 1. Try online players first
      const data = await getPlayersCache();
      const onlinePlayers = data && Array.isArray(data.players) ? data.players : [];

      for (const p of onlinePlayers) {
        const name = p.name ? p.name.toLowerCase() : '';
        const disp = p.displayName ? p.displayName.toLowerCase() : '';
        if (name.includes(focusedValue) || disp.includes(focusedValue)) {
          const nickLabel =
            p.displayName && p.displayName !== p.name ? ` [Nick: ${p.displayName}]` : '';
          choices.push({
            name: `🟢 ${p.name}${nickLabel} (${p.rank || 'PLAYER'}) — ONLINE`,
            value: p.name,
          });
          seenNames.add(p.name.toLowerCase());
        }
      }

      // 2. Query MySQL database for offline profiles
      if (db) {
        try {
          const dbProfiles = await db
            .select()
            .from(playerProfiles)
            .where(
              or(
                like(playerProfiles.name, `%${focusedValue}%`),
                like(playerProfiles.displayName, `%${focusedValue}%`)
              )
            )
            .limit(25);

          for (const prof of dbProfiles) {
            if (!seenNames.has(prof.name.toLowerCase())) {
              const nickLabel =
                prof.displayName && prof.displayName !== prof.name
                  ? ` [Nick: ${prof.displayName}]`
                  : '';
              choices.push({
                name: `⚪ ${prof.name}${nickLabel} (${prof.rank || 'PLAYER'}) — DB RECORD`,
                value: prof.name,
              });
              seenNames.add(prof.name.toLowerCase());
            }
          }
        } catch {
          // ignore DB search errors
        }
      }

      await interaction.respond(choices.slice(0, 25));
    } catch {
      // Silently ignore autocomplete errors
    }
  },

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    const data = await getPlayersCache();
    const playersList = data && Array.isArray(data.players) ? data.players : [];
    const onlineCount = data?.onlineCount ?? playersList.length;

    // ── Subcommand: Online ─────────────────────────────────────────────
    if (subcommand === 'online') {
      if (playersList.length === 0) {
        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.CYBER)
          .setTitle('🎮 ArcadiaMC Online Players')
          .setDescription('There are currently **0 players online** on ArcadiaMC.');
        return interaction.editReply({ embeds: [embed] });
      }

      // Group players by rank
      const grouped = {};
      playersList.forEach((p) => {
        const rank = (p.rank || 'PLAYER').toUpperCase();
        if (!grouped[rank]) grouped[rank] = [];
        grouped[rank].push(p);
      });

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`🎮 ArcadiaMC Online Players (${onlineCount})`)
        .setDescription(`Current roster of **${onlineCount}** online player(s) on ArcadiaMC.`);

      for (const [rank, list] of Object.entries(grouped)) {
        const playerNames = list.map((p) => {
          const name =
            p.displayName && p.displayName !== p.name ? `${p.name} (${p.displayName})` : p.name;
          const townTag = p.town?.name ? ` [${p.town.name.replace(/_/g, ' ')}]` : '';
          return `\`${name}\`${townTag}`;
        });

        let namesStr = playerNames.join(', ');
        if (namesStr.length > 950) {
          namesStr = namesStr.slice(0, 950) + `... (+${list.length - 15} more)`;
        }

        embed.addFields({
          name: `🔰 Rank: ${rank} (${list.length})`,
          value: namesStr,
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Subcommand: Info ───────────────────────────────────────────────
    if (subcommand === 'info') {
      const query = interaction.options.getString('name').trim().toLowerCase();

      // Check if online first
      const onlinePlayer = playersList.find(
        (p) =>
          p.name?.toLowerCase() === query ||
          p.displayName?.toLowerCase() === query ||
          p.uuid?.toLowerCase() === query
      );

      // Check database record for fallback/offline profiles
      let dbProfile = null;
      if (db) {
        try {
          const records = await db
            .select()
            .from(playerProfiles)
            .where(
              or(
                eq(playerProfiles.name, query),
                eq(playerProfiles.displayName, query),
                eq(playerProfiles.uuid, query)
              )
            );
          if (records.length > 0) {
            dbProfile = records[0];
          }
        } catch {
          // ignore DB error
        }
      }

      if (!onlinePlayer && !dbProfile) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Player Profile Not Found',
              `No player matching \`${query}\` could be found online or in the database history.`
            ),
          ],
        });
      }

      const name = onlinePlayer?.name || dbProfile?.name || query;
      const uuid = onlinePlayer?.uuid || dbProfile?.uuid || 'N/A';
      const rank = onlinePlayer?.rank || dbProfile?.rank || 'PLAYER';
      const displayName = onlinePlayer?.displayName || dbProfile?.displayName || name;
      const isOnline = !!onlinePlayer;

      const townName = (onlinePlayer?.town?.name || dbProfile?.townName || 'None').replace(
        /_/g,
        ' '
      );
      const nationName = (onlinePlayer?.nation?.name || dbProfile?.nationName || 'None').replace(
        /_/g,
        ' '
      );
      const empireName = onlinePlayer?.empire || dbProfile?.empire || 'None';

      const statusBadge = isOnline ? '🟢 **ONLINE**' : '⚪ **OFFLINE**';

      const titleLabel =
        displayName && displayName !== name ? `${name} [Nick: ${displayName}]` : name;

      const embed = createBaseEmbed()
        .setColor(isOnline ? EMBED_COLORS.SUCCESS : EMBED_COLORS.CYBER)
        .setTitle(`👤 Player Profile: ${titleLabel}`)
        .setDescription(`Telemetry and database profile record for **${name}**.`)
        .addFields(
          {
            name: 'Profile Metadata',
            value:
              `• **Status:** ${statusBadge}\n` +
              `• **Username:** \`${name}\`\n` +
              `• **Nickname:** \`${displayName}\`\n` +
              `• **UUID:** \`${uuid}\`\n` +
              `• **Rank:** \`${rank}\``,
            inline: true,
          },
          {
            name: '🏰 Affiliations',
            value:
              `• **Town:** \`${townName}\`\n` +
              `• **Nation:** \`${nationName}\`\n` +
              `• **Empire:** \`${empireName}\``,
            inline: true,
          }
        );

      if (isOnline) {
        const loc = onlinePlayer.location || {};
        const coordsStr = loc.world
          ? `\`${loc.world}\` (X: ${Math.round(loc.x ?? 0)}, Y: ${Math.round(loc.y ?? 0)}, Z: ${Math.round(loc.z ?? 0)})`
          : 'N/A';
        embed.addFields(
          {
            name: '📍 Live Location Coordinates',
            value: coordsStr,
            inline: false,
          },
          {
            name: '💬 Active Chat Channel',
            value: `\`${onlinePlayer.chatChannel || 'GLOBAL'}\``,
            inline: true,
          }
        );
      } else if (dbProfile) {
        const firstSeenTs = dbProfile.firstSeen
          ? Math.floor(new Date(dbProfile.firstSeen).getTime() / 1000)
          : null;
        const lastSeenTs = dbProfile.lastSeen
          ? Math.floor(new Date(dbProfile.lastSeen).getTime() / 1000)
          : null;

        const firstSeenStr = firstSeenTs ? `<t:${firstSeenTs}:F>` : 'Unknown';
        const lastSeenStr = lastSeenTs ? `<t:${lastSeenTs}:R> (<t:${lastSeenTs}:F>)` : 'Unknown';

        embed.addFields({
          name: '📅 History Timeline',
          value: `• **First Logged:** ${firstSeenStr}\n• **Last Online:** ${lastSeenStr}`,
          inline: false,
        });
      }

      const rawTownName = onlinePlayer?.town?.name || dbProfile?.townName;
      const row = new ActionRowBuilder();
      if (rawTownName && rawTownName !== 'None') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`player_view_town_${rawTownName}`)
            .setLabel(`View ${rawTownName.replace(/_/g, ' ')} Town`)
            .setEmoji('🏘️')
            .setStyle(ButtonStyle.Primary)
        );
      }

      const response = await interaction.editReply({
        embeds: [embed],
        components: row.components.length > 0 ? [row] : [],
      });

      if (row.components.length > 0 && response) {
        const collector = response.createMessageComponentCollector({ time: 180000 });
        collector.on('collect', async (i) => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: 'Only the command user can interact with these buttons.',
              flags: MessageFlags.Ephemeral,
            });
          }
          await i.deferUpdate();
          if (i.customId.startsWith('player_view_town_')) {
            const tName = i.customId.replace('player_view_town_', '');
            const { arcadiaApi } = require('../../utils/apiClient.js');
            try {
              const townyData = await arcadiaApi.getTowny();
              const towns = Array.isArray(townyData?.towns) ? townyData.towns : [];
              const targetTown = towns.find(
                (t) =>
                  t?.name?.toLowerCase() === tName.toLowerCase() ||
                  t?.slug?.toLowerCase() === tName.toLowerCase()
              );

              if (targetTown) {
                const flags = targetTown.flags || {};
                const claims = targetTown.claims || {};
                const spawn = targetTown.spawn || {};
                const mayor = targetTown.mayor || {};
                const nation = targetTown.nation || null;

                const fmtTownName = targetTown.name ? targetTown.name.replace(/_/g, ' ') : tName;
                const mName = mayor.name || 'Unknown';
                const nName = nation?.name ? nation.name.replace(/_/g, ' ') : 'None (Neutral)';

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

                const townEmbed = createBaseEmbed()
                  .setColor(EMBED_COLORS.CYBER)
                  .setTitle(`🏘️ Town Profile: ${fmtTownName}`)
                  .setDescription(`Detailed profile telemetry for town **${fmtTownName}**.`)
                  .addFields(
                    {
                      name: '👑 Leadership & Nation',
                      value: `• **Mayor:** \`${mName}\`\n• **Nation:** \`${nName}\``,
                      inline: true,
                    },
                    {
                      name: '👥 Population',
                      value: `• **Online:** \`${targetTown.onlineResidents ?? 0}\`\n• **Total Residents:** \`${targetTown.residents ?? 0}\``,
                      inline: true,
                    },
                    {
                      name: '🚩 Town Flags',
                      value: flagsStr,
                      inline: false,
                    },
                    {
                      name: '📦 Chunks Territory',
                      value: `• **Claimed:** \`${Number(claims.claimedChunks ?? 0).toLocaleString()}\` chunks\n• **Bonus:** \`${Number(claims.bonusChunks ?? 0).toLocaleString()}\` chunks`,
                      inline: false,
                    },
                    {
                      name: '📍 Spawn Location',
                      value: spawnLoc,
                      inline: false,
                    }
                  );

                await interaction.editReply({ embeds: [townEmbed], components: [] });
              }
            } catch {
              // ignore
            }
          }
        });
      }
    }
  },
};
