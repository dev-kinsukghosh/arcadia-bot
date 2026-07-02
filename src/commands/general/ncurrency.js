const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { nguildData } = require('../../db/schema.js');
const { eq } = require('drizzle-orm');
const { errorEmbed, successEmbed } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');

const userLastAutocomplete = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ncurrency')
    .setDescription('Configure nation guild currency settings')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Set the guild currency for convoy and Exchange')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('The currency ID to set for this guild')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

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

    // Get currencies list from memory cache
    const cache = getCurrencyCache();
    const currencies = cache.currencies || [];

    // Combine standard currencies with ARC option
    const allOptions = [{ id: 'arc', name: 'Arc' }, ...currencies];

    // Filter based on input
    const filtered = allOptions.filter(
      (c) =>
        c.id?.toLowerCase().includes(focusedValue) || c.name?.toLowerCase().includes(focusedValue)
    );

    // Limit to Discord's maximum of 25 choices
    const choices = filtered.slice(0, 25).map((c) => ({
      name: `${c.name || c.id} (${c.id.toUpperCase()})`,
      value: c.id,
    }));

    await interaction.respond(choices).catch(() => {});
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
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

      const currencyId = interaction.options.getString('id').toLowerCase().trim();

      // Verify the currency exists (or is 'arc')
      let exists = false;
      let displayName = currencyId;

      if (currencyId === 'arc') {
        exists = true;
        displayName = 'Arc';
      } else {
        const cache = getCurrencyCache();
        const currencies = cache.currencies || [];
        const selectedCurrency = currencies.find((c) => c.id?.toLowerCase() === currencyId);
        if (selectedCurrency) {
          exists = true;
          displayName = selectedCurrency.name;
        }
      }

      if (!exists) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid Currency',
              `The currency ID \`${currencyId}\` is not valid or has not been synced.\n` +
                'Please select one of the suggested currencies from the autocomplete list.'
            ),
          ],
        });
      }

      try {
        const guildId = interaction.guildId;

        // Check if guild mapping already exists
        const existing = await db.select().from(nguildData).where(eq(nguildData.guildId, guildId));

        if (existing.length > 0) {
          // Update
          await db
            .update(nguildData)
            .set({ currency: currencyId })
            .where(eq(nguildData.guildId, guildId));
        } else {
          // Insert
          await db.insert(nguildData).values({
            guildId,
            currency: currencyId,
          });
        }

        const embed = successEmbed(
          'Currency Configured',
          `Successfully set this server's nation currency to **${displayName}** (\`${currencyId.toUpperCase()}\`).\n\n` +
            'This currency will now be used as the default for convoy and exchange operations.'
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        const { reportError } = require('../../utils/errorHandler.js');
        await reportError(error, 'Ncurrency Command Execution');
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Update Failed',
              'An unexpected database error occurred while updating the guild currency.'
            ),
          ],
        });
      }
    }
  },
};
