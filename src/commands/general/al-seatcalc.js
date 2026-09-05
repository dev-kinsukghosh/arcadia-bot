const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { alSam, webyCustom } = require('../../db/schema.js');
const { eq } = require('drizzle-orm');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const logger = require('../../utils/logger.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('al-seatcalc')
    .setDescription('Calculate representative seat allocations (Mukhtarun) for Al-Sam nations'),

  async execute(interaction) {
    // Validate developer or authorized role access
    const { isAlAuthorized } = require('../../utils/alAuthHelper.js');
    if (!(await isAlAuthorized(interaction))) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission or the required role to execute this Al-Sam command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({});

    if (!db) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Unavailable',
            'Could not connect to the database. Please try again later.'
          ),
        ],
      });
    }

    try {
      // 1. Fetch total seats from weby_custom where id='al-sam'
      let totalSeats = 0;
      const customSeatsRecord = await db
        .select()
        .from(webyCustom)
        .where(eq(webyCustom.id, 'al-sam'));

      if (customSeatsRecord.length > 0 && customSeatsRecord[0].value) {
        totalSeats = parseInt(customSeatsRecord[0].value, 10) || 0;
      }

      // 2. Fetch all nations from al_sam table
      const alSamNations = await db.select().from(alSam);

      if (alSamNations.length === 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'No Nations Configured',
              'There are currently no nations stored in the Al-Sam database list.\n\nUse `/al-nadd` to add nations first.'
            ),
          ],
        });
      }

      // 3. Fetch Towny data from Redis cache or Arcadia API
      let townyData = null;
      try {
        const redisClient = require('../../utils/redis.js');
        if (redisClient && redisClient.status === 'ready') {
          const cached = await redisClient.get('cache:towny');
          if (cached) {
            townyData = JSON.parse(cached);
          }
        }
      } catch {
        // ignore cache error
      }

      if (!townyData) {
        try {
          townyData = await arcadiaApi.getTowny();
        } catch {
          // ignore API error, townyData remains null
        }
      }

      const activeNationsList =
        townyData && Array.isArray(townyData.nations) ? townyData.nations : [];

      // 4. Calculate total population for added Al-Sam nations
      let totalPopulation = 0;
      const nationStats = alSamNations.map((record) => {
        const targetName = record.nationName.trim();
        const targetLower = targetName.toLowerCase();
        const targetClean = targetLower.replace(/_/g, ' ');

        // Find match in Towny API data
        const matchedNation = activeNationsList.find((n) => {
          if (!n || !n.name) return false;
          const nLower = n.name.toLowerCase();
          const nClean = nLower.replace(/_/g, ' ');
          return nLower === targetLower || nClean === targetClean;
        });

        const population = matchedNation ? matchedNation.residents || 0 : 0;
        totalPopulation += population;

        return {
          name: targetName,
          population,
          found: !!matchedNation,
        };
      });

      // 5. Calculate seat multiplier x = totalSeats / totalPopulation
      const x = totalPopulation > 0 ? totalSeats / totalPopulation : 0;

      // 6. Format calculation results
      const xFormatted = x.toFixed(6);

      const nationBreakdownLines = nationStats.map((n) => {
        const reps = x * n.population;
        const repsFormatted = reps.toFixed(2);
        const repsRounded = Math.round(reps);

        const popStr = n.population.toLocaleString();
        return `• **${n.name}**\n  ├ **Population:** \`${popStr}\` residents\n  └ **Representatives (Mukhtarun):** **${repsFormatted}** seats (≈ **${repsRounded}**)`;
      });

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('🏛️ Al-Sam Representative Seat Calculation (Mukhtarun)')
        .setDescription(
          'Representative seat allocation breakdown calculated for all configured Al-Sam nations.'
        )
        .addFields(
          {
            name: '📊 Formula & Multiplier Overview',
            value:
              `• **Total Seats (Al-Sam):** \`${totalSeats}\`\n` +
              `• **Total Empire Population:** \`${totalPopulation.toLocaleString()}\` residents\n` +
              `• **Seat Multiplier (x = Seats / Total Pop):** \`${xFormatted}\`\n` +
              `\`\`\`text\nFormula: x = (${totalSeats}) / (${totalPopulation}) = ${xFormatted}\n\`\`\``,
            inline: false,
          },
          {
            name: `🏳️ Nation Seat Allocations (${nationStats.length} Nations)`,
            value: nationBreakdownLines.join('\n\n') || 'No nations to display.',
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to calculate Al-Sam seats:', error);
      const { reportError } = require('../../utils/errorHandler.js');
      await reportError(error, 'Al-Seatcalc Command Execution');

      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Calculation Error',
            `An unexpected error occurred during seat calculation: ${error.message}`
          ),
        ],
      });
    }
  },
};
