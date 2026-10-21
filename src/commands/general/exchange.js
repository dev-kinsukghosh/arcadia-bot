const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange')
    .setDescription('Calculate exchange rate conversion between nation currencies')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
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
    )
    .addBooleanOption((option) =>
      option
        .setName('include_tax')
        .setDescription('Include 5% server conversion tax (ignored when converting to ARC)')
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
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

      await interaction.respond(choices);
    } catch {
      // Silently ignore autocomplete errors
    }
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

    const requestedTax = interaction.options.getBoolean('include_tax') ?? false;
    const includeTax = toId === 'arc' ? false : requestedTax;

    // Calculate math: (amount * fromRate) / toRate
    const arcAmount = amount * fromRate;

    let finalAmount;
    let taxArc = 0;

    if (includeTax) {
      taxArc = arcAmount * 0.05;
      const netArc = arcAmount - taxArc;
      finalAmount = netArc / toRate;
    } else {
      finalAmount = arcAmount / toRate;
    }

    // Direct exchange rate from 1 unit of source to target
    const directRate = fromRate / toRate;

    const formatPrice = (val) => {
      const rounded = Math.round(val * 1000) / 1000;
      return rounded.toLocaleString('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    };

    const description = includeTax
      ? 'Expected converted amount and exchange rate telemetry — **5% server conversion tax included**.'
      : 'Expected converted amount and exchange rate telemetry.';

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('💱 Currency Exchange Calculator')
      .setDescription(description)
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

    if (includeTax) {
      embed.addFields({
        name: '🔥 Server Tax (5%)',
        value: `\`${formatPrice(taxArc)} ARC\` burned as conversion tax`,
        inline: false,
      });
    }

    if (toId === 'arc' && fromId !== 'arc') {
      embed.addFields({
        name: 'ℹ️ Currency Notice',
        value:
          'Other currencies cannot be exchanged back to ARC in-game. As ARC is the base currency, server conversion tax does not apply.',
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
