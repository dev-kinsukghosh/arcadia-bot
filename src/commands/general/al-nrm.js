const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { alSam } = require('../../db/schema.js');
const { eq, sql } = require('drizzle-orm');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('al-nrm')
    .setDescription('Remove a nation from the Al-Sam database list')
    .addStringOption((option) =>
      option
        .setName('nationname')
        .setDescription('The nation name to remove')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused()?.toLowerCase()?.trim() || '';

      if (!db) return interaction.respond([]);

      const records = await db.select({ nationName: alSam.nationName }).from(alSam);

      const filtered = records.filter(
        (r) => r.nationName && r.nationName.toLowerCase().includes(focusedValue)
      );

      const choices = filtered.slice(0, 25).map((r) => ({
        name: r.nationName,
        value: r.nationName,
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
      // Check if nation exists in al_sam table
      const existing = await db
        .select()
        .from(alSam)
        .where(sql`LOWER(${alSam.nationName}) = ${nationNameInput.toLowerCase()}`);

      if (existing.length === 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Nation Not Found',
              `Nation **${nationNameInput}** was not found in the Al-Sam database list.`
            ),
          ],
        });
      }

      const nationToRemove = existing[0].nationName;

      // Delete nation record by ID
      await db.delete(alSam).where(eq(alSam.id, existing[0].id));

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Nation Removed',
            `Successfully removed nation **${nationToRemove}** from the Al-Sam database table.`
          ),
        ],
      });
    } catch (error) {
      logger.error('Failed to remove nation from al_sam database:', error);
      const { reportError } = require('../../utils/errorHandler.js');
      await reportError(error, 'Al-Nrm Command Execution');

      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Error',
            `An unexpected error occurred while removing the nation: ${error.message}`
          ),
        ],
      });
    }
  },
};
