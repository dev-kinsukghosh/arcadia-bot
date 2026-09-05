const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { alSam, currencies } = require('../../db/schema.js');
const { sql } = require('drizzle-orm');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const logger = require('../../utils/logger.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('al-nadd')
    .setDescription('Add a nation to the Al-Sam database list')
    .addStringOption((option) =>
      option
        .setName('nationname')
        .setDescription('The nation name to add')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused()?.toLowerCase()?.trim() || '';

      // Get already added nations from database
      const addedSet = new Set();
      if (db) {
        try {
          const existingRecords = await db.select({ nationName: alSam.nationName }).from(alSam);
          for (const row of existingRecords) {
            if (row.nationName) {
              addedSet.add(row.nationName.toLowerCase());
            }
          }
        } catch (err) {
          logger.warn(`Failed to fetch al_sam records for autocomplete: ${err.message}`);
        }
      }

      // Gather available nations list
      const availableNations = new Set();

      // 1. Try Towny data from Redis cache / Arcadia API
      try {
        let townyData = null;
        const redisClient = require('../../utils/redis.js');
        if (redisClient && redisClient.status === 'ready') {
          const cached = await redisClient.get('cache:towny');
          if (cached) {
            townyData = JSON.parse(cached);
          }
        }
        if (!townyData) {
          townyData = await arcadiaApi.getTowny();
        }
        if (townyData && Array.isArray(townyData.nations)) {
          for (const n of townyData.nations) {
            if (n && n.name) {
              availableNations.add(n.name.replace(/_/g, ' '));
            }
          }
        }
      } catch {
        // ignore towny fetch errors in autocomplete
      }

      // 2. Try Nations from currencies table in DB
      if (db) {
        try {
          const currencyNations = await db.select({ nation: currencies.nation }).from(currencies);
          for (const c of currencyNations) {
            if (c.nation && c.nation !== 'Unknown') {
              availableNations.add(c.nation);
            }
          }
        } catch {
          // ignore currency fetch errors
        }
      }

      // Filter available nations: exclude already added, match focused value
      const suggestions = Array.from(availableNations).filter((nationName) => {
        const lower = nationName.toLowerCase();
        if (addedSet.has(lower)) return false;
        return lower.includes(focusedValue);
      });

      const choices = suggestions.slice(0, 25).map((nationName) => ({
        name: nationName,
        value: nationName,
      }));

      await interaction.respond(choices);
    } catch {
      // Silently handle autocomplete error
    }
  },

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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    const nationNameInput = interaction.options.getString('nationname')?.trim();

    if (!nationNameInput) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Input', 'Please provide a valid nation name.')],
      });
    }

    try {
      // Check if nation already exists in al_sam table
      const existing = await db
        .select()
        .from(alSam)
        .where(sql`LOWER(${alSam.nationName}) = ${nationNameInput.toLowerCase()}`);

      if (existing.length > 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Nation Already Exists',
              `Nation **${existing[0].nationName}** is already in the Al-Sam database list.`
            ),
          ],
        });
      }

      // Insert new nation
      await db.insert(alSam).values({
        nationName: nationNameInput,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Nation Added',
            `Successfully added nation **${nationNameInput}** to the Al-Sam database table.`
          ),
        ],
      });
    } catch (error) {
      logger.error('Failed to add nation to al_sam database:', error);
      const { reportError } = require('../../utils/errorHandler.js');
      await reportError(error, 'Al-Nadd Command Execution');

      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Error',
            `An unexpected error occurred while adding the nation: ${error.message}`
          ),
        ],
      });
    }
  },
};
