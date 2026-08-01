const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get the direct link to the ArcadiaMC Community Stats Dashboard'),

  async execute(interaction) {
    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('📊 ArcadiaMC Web Dashboard')
      .setDescription(
        'Access real-time telemetry, transaction charts, shop listing databases, and network monitors on our web panel.\n\n' +
        '**Available Modules:**\n' +
        '• 🪙 **Live Currency Market:** Live exchange rate ticker tracking nation currencies relative to ARC.\n' +
        '• 📈 **Currency History:** Historical rates comparison charts over 7-120 days.\n' +
        '• 🧮 **Exchange Calculator:** Conversion rates and transaction tax calculator.\n' +
        '• 📦 **Convoy Shop:** Current Convoy shop inventory, stock limits, and rarity lists.\n' +
        '• 🏘️ **Towny monitor:** Search player towns, nations, mayors, and chunk territory sizes.\n' +
        '• 🛒 **Player Shops:** Full directory of player shops, active buy/sell inventories, and coordinates.'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Web Dashboard')
        .setURL('https://arcc.webdevkin.com/live-market')
        .setStyle(ButtonStyle.Link)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
