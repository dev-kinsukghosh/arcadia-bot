const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the official Discord invite link to add ArcadiaMC Bot to your server'),

  async execute(interaction) {
    const clientId = interaction.client.user.id;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('🤖 Add ArcadiaMC Community Bot to Your Server')
      .setDescription(
        'Bring the power of ArcadiaMC server telemetry, market analytics, and community tools straight to your Discord server!\n\n' +
          '**Key Features Included:**\n' +
          '• 🚚 **Convoy Stock Monitors**: Real-time Convoy shop tracking, stock pings & price conversions.\n' +
          '• 🪙 **Currency Analytics**: Live nation exchange rates, 120-day health metrics & 30-day trends.\n' +
          '• 🏰 **Towny & Player Shops**: Server population stats, claim leaderboards & player shop lookup.\n' +
          '• 🌐 **Interactive Dashboard**: Direct link to live graphs, maps, and shop directories.'
      )
      .addFields({
        name: '🔗 Discord OAuth2 Link',
        value: `[Click Here to Invite Bot](${inviteUrl})`,
        inline: false,
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('➕ Add Bot to Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl),
      new ButtonBuilder()
        .setLabel('🌐 Web Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL('https://arcc.webdevkin.com/')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
