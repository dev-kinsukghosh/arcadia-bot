const { AttachmentBuilder } = require('discord.js');
const { createWelcomeCard } = require('../utils/canvasHelper.js');
const logger = require('../utils/logger.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    logger.info(`[MEMBER JOIN] ${member.user.tag} joined ${member.guild.name}`);

    const channelId = process.env.WELCOME_CHANNEL_ID;
    let welcomeChannel = channelId ? member.guild.channels.cache.get(channelId) : null;

    if (!welcomeChannel) {
      welcomeChannel = member.guild.channels.cache.find(
        (ch) => ch.name.includes('welcome') && ch.isTextBased()
      );
    }

    if (!welcomeChannel) {
      welcomeChannel = member.guild.systemChannel;
    }

    if (!welcomeChannel) {
      logger.warn(`No welcome channel or system channel found for guild ${member.guild.name}`);
      return;
    }

    try {
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });

      const welcomeCardBuffer = await createWelcomeCard({
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatarUrl: avatarUrl,
        serverName: member.guild.name,
        memberCount: member.guild.memberCount,
      });

      const attachment = new AttachmentBuilder(welcomeCardBuffer, { name: 'welcome-card.png' });

      await welcomeChannel.send({
        content: `Hey ${member}, welcome to **${member.guild.name}**! 🚀`,
        files: [attachment],
      });

      logger.info(`Sent welcome card for ${member.user.tag} to #${welcomeChannel.name}`);
    } catch (error) {
      const { reportError } = require('../utils/errorHandler.js');
      await reportError(error, `Welcome Card Generation (User: ${member.user.tag})`);
    }
  },
};
