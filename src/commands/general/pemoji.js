const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const axios = require('axios');
const logger = require('../../utils/logger.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('pemoji')
    .setDescription(
      'Download a Minecraft player skin render and upload it as a server emoji or sticker'
    )
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Minecraft username (3-16 characters, alphanumeric & underscores)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('The render style for the emoji')
        .setRequired(true)
        .addChoices(
          { name: '2D Face (Flat)', value: 'face-2d' },
          { name: '3D Head (Rendered)', value: 'face-3d' },
          { name: 'Full Body (Rendered)', value: 'fullbody' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('facing')
        .setDescription('The direction the head/render is facing (Defaults to right)')
        .setRequired(false)
        .addChoices({ name: 'Left', value: 'left' }, { name: 'Right', value: 'right' })
    )
    .addStringOption((option) =>
      option
        .setName('type-icon')
        .setDescription('Upload as a server emoji or custom sticker (Defaults to emoji)')
        .setRequired(false)
        .addChoices({ name: 'Emoji', value: 'emoji' }, { name: 'Sticker', value: 'sticker' })
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [
          errorEmbed('Guild Only', 'This command can only be used inside a Discord server.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Runtime permission check with developer bypass
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    const isDev = devIds.includes(interaction.user.id);

    if (!isDev && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Missing Permissions',
            'You need the **Manage Expressions** permission to use this command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Validate bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Missing Permissions',
            'The bot does not have permission to manage expressions in this server.'
          ),
        ],
      });
    }

    const username = interaction.options.getString('username').trim();
    const type = interaction.options.getString('type');
    const facing = interaction.options.getString('facing') || 'right';
    const typeIcon = interaction.options.getString('type-icon') || 'emoji';

    // Failsafe 1: Username format validation
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Username',
            'Minecraft usernames must be between 3 and 16 characters long and contain only letters, numbers, and underscores.'
          ),
        ],
      });
    }

    // Failsafe 2: Resolve username to Mojang UUID (or fallback to raw username)
    let identifier;
    let resolvedName = username;
    try {
      const { resolveUsernameToUuid } = require('../../services/headManager.js');
      identifier = await resolveUsernameToUuid(username);

      // Attempt to retrieve casing cache if available
      const lowerName = username.toLowerCase();
      const redisClient = require('../../utils/redis.js');
      if (redisClient && redisClient.status === 'ready') {
        const cachedCasing = await redisClient.get(`name:by-lower:${lowerName}`);
        if (cachedCasing) {
          resolvedName = cachedCasing;
        }
      }
    } catch (err) {
      logger.warn(
        `Mojang UUID resolution failed for ${username}: ${err.message}. Falling back to raw username.`
      );
      identifier = username;
    }

    // Build the render URL using MC-Heads API
    let imageUrl;
    if (type === 'face-2d') {
      imageUrl = `https://mc-heads.net/avatar/${identifier}/256`;
    } else if (type === 'face-3d') {
      imageUrl = `https://mc-heads.net/head/${identifier}/${facing}`;
    } else {
      imageUrl = `https://mc-heads.net/body/${identifier}/${facing}`;
    }

    // Failsafe 3: Download skin render buffer
    let imageBuffer;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      imageBuffer = Buffer.from(response.data);
    } catch (err) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Download Failed',
            `Failed to download player skin render from the API: ${err.message}`
          ),
        ],
      });
    }

    // Failsafe 4: Image size validation
    if (!imageBuffer || imageBuffer.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed('Empty Render', 'The skin render server returned an empty image.')],
      });
    }

    if (imageBuffer.length > 256 * 1024 && typeIcon === 'emoji') {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Image Too Large',
            "The retrieved render image exceeds Discord's 256KB limit for custom emojis."
          ),
        ],
      });
    }

    // Generate clean upload name
    const cleanUsername = resolvedName.replace(/[^a-zA-Z0-9_]/g, '');
    let uploadName = `${cleanUsername}_${type.replace('-', '')}_${facing}`;
    if (uploadName.length > 32) {
      uploadName = uploadName.slice(0, 32);
    }
    if (uploadName.length < 2) {
      uploadName = `mc_${uploadName}`;
    }

    if (typeIcon === 'sticker') {
      let stickerBuffer;
      try {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(320, 320);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Calculate proportional dimensions to fit within 320x320 without squishing
        const ratio = Math.min(320 / img.width, 320 / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        const x = (320 - newWidth) / 2;
        const y = (320 - newHeight) / 2;

        ctx.drawImage(img, x, y, newWidth, newHeight);
        stickerBuffer = await canvas.toBuffer('image/png');
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Processing Failed',
              `Failed to process image buffer for sticker: ${err.message}`
            ),
          ],
        });
      }

      if (stickerBuffer.length > 512 * 1024) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Sticker Too Large',
              "The processed sticker image exceeds Discord's 512KB limit for custom stickers."
            ),
          ],
        });
      }

      // Check duplicates using a fresh fetch to prevent stale cache issues
      let stickersList;
      try {
        stickersList = await interaction.guild.stickers.fetch();
      } catch (fetchErr) {
        logger.warn(`Failed to fetch stickers list: ${fetchErr.message}. Falling back to cache.`);
        stickersList = interaction.guild.stickers.cache;
      }

      const existingSticker = stickersList.find((s) => s.name === uploadName);
      if (existingSticker) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Duplicate Sticker',
              `A sticker named \`${uploadName}\` already exists in this server.`
            ),
          ],
        });
      }

      // Upload sticker
      try {
        const createdSticker = await interaction.guild.stickers.create({
          file: stickerBuffer,
          name: uploadName,
          tags: 'minecraft',
          description: `Minecraft skin sticker for ${resolvedName}`,
        });

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Sticker Uploaded',
              `Successfully uploaded skin sticker for **${resolvedName}**!\n\n` +
                `• **Name:** \`${uploadName}\`\n` +
                `• **Type:** ${type}\n` +
                `• **Facing:** ${facing}`
            ),
          ],
          stickers: [createdSticker.id],
        });
      } catch (err) {
        if (err.message.includes('maximum number of stickers')) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Limit Reached',
                'This server has reached its maximum limit for custom stickers.'
              ),
            ],
          });
        }
        return interaction.editReply({
          embeds: [
            errorEmbed('Upload Failed', `Discord API rejected the sticker upload: ${err.message}`),
          ],
        });
      }
    } else {
      // Check duplicate emoji name using a fresh fetch to prevent stale cache issues
      let emojisList;
      try {
        emojisList = await interaction.guild.emojis.fetch();
      } catch (fetchErr) {
        logger.warn(`Failed to fetch emojis list: ${fetchErr.message}. Falling back to cache.`);
        emojisList = interaction.guild.emojis.cache;
      }

      const existingEmoji = emojisList.find((e) => e.name === uploadName);
      if (existingEmoji) {
        const emojiFormat = existingEmoji.animated
          ? `<a:${existingEmoji.name}:${existingEmoji.id}>`
          : `<:${existingEmoji.name}:${existingEmoji.id}>`;
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Duplicate Emoji',
              `An emoji named \`:${uploadName}:\` already exists in this server: ${emojiFormat}`
            ),
          ],
        });
      }

      // Upload emoji
      try {
        const createdEmoji = await interaction.guild.emojis.create({
          attachment: imageBuffer,
          name: uploadName,
          reason: `Pemoji command upload for ${resolvedName}`,
        });

        const emojiFormat = createdEmoji.animated
          ? `<a:${createdEmoji.name}:${createdEmoji.id}>`
          : `<:${createdEmoji.name}:${createdEmoji.id}>`;

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Emoji Uploaded',
              `Successfully uploaded skin emoji for **${resolvedName}**!\n\n` +
                `• **Name:** \`:${uploadName}:\`\n` +
                `• **Type:** ${type}\n` +
                `• **Facing:** ${facing}\n` +
                `• **Emoji:** ${emojiFormat}`
            ),
          ],
        });
      } catch (err) {
        if (err.message.includes('maximum number of emojis')) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Limit Reached',
                'This server has reached its maximum limit for custom emojis.'
              ),
            ],
          });
        }
        return interaction.editReply({
          embeds: [
            errorEmbed('Upload Failed', `Discord API rejected the emoji upload: ${err.message}`),
          ],
        });
      }
    }
  },
};
