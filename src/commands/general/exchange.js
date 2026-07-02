const { SlashCommandBuilder } = require('discord.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');

const userLastAutocomplete = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange')
    .setDescription('Calculate exchange rate conversion between nation currencies')
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('The amount of currency to convert')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addStringOption((option) =>
      option
        .setName('from')
        .setDescription('The source currency you are converting from')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('to')
        .setDescription('The target currency you are converting to')
        .setRequired(true)
        .setAutocomplete(true)
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

    const cache = getCurrencyCache();
    const currencies = cache.currencies || [];

    // Prepend ARC/Arc
    const allOptions = [{ id: 'arc', name: 'Arc' }, ...currencies];

    const filtered = allOptions.filter(
      (c) =>
        c.id?.toLowerCase().includes(focusedValue) || c.name?.toLowerCase().includes(focusedValue)
    );

    const choices = filtered.slice(0, 25).map((c) => ({
      name: `${c.name || c.id} (${c.id.toUpperCase()})`,
      value: c.id,
    }));

    await interaction.respond(choices).catch(() => {});
  },

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getNumber('amount');
    const fromId = interaction.options.getString('from').toLowerCase().trim();
    const toId = interaction.options.getString('to').toLowerCase().trim();

    const cache = getCurrencyCache();
    const currencies = cache.currencies || [];

    // Resolve 'from' currency rate
    let fromRate = 1.0;
    let fromName = 'Arc';
    if (fromId !== 'arc') {
      const found = currencies.find((c) => c.id?.toLowerCase() === fromId);
      if (!found) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid Source Currency',
              `The currency \`${fromId}\` is not valid. Please select a currency from the autocomplete list.`
            ),
          ],
        });
      }
      fromRate = parseFloat(found.arcPerUnitLive) || 1.0;
      fromName = found.name || fromId;
    }

    // Resolve 'to' currency rate
    let toRate = 1.0;
    let toName = 'Arc';
    if (toId !== 'arc') {
      const found = currencies.find((c) => c.id?.toLowerCase() === toId);
      if (!found) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid Target Currency',
              `The currency \`${toId}\` is not valid. Please select a currency from the autocomplete list.`
            ),
          ],
        });
      }
      toRate = parseFloat(found.arcPerUnitLive) || 1.0;
      toName = found.name || toId;
    }

    // Calculate math: (amount * fromRate) / toRate
    const amountInArc = amount * fromRate;
    const finalAmount = amountInArc / toRate;

    // Direct exchange rate from 1 unit of source to target
    const directRate = fromRate / toRate;

    const formatPrice = (val) => {
      const rounded = Math.round(val * 1000) / 1000;
      return rounded.toLocaleString('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    };

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('💱 Currency Exchange Calculator')
      .setDescription('Expected converted amount and exchange rate telemetry.')
      .addFields(
        {
          name: '📥 Convert From',
          value: `**${formatPrice(amount)}** ${fromName} (\`${fromId.toUpperCase()}\`)`,
          inline: true,
        },
        {
          name: '📤 Convert To',
          value: `**${formatPrice(finalAmount)}** ${toName} (\`${toId.toUpperCase()}\`)`,
          inline: true,
        },
        {
          name: '📈 Exchange Rate',
          value: `\`1 ${fromId.toUpperCase()} = ${formatPrice(directRate)} ${toId.toUpperCase()}\``,
          inline: false,
        }
      );

    return interaction.editReply({ embeds: [embed] });
  },
};
