const { SlashCommandBuilder } = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's latency and connection status"),
  async execute(interaction) {
    await interaction.reply({ content: 'Pinging...' });
    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('🏓 Pong!')
      .setDescription('Bot connection latency details:')
      .addFields(
        { name: '📊 Client Latency', value: `\`${latency}ms\``, inline: true },
        { name: '⚡ API Latency', value: `\`${apiLatency}ms\``, inline: true }
      );

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
