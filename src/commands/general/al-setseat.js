const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { webyCustom } = require('../../db/schema.js');
const { sql } = require('drizzle-orm');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('al-setseat')
    .setDescription('Set the number of seats for Al-Sam')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of seats (positive integer or 0)')
        .setRequired(true)
        .setMinValue(0)
    ),

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

    const amount = interaction.options.getInteger('amount');

    if (amount === null || amount < 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Amount',
            'Please provide a valid non-negative integer (0 or greater).'
          ),
        ],
      });
    }

    try {
      // Upsert record into weby_custom table with id='al-sam' and value=amount as string
      await db
        .insert(webyCustom)
        .values({
          id: 'al-sam',
          value: amount.toString(),
        })
        .onDuplicateKeyUpdate({
          set: {
            value: amount.toString(),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Seats Configured',
            `Successfully set the seats for **al-sam** to **${amount}** in the database.`
          ),
        ],
      });
    } catch (error) {
      logger.error('Failed to update al-sam seats in weby_custom database:', error);
      const { reportError } = require('../../utils/errorHandler.js');
      await reportError(error, 'Al-Setseat Command Execution');

      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Error',
            `An unexpected error occurred while setting seats: ${error.message}`
          ),
        ],
      });
    }
  },
};
