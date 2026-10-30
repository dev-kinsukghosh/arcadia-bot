const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const { db } = require('./db.js');
const { pokemonCaptures, pokemonOptOuts } = require('../db/schema.js');
const { eq, and, or, desc } = require('drizzle-orm');
const { createBaseEmbed, EMBED_COLORS, errorEmbed, successEmbed } = require('./embedHelper.js');
const logger = require('./logger.js');

// In-memory set to prevent duplicate concurrent capture battles on the same user/trainer
// Key: `${guildId}:${userId}`
const activeBattles = new Set();

// In-memory map for captive breakout attempt cooldowns (3 minutes on failure)
// Key: `${guildId}:${userId}` -> timestamp
const captiveBreakoutCooldowns = new Map();

// In-memory map of user recent message timestamps: key = `${guildId}:${userId}` -> timestamp
const userLastMessageMap = new Map();

/**
 * Records a message activity timestamp for a user.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} timestamp
 */
function recordUserMessageActivity(guildId, userId, timestamp = Date.now()) {
  if (!guildId || !userId) return;
  const key = `${guildId}:${userId}`;
  userLastMessageMap.set(key, timestamp);

  try {
    const redis = require('./redis.js');
    if (redis && redis.status === 'ready') {
      redis.set(`pokemon:activity:${key}`, timestamp, 'EX', 600).catch(() => {});
    }
  } catch {}
}

/**
 * Checks if a user has sent a message in the last N milliseconds (default 5 minutes).
 * @param {import('discord.js').GuildTextBasedChannel} channel
 * @param {string} userId
 * @param {number} maxAgeMs (default: 5 * 60 * 1000 = 300,000 ms)
 * @returns {Promise<{ active: boolean, lastSeen?: number }>}
 */
async function isUserActiveRecently(channel, userId, maxAgeMs = 5 * 60 * 1000) {
  if (!userId) return { active: false };
  const guildId = channel?.guildId || channel?.guild?.id;
  const key = `${guildId}:${userId}`;
  const now = Date.now();

  // 1. Check in-memory map
  const inMemoryTime = userLastMessageMap.get(key);
  if (inMemoryTime && now - inMemoryTime <= maxAgeMs) {
    return { active: true, lastSeen: inMemoryTime };
  }

  // 2. Check Redis cache
  try {
    const redis = require('./redis.js');
    if (redis && redis.status === 'ready') {
      const redisTimeStr = await redis.get(`pokemon:activity:${key}`);
      if (redisTimeStr) {
        const redisTime = parseInt(redisTimeStr, 10);
        if (now - redisTime <= maxAgeMs) {
          userLastMessageMap.set(key, redisTime);
          return { active: true, lastSeen: redisTime };
        }
      }
    }
  } catch {}

  // 3. Fallback: check recent channel messages if available
  if (channel && channel.messages && typeof channel.messages.fetch === 'function') {
    try {
      const recentMessages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (recentMessages && recentMessages.size > 0) {
        for (const msg of recentMessages.values()) {
          if (msg.author && msg.author.id === userId && !msg.author.bot) {
            const msgTime = msg.createdTimestamp;
            if (now - msgTime <= maxAgeMs) {
              recordUserMessageActivity(guildId, userId, msgTime);
              return { active: true, lastSeen: msgTime };
            }
          }
        }
      }
    } catch {}
  }

  return { active: false };
}

let tableChecked = false;
async function ensureOptOutTable() {
  if (tableChecked || !db) return;
  try {
    const { connection } = require('./db.js');
    if (connection) {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS pokemon_opt_outs (
          id int(11) NOT NULL AUTO_INCREMENT,
          guild_id varchar(255) NOT NULL,
          user_id varchar(255) NOT NULL,
          created_at timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (id),
          UNIQUE KEY guild_user_opt_out_unique_idx (guild_id, user_id),
          KEY user_opt_out_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `);
      tableChecked = true;
    }
  } catch (err) {
    logger.warn('Failed to ensure pokemon_opt_outs table exists:', err.message);
  }
}
ensureOptOutTable().catch(() => {});

function renderHpBar(current, max = 100) {
  const percentage = Math.max(0, Math.min(1, current / max));
  const totalBars = 10;
  const filledBars = Math.round(percentage * totalBars);
  const emptyBars = totalBars - filledBars;
  return `\`[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${Math.max(0, current)}/${max} HP\``;
}

/**
 * Runs the interactive turn-based Pokémon Fight Back Battle Mini-Game.
 */
async function startFightBackMiniGame({
  interaction,
  response,
  targetUser,
  targetName,
  trainerId,
  guildId,
  trainerKey,
  targetKey,
}) {
  let targetHp = 100;
  let ballHp = 100;
  let round = 1;
  const battleLogs = [
    `⚔️ **Battle Engaged!** <@${targetUser.id}> chose to fight back against the capture!`,
  ];

  const heavyId = `poke_mg_heavy_${interaction.id}`;
  const quickId = `poke_mg_quick_${interaction.id}`;
  const shieldId = `poke_mg_shield_${interaction.id}`;

  const buildMiniGameRow = (disabled = false) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(heavyId)
        .setLabel('Power Strike')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💥')
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(quickId)
        .setLabel('Quick Attack')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚡')
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(shieldId)
        .setLabel('Counter Shield')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️')
        .setDisabled(disabled)
    );

  const buildBattleEmbed = (statusTitle, statusColor) => {
    return createBaseEmbed()
      .setColor(statusColor)
      .setTitle(statusTitle)
      .setDescription(
        `### ⚔️ Wild Pokémon Battle — Round ${round}\n\n` +
          `**Wild Pokémon:** <@${targetUser.id}>\n` +
          `${renderHpBar(targetHp, 100)}\n\n` +
          `**Pokéball Integrity:** (Trainer: <@${trainerId}>)\n` +
          `${renderHpBar(ballHp, 100)}\n\n` +
          `**📜 Combat Log:**\n` +
          `${battleLogs.slice(-3).join('\n')}\n\n` +
          `**Choose your move within 30 seconds!**\n` +
          `• 💥 **Power Strike**: High Damage (35–55 DMG, 20% recoil)\n` +
          `• ⚡ **Quick Attack**: 100% Reliable (22–32 DMG)\n` +
          `• 🛡️ **Counter Shield**: Blocks 60% DMG, heals 15 HP, reflects 15–25 DMG`
      )
      .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
      .setFooter({ text: `Webdevkin custom minigame • Round ${round}` });
  };

  const initialEmbed = buildBattleEmbed('⚔️ POKÉMON BATTLE: Break Free!', '#FFA500');
  await interaction.editReply({
    content: `<@${targetUser.id}>`,
    embeds: [initialEmbed],
    components: [buildMiniGameRow(false)],
  });

  const mgCollector = response.createMessageComponentCollector({
    time: 30000,
  });

  mgCollector.on('collect', async (btnInt) => {
    if (btnInt.user.id !== targetUser.id) {
      return btnInt.reply({
        content: `❌ Only <@${targetUser.id}> can choose battle moves!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await btnInt.deferUpdate().catch(() => {});

    // Target Attack Calculation
    let playerMoveLog = '';
    let isShielded = false;

    if (btnInt.customId === heavyId) {
      const isRecoil = Math.random() < 0.2;
      const dmg = 35 + Math.floor(Math.random() * 21);
      ballHp = Math.max(0, ballHp - dmg);

      if (isRecoil) {
        const recoilDmg = 15;
        targetHp = Math.max(0, targetHp - recoilDmg);
        playerMoveLog = `💥 <@${targetUser.id}> used **Hyper Beam**! Dealt **${dmg} DMG** to the Pokéball, but took **${recoilDmg} recoil DMG**!`;
      } else {
        playerMoveLog = `💥 <@${targetUser.id}> used **Hyper Beam**! Dealt a massive **${dmg} DMG** to the Pokéball!`;
      }
    } else if (btnInt.customId === quickId) {
      const dmg = 22 + Math.floor(Math.random() * 11);
      ballHp = Math.max(0, ballHp - dmg);
      playerMoveLog = `⚡ <@${targetUser.id}> used **Quick Attack**! Landed a swift strike for **${dmg} DMG**!`;
    } else if (btnInt.customId === shieldId) {
      isShielded = true;
      const counterDmg = 15 + Math.floor(Math.random() * 11);
      const healAmount = 15;
      targetHp = Math.min(100, targetHp + healAmount);
      ballHp = Math.max(0, ballHp - counterDmg);
      playerMoveLog = `🛡️ <@${targetUser.id}> raised **Counter Shield**! Recovered **+${healAmount} HP** and reflected **${counterDmg} DMG**!`;
    }

    battleLogs.push(playerMoveLog);

    // Check if Pokéball is destroyed
    if (ballHp <= 0) {
      mgCollector.stop('target_won');
      return;
    }

    // Check if recoil knocked target out
    if (targetHp <= 0) {
      mgCollector.stop('target_lost');
      return;
    }

    // Pokéball Counter-Attack
    const ballSurgeMoves = [
      'Stun Beam',
      'Gravity Pulse',
      'Energy Shock',
      'Capture Tether',
      'Electro Net',
    ];
    const ballMoveName = ballSurgeMoves[Math.floor(Math.random() * ballSurgeMoves.length)];
    let rawBallDmg = 16 + Math.floor(Math.random() * 15);

    if (isShielded) {
      rawBallDmg = Math.max(5, Math.floor(rawBallDmg * 0.4));
      targetHp = Math.max(0, targetHp - rawBallDmg);
      battleLogs.push(
        `🔴 Pokéball retaliated with **${ballMoveName}**, but **Counter Shield** absorbed most of it! Took **${rawBallDmg} DMG**!`
      );
    } else {
      targetHp = Math.max(0, targetHp - rawBallDmg);
      battleLogs.push(
        `🔴 Pokéball fired **${ballMoveName}**! Dealt **${rawBallDmg} DMG** to <@${targetUser.id}>!`
      );
    }

    // Check if Target is knocked out by Pokéball
    if (targetHp <= 0) {
      mgCollector.stop('target_lost');
      return;
    }

    // Next round
    round++;
    mgCollector.resetTimer();

    const roundEmbed = buildBattleEmbed('⚔️ POKÉMON BATTLE: Break Free!', '#FFA500');
    await interaction
      .editReply({
        content: `<@${targetUser.id}>`,
        embeds: [roundEmbed],
        components: [buildMiniGameRow(false)],
      })
      .catch(() => {});
  });

  mgCollector.on('end', async (_, reason) => {
    activeBattles.delete(trainerKey);
    activeBattles.delete(targetKey);

    try {
      if (reason === 'target_won') {
        const victoryEmbed = createBaseEmbed()
          .setColor('#EF4444')
          .setTitle('💥 Capture Refused — Pokéball Shattered!')
          .setDescription(
            `### 🛡️ VICTORY! <@${targetUser.id}> broke free!\n\n` +
              `With a final powerful blast, <@${targetUser.id}> completely shattered the Pokéball to pieces!\n\n` +
              `**Pokéball Integrity:** \`[░░░░░░░░░░] 0/100 HP\` *(DESTROYED)*\n\n` +
              `🚫 **Capture Refused:** <@${targetUser.id}> refused capture and escaped triumphantly into the wild!`
          )
          .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Webdevkin custom minigame • Battle Escaped' });

        await interaction.editReply({
          content: `<@${targetUser.id}>`,
          embeds: [victoryEmbed],
          components: [],
        });
      } else {
        // reason === 'target_lost' or 'time'
        if (!db) {
          return interaction.editReply({
            content: `<@${targetUser.id}>`,
            embeds: [
              errorEmbed('Database Error', 'Could not save capture: Database connection inactive.'),
            ],
            components: [],
          });
        }

        const recheckOwner = await getPokemonOwner(guildId, targetUser.id);
        if (recheckOwner) {
          return interaction.editReply({
            content: `<@${targetUser.id}>`,
            embeds: [
              errorEmbed(
                'Capture Interrupted',
                `<@${targetUser.id}> was already captured by someone else during the battle.`
              ),
            ],
            components: [],
          });
        }

        const isTargetOptedOut = await isUserOptedOut(guildId, targetUser.id);
        if (isTargetOptedOut) {
          return interaction.editReply({
            content: `<@${targetUser.id}>`,
            embeds: [
              errorEmbed(
                'Capture Cancelled',
                `<@${targetUser.id}> has opted out of being captured as a Pokémon.`
              ),
            ],
            components: [],
          });
        }

        await db.insert(pokemonCaptures).values({
          guildId,
          trainerId,
          pokemonId: targetUser.id,
          pokemonName: targetName,
        });

        const isTimeout = reason === 'time';
        const reasonText = isTimeout
          ? `<@${targetUser.id}> hesitated in battle and couldn't withstand the capture field!`
          : `After a fierce battle, <@${targetUser.id}> was worn down and subdued by the Pokéball!`;

        const caughtEmbed = createBaseEmbed()
          .setColor('#10B981')
          .setTitle('⭐ Gotcha! Pokémon Caught in Battle!')
          .setDescription(
            `### 🔴 Click... Click... Click... **DING!** 🎉\n\n` +
              `${reasonText}\n\n` +
              `**Gotcha!** <@${targetUser.id}> was captured by <@${trainerId}>!\n\n` +
              `• Use \`/pokemon summon\` to send them into battle!\n` +
              `• Use \`/pokemon list\` to view your complete party!`
          )
          .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Webdevkin custom minigame • Capture Successful' });

        await interaction.editReply({
          content: `<@${targetUser.id}>`,
          embeds: [caughtEmbed],
          components: [],
        });
      }
    } catch (err) {
      logger.error('Error concluding fightback minigame:', err);
    }
  });
}

/**
 * Verifies that the target member has appropriate fight-back permissions in the interaction channel.
 * Target must be able to view the channel, send messages/threads, and not be timed out.
 * @param {import('discord.js').GuildBasedChannel} channel
 * @param {import('discord.js').GuildMember} targetMember
 * @returns {Promise<{allowed: boolean, reason?: string, message?: string}>}
 */
async function checkFightBackPermissions(channel, targetMember) {
  if (!channel || !targetMember) return { allowed: true };

  // 1. Timed out members cannot click buttons or participate
  if (targetMember.isCommunicationDisabled && targetMember.isCommunicationDisabled()) {
    return {
      allowed: false,
      reason: 'timed_out',
      message: `❌ <@${targetMember.id}> is currently timed out and cannot fight back or participate in capture battles.`,
    };
  }

  let ch = channel;
  if (!ch.permissionsFor && ch.id && targetMember.guild) {
    ch = (await targetMember.guild.channels.fetch(ch.id).catch(() => null)) || channel;
  }

  if (ch.permissionsFor) {
    const perms = ch.permissionsFor(targetMember);
    if (perms) {
      // 2. ViewChannel check (cannot be in locked or hidden channels they are not in)
      const canView = perms.has(PermissionFlagsBits.ViewChannel);
      if (!canView) {
        return {
          allowed: false,
          reason: 'cannot_view',
          message:
            `❌ <@${targetMember.id}> cannot view or access this channel!\n\n` +
            `You cannot capture members in locked or private channels they are not in.`,
        };
      }

      // 3. SendMessages / SendMessagesInThreads check (cannot capture in view-only / announcement channels)
      const isThread = ch.isThread && ch.isThread();
      const canSend = isThread
        ? perms.has(PermissionFlagsBits.SendMessagesInThreads)
        : perms.has(PermissionFlagsBits.SendMessages);

      if (!canSend) {
        return {
          allowed: false,
          reason: 'view_only',
          message:
            `❌ <@${targetMember.id}> does not have fight-back permissions in this channel!\n\n` +
            `This is a view-only channel where they cannot chat or battle. Challenge them in an active chat channel where they can fight back!`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Resolves a Discord user from mention, ID, or string input.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} input
 * @returns {Promise<import('discord.js').User|null>}
 */
async function resolveUser(interaction, input) {
  if (!input) return null;
  const cleanInput = input.trim();

  // 1. Check for mention format <@123456789> or <@!123456789>
  const mentionMatch = cleanInput.match(/^<@!?(\d{17,20})>$/);
  const targetId = mentionMatch ? mentionMatch[1] : cleanInput;

  // 2. Direct ID lookup
  if (/^\d{17,20}$/.test(targetId)) {
    try {
      const user = await interaction.client.users.fetch(targetId);
      if (user) return user;
    } catch {
      // Fall through to guild search
    }
  }

  // 3. Guild cache search by username or tag
  if (interaction.guild) {
    const member = interaction.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === cleanInput.toLowerCase() ||
        m.user.tag.toLowerCase() === cleanInput.toLowerCase() ||
        (m.nickname && m.nickname.toLowerCase() === cleanInput.toLowerCase())
    );
    if (member) return member.user;
  }

  return null;
}

/**
 * Gets all Pokemon captured by a trainer in a guild.
 * @param {string} guildId
 * @param {string} trainerId
 * @returns {Promise<Array>}
 */
async function getTrainerPokemon(guildId, trainerId) {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(pokemonCaptures)
      .where(and(eq(pokemonCaptures.guildId, guildId), eq(pokemonCaptures.trainerId, trainerId)))
      .orderBy(desc(pokemonCaptures.capturedAt));
  } catch (err) {
    logger.error('Failed to get trainer pokemon:', err);
    return [];
  }
}

/**
 * Gets the current owner/trainer of a Pokemon in a guild.
 * @param {string} guildId
 * @param {string} pokemonId
 * @returns {Promise<Object|null>}
 */
async function getPokemonOwner(guildId, pokemonId) {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(pokemonCaptures)
      .where(and(eq(pokemonCaptures.guildId, guildId), eq(pokemonCaptures.pokemonId, pokemonId)))
      .limit(1);
    return rows[0] || null;
  } catch (err) {
    logger.error('Failed to get pokemon owner:', err);
    return null;
  }
}

/**
 * Checks if targetId has captured trainerId (mutual capture prevention).
 * @param {string} guildId
 * @param {string} trainerId
 * @param {string} targetId
 * @returns {Promise<boolean>}
 */
async function hasTargetCapturedTrainer(guildId, trainerId, targetId) {
  if (!db) return false;
  try {
    const rows = await db
      .select()
      .from(pokemonCaptures)
      .where(
        and(
          eq(pokemonCaptures.guildId, guildId),
          eq(pokemonCaptures.trainerId, targetId),
          eq(pokemonCaptures.pokemonId, trainerId)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    logger.error('Failed to check mutual capture:', err);
    return false;
  }
}

/**
 * Handles the capture battle flow with interactive fight back mechanic.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').User|string} targetUserOrInput
 */
async function handleCaptureFlow(interaction, targetUserOrInput) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  let targetUser = null;
  if (targetUserOrInput && typeof targetUserOrInput === 'object' && targetUserOrInput.id) {
    targetUser = targetUserOrInput;
  } else if (typeof targetUserOrInput === 'string') {
    targetUser = await resolveUser(interaction, targetUserOrInput);
  }

  if (!targetUser) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'User Not Found',
          'Could not locate the specified user. Please select or mention a valid user in this server.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Verify target is a member of this server
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Member Not In Server',
          `❌ <@${targetUser.id}> is not a member of this server. You can only capture active members of this server!`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 1. Bot check
  if (targetUser.bot) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Target', '🤖 You cannot capture bots as Pokémon!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. Self check
  if (targetUser.id === interaction.user.id) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Invalid Target',
          '🧢 You cannot capture yourself! You are a Pokémon Trainer, not a Pokémon!'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const trainerId = interaction.user.id;
  const targetId = targetUser.id;

  // 3. Opt-out check
  const isTargetOptedOut = await isUserOptedOut(guildId, targetId);
  if (isTargetOptedOut) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Capture Denied',
          `❌ <@${targetId}> has opted out of being captured as a Pokémon!\n\n` +
            `They have chosen not to participate in Pokémon captures and cannot be challenged or caught.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 4. Channel fight-back permissions check (cannot capture in view-only or locked channels target cannot access/chat in)
  const permCheck = await checkFightBackPermissions(interaction.channel, targetMember);
  if (!permCheck.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Capture Denied', permCheck.message)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 5. Inactivity check (target must have sent a message in the last 5 minutes)
  const activityCheck = await isUserActiveRecently(interaction.channel, targetId, 5 * 60 * 1000);
  if (!activityCheck.active) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Target Inactive',
          `❌ <@${targetId}> has not sent any messages in the last 5 minutes!\n\n` +
            `You can only capture active members who have chatted recently so they have a fair chance to react and fight back.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 6. Mutual capture rule: "u cant capture the person who captured u"
  const isCapturedByTarget = await hasTargetCapturedTrainer(guildId, trainerId, targetId);
  if (isCapturedByTarget) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Capture Denied',
          `❌ You cannot capture <@${targetId}> because they have already captured you!\n\n` +
            `You are currently in their party. They must release you first before you can challenge them.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 7. Check if target is already captured in this server
  const existingOwner = await getPokemonOwner(guildId, targetId);
  if (existingOwner) {
    if (existingOwner.trainerId === trainerId) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Already Captured',
            `❌ You have already captured <@${targetId}>!\n\n` +
              `Use \`/summon-pokemon\` to call them out or \`/pokemon list\` to check your party.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Already Owned',
            `❌ <@${targetId}> is already captured by <@${existingOwner.trainerId}>!\n\n` +
              `Another trainer already owns this Pokémon. They must be released before anyone else can capture them.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // 8. Active battle lock
  const trainerKey = `${guildId}:${trainerId}`;
  const targetKey = `${guildId}:${targetId}`;
  if (activeBattles.has(trainerKey) || activeBattles.has(targetKey)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Battle In Progress',
          '❌ A capture battle is already actively in progress involving you or this user! Please wait for it to complete.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  activeBattles.add(trainerKey);
  activeBattles.add(targetKey);

  const fightButtonId = `poke_fight_${interaction.id}`;
  const yieldButtonId = `poke_yield_${interaction.id}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(fightButtonId)
      .setLabel('Fight Back!')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚔️'),
    new ButtonBuilder()
      .setCustomId(yieldButtonId)
      .setLabel('Yield / Be Caught')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✨')
  );

  const targetName = targetUser.displayName || targetUser.username;
  const trainerName = interaction.user.displayName || interaction.user.username;

  const encounterEmbed = createBaseEmbed()
    .setColor('#FF3333')
    .setTitle('🔴 Wild Pokémon Encounter!')
    .setDescription(
      `**${trainerName}** threw a Pokéball at <@${targetId}>!\n\n` +
        `**<@${targetId}>**, a trainer is attempting to capture you!\n` +
        `You have **45 seconds** to decide your action:\n\n` +
        `• Click **⚔️ Fight Back!** to unleash a counter-move, shatter the ball, and refuse capture!\n` +
        `• Click **✨ Yield / Be Caught** to submit peacefully.\n\n` +
        `*(If no response within 45s, the Pokéball clicks shut automatically!)*`
    )
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setFooter({ text: 'Webdevkin custom minigame • Wild Capture' });

  let response;
  try {
    response = await interaction.reply({
      content: `<@${targetId}>`,
      embeds: [encounterEmbed],
      components: [row],
      fetchReply: true,
    });
  } catch (err) {
    activeBattles.delete(trainerKey);
    activeBattles.delete(targetKey);
    logger.error('Failed to send encounter message:', err);
    return;
  }

  const collector = response.createMessageComponentCollector({
    time: 45000,
  });

  collector.on('collect', async (btnInt) => {
    if (btnInt.user.id !== targetId) {
      return btnInt.reply({
        content: `❌ Only <@${targetId}> can decide whether to fight back or yield!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (btnInt.customId === fightButtonId) {
      await btnInt.deferUpdate().catch(() => {});
      collector.stop('fight_back');
    } else if (btnInt.customId === yieldButtonId) {
      await btnInt.deferUpdate().catch(() => {});
      collector.stop('yield');
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'fight_back') {
      // Launch the interactive turn-based Battle Mini-Game!
      await startFightBackMiniGame({
        interaction,
        response,
        targetUser,
        targetName,
        trainerId,
        guildId,
        trainerKey,
        targetKey,
      });
      return;
    }

    activeBattles.delete(trainerKey);
    activeBattles.delete(targetKey);

    try {
      // reason === 'yield' or 'time'
      if (!db) {
        return interaction.editReply({
          embeds: [
            errorEmbed('Database Error', 'Could not save capture: Database connection inactive.'),
          ],
          components: [],
        });
      }

      // Final verification that target wasn't captured in the meantime
      const recheckOwner = await getPokemonOwner(guildId, targetId);
      if (recheckOwner) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Capture Interrupted',
              `<@${targetId}> was already captured by someone else during the battle.`
            ),
          ],
          components: [],
        });
      }

      const isTargetOptedOut = await isUserOptedOut(guildId, targetId);
      if (isTargetOptedOut) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Capture Cancelled',
              `<@${targetId}> has opted out of being captured as a Pokémon.`
            ),
          ],
          components: [],
        });
      }

      await db.insert(pokemonCaptures).values({
        guildId,
        trainerId,
        pokemonId: targetId,
        pokemonName: targetName,
      });

      const isYield = reason === 'yield';
      const caughtTitle = '⭐ Gotcha! Pokémon Caught!';
      const reasonText = isYield
        ? `<@${targetId}> submitted peacefully and entered the Pokéball!`
        : `<@${targetId}> was caught off guard and did not react in time!`;

      const caughtEmbed = createBaseEmbed()
        .setColor('#10B981')
        .setTitle(caughtTitle)
        .setDescription(
          `### 🔴 Click... Click... Click... **DING!** 🎉\n\n` +
            `${reasonText}\n\n` +
            `**Gotcha!** <@${targetId}> was captured by <@${trainerId}>!\n\n` +
            `• Use \`/pokemon summon\` to send them into battle!\n` +
            `• Use \`/pokemon list\` to view your complete party!`
        )
        .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
        .setFooter({ text: 'Webdevkin custom minigame • Capture Successful' });

      await interaction.editReply({
        content: `<@${targetId}>`,
        embeds: [caughtEmbed],
        components: [],
      });
    } catch (err) {
      logger.error('Error concluding pokemon capture:', err);
    }
  });
}

/**
 * Handles the summon flow.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} pokemonInput
 */
async function handleSummonFlow(interaction, pokemonInput) {
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const cleanInput = (pokemonInput || '').trim();
  const mentionMatch = cleanInput.match(/^<@!?(\d{17,20})>$/);
  const pokemonId = mentionMatch ? mentionMatch[1] : cleanInput;

  if (!pokemonId || pokemonId === 'none') {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'No Pokémon Specified',
          'You have not specified a Pokémon to summon! Choose a Pokémon you have captured using `/summon-pokemon` or check your party with `/pokemon list`.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const trainerId = interaction.user.id;

  if (!db) {
    return interaction.reply({
      embeds: [errorEmbed('Database Error', 'Database is currently inactive.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const rows = await db
    .select()
    .from(pokemonCaptures)
    .where(
      and(
        eq(pokemonCaptures.guildId, guildId),
        eq(pokemonCaptures.trainerId, trainerId),
        eq(pokemonCaptures.pokemonId, pokemonId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Pokémon Not Found',
          `❌ You have not captured this Pokémon, or they have been released!\n\nUse \`/pokemon list\` to see the Pokémon currently in your party.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const record = rows[0];
  const pokemonUser = await interaction.client.users.fetch(pokemonId).catch(() => null);
  const pfp = pokemonUser
    ? pokemonUser.displayAvatarURL({ extension: 'png', size: 512 })
    : interaction.client.user.displayAvatarURL({ extension: 'png', size: 512 });

  const capturedTimestamp = Math.floor(new Date(record.capturedAt).getTime() / 1000);

  const summonEmbed = createBaseEmbed()
    .setColor('#FF3E3E')
    .setTitle('⚡ I Choose You!')
    .setDescription(
      `### 🔴 <@${trainerId}> chooses <@${pokemonId}>!\n\n` +
        `**<@${pokemonId}>**, enter the arena and prepare for battle!`
    )
    .setImage(pfp)
    .addFields(
      { name: '🧢 Trainer', value: `<@${trainerId}>`, inline: true },
      { name: '⚡ Active Pokémon', value: `<@${pokemonId}>`, inline: true },
      { name: '📅 Caught', value: `<t:${capturedTimestamp}:R>`, inline: true }
    )
    .setFooter({ text: 'Webdevkin custom minigame • Battle Summon' });

  return interaction.reply({
    content: `<@${pokemonId}>`,
    embeds: [summonEmbed],
  });
}

/**
 * Handles the release flow.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} pokemonInput
 */
async function handleReleaseFlow(interaction, pokemonInput) {
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const cleanInput = (pokemonInput || '').trim();
  const mentionMatch = cleanInput.match(/^<@!?(\d{17,20})>$/);
  const pokemonId = mentionMatch ? mentionMatch[1] : cleanInput;

  if (!pokemonId || pokemonId === 'none') {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'No Pokémon Specified',
          'Please select a captured Pokémon from your party to release.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const trainerId = interaction.user.id;

  if (!db) {
    return interaction.reply({
      embeds: [errorEmbed('Database Error', 'Database is currently inactive.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const rows = await db
    .select()
    .from(pokemonCaptures)
    .where(
      and(
        eq(pokemonCaptures.guildId, guildId),
        eq(pokemonCaptures.trainerId, trainerId),
        eq(pokemonCaptures.pokemonId, pokemonId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Pokémon Not Found',
          `❌ You do not own this Pokémon in your party or they have already been released.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await db
    .delete(pokemonCaptures)
    .where(
      and(
        eq(pokemonCaptures.guildId, guildId),
        eq(pokemonCaptures.trainerId, trainerId),
        eq(pokemonCaptures.pokemonId, pokemonId)
      )
    );

  const pokemonUser = await interaction.client.users.fetch(pokemonId).catch(() => null);
  const pfp = pokemonUser ? pokemonUser.displayAvatarURL({ extension: 'png', size: 256 }) : null;

  const releaseEmbed = createBaseEmbed()
    .setColor('#10B981')
    .setTitle('🍃 Pokémon Released!')
    .setDescription(
      `### 🕊️ <@${trainerId}> released <@${pokemonId}> back into the wild!\n\n` +
        `*"Bye-bye, <@${pokemonId}>! Thank you for the memories and battles!"* 👋\n\n` +
        `<@${pokemonId}> is now wild and free to be caught by anyone again.`
    )
    .addFields(
      { name: 'Former Trainer', value: `<@${trainerId}>`, inline: true },
      { name: 'Released Pokémon', value: `<@${pokemonId}>`, inline: true }
    )
    .setFooter({ text: 'Webdevkin custom minigame • Wild Release' });

  if (pfp) {
    releaseEmbed.setThumbnail(pfp);
  }

  return interaction.reply({
    content: `<@${pokemonId}>`,
    embeds: [releaseEmbed],
  });
}

/**
 * Handles transferring a captured Pokémon to another trainer in the server.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} pokemonInput
 * @param {import('discord.js').User} targetTrainer
 */
async function handleTransferFlow(interaction, pokemonInput, targetTrainer) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const cleanInput = (pokemonInput || '').trim();
  const mentionMatch = cleanInput.match(/^<@!?(\d{17,20})>$/);
  const pokemonId = mentionMatch ? mentionMatch[1] : cleanInput;

  if (!pokemonId || pokemonId === 'none') {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'No Pokémon Specified',
          'You have not specified a Pokémon to transfer! Select one from your party.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const currentTrainerId = interaction.user.id;

  if (!db) {
    return interaction.reply({
      embeds: [errorEmbed('Database Error', 'Database is currently inactive.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 1. Check if current trainer owns this pokemon
  const ownedRows = await db
    .select()
    .from(pokemonCaptures)
    .where(
      and(
        eq(pokemonCaptures.guildId, guildId),
        eq(pokemonCaptures.trainerId, currentTrainerId),
        eq(pokemonCaptures.pokemonId, pokemonId)
      )
    )
    .limit(1);

  if (ownedRows.length === 0) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Pokémon Not Found',
          `❌ You do not own this Pokémon in your party!\n\nUse \`/pokemon list\` to see your party members.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const pokemonRecord = ownedRows[0];

  // 2. Validate target recipient
  if (!targetTrainer) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Recipient', 'Please specify a valid user to transfer to.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetTrainer.bot) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Recipient', '🤖 You cannot transfer a Pokémon to a bot!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetTrainer.id === currentTrainerId) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Invalid Recipient',
          '🧢 You already own this Pokémon! You cannot transfer to yourself.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetTrainer.id === pokemonId) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Recipient', '❌ You cannot transfer a Pokémon to itself!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Verify recipient is a member of this server
  const recipientMember = await interaction.guild.members.fetch(targetTrainer.id).catch(() => null);
  if (!recipientMember) {
    return interaction.reply({
      embeds: [
        errorEmbed('Member Not Found', `❌ <@${targetTrainer.id}> is not a member of this server.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 3. Mutual capture prevention:
  // If the Pokémon has captured targetTrainer, targetTrainer cannot own the Pokémon
  const isTargetCapturedByPokemon = await hasTargetCapturedTrainer(
    guildId,
    targetTrainer.id,
    pokemonId
  );
  if (isTargetCapturedByPokemon) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Transfer Denied',
          `❌ <@${targetTrainer.id}> cannot receive this Pokémon because <@${pokemonId}> has already captured them!\n\n` +
            `A trainer cannot own the Pokémon that holds them captive.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 4. Check if targetTrainer has opted out
  const isRecipientOptedOut = await isUserOptedOut(guildId, targetTrainer.id);
  if (isRecipientOptedOut) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Transfer Denied',
          `❌ <@${targetTrainer.id}> has opted out of the Pokémon system and cannot receive Pokémon.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 5. Active battle check
  const pokemonKey = `${guildId}:${pokemonId}`;
  if (activeBattles.has(pokemonKey)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Pokémon Busy',
          `❌ <@${pokemonId}> is currently engaged in an active battle! Please wait for it to conclude.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 6. Execute transfer
  await db
    .update(pokemonCaptures)
    .set({
      trainerId: targetTrainer.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pokemonCaptures.guildId, guildId),
        eq(pokemonCaptures.trainerId, currentTrainerId),
        eq(pokemonCaptures.pokemonId, pokemonId)
      )
    );

  const pokemonUser = await interaction.client.users.fetch(pokemonId).catch(() => null);
  const pfp = pokemonUser ? pokemonUser.displayAvatarURL({ extension: 'png', size: 256 }) : null;

  const transferEmbed = createBaseEmbed()
    .setColor('#3B82F6')
    .setTitle('🔄 Pokémon Ownership Transferred!')
    .setDescription(
      `### 🤝 A Pokémon has been traded!\n\n` +
        `<@${currentTrainerId}> has transferred ownership of <@${pokemonId}> (**${pokemonRecord.pokemonName}**) to <@${targetTrainer.id}>!\n\n` +
        `• **New Trainer:** <@${targetTrainer.id}>\n` +
        `• **Transferred Pokémon:** <@${pokemonId}>\n` +
        `• **Previous Trainer:** <@${currentTrainerId}>\n\n` +
        `*<@${targetTrainer.id}> can now summon <@${pokemonId}> into battle using \`/pokemon summon\`!*`
    );

  if (pfp) {
    transferEmbed.setThumbnail(pfp);
  }

  transferEmbed.setFooter({ text: 'Webdevkin custom minigame • Pokémon Transfer' });

  return interaction.reply({
    content: `<@${pokemonId}> <@${targetTrainer.id}>`,
    embeds: [transferEmbed],
  });
}

/**
 * Runs the interactive captive Pokémon breakout battle against the reinforced Pokéball containment matrix.
 */
async function startCaptiveBreakoutBattle({
  interaction,
  captiveUser,
  trainerUser,
  trainerId,
  guildId,
  captiveKey,
}) {
  let captiveHp = 100;
  let ballHp = 125; // Reinforced containment: higher HP makes it harder to escape
  let round = 1;
  const captiveId = captiveUser.id;
  const cooldownKey = `${guildId}:${captiveId}`;

  const battleLogs = [
    `⚠️ **BREAKOUT INITIATED!** <@${captiveId}> is struggling fiercely against the Pokéball containment!`,
  ];

  const heavyId = `poke_bo_heavy_${interaction.id}`;
  const quickId = `poke_bo_quick_${interaction.id}`;
  const shieldId = `poke_bo_shield_${interaction.id}`;

  const buildRow = (disabled = false) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(heavyId)
        .setLabel('Heavy Struggle')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💥')
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(quickId)
        .setLabel('Precision Burst')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚡')
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(shieldId)
        .setLabel('Iron Guard')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️')
        .setDisabled(disabled)
    );

  const buildEmbed = (statusTitle, statusColor) => {
    return createBaseEmbed()
      .setColor(statusColor)
      .setTitle(statusTitle)
      .setDescription(
        `### ⚔️ Containment Breakout Battle — Round ${round}\n\n` +
          `**Captive Pokémon:** <@${captiveId}>\n` +
          `${renderHpBar(captiveHp, 100)}\n\n` +
          `**Reinforced Pokéball Containment:** (Trainer: <@${trainerId}>)\n` +
          `${renderHpBar(ballHp, 125)}\n\n` +
          `**📜 Combat Log:**\n` +
          `${battleLogs.slice(-3).join('\n')}\n\n` +
          `**Choose your escape move within 25 seconds!** *(Tactical defense is required!)*\n` +
          `• 💥 **Heavy Struggle**: High DMG (28–45 DMG to Ball, 25% recoil: 18 DMG)\n` +
          `• ⚡ **Precision Burst**: 100% Reliable (18–26 DMG to Ball)\n` +
          `• 🛡️ **Iron Guard**: Blocks 50% incoming DMG, heals +10 HP, reflects 12–20 DMG`
      )
      .setThumbnail(captiveUser.displayAvatarURL({ extension: 'png', size: 256 }))
      .setFooter({ text: `Webdevkin custom breakout minigame • Round ${round}` });
  };

  const initialEmbed = buildEmbed('⚔️ POKÉMON BREAKOUT: Shatter The Pokéball!', '#FFA500');

  const replyMsg = await interaction.reply({
    content: `<@${captiveId}> <@${trainerId}>`,
    embeds: [initialEmbed],
    components: [buildRow(false)],
  });

  const collector = replyMsg.createMessageComponentCollector({
    time: 25000,
  });

  collector.on('collect', async (btnInt) => {
    if (btnInt.user.id !== captiveId) {
      return btnInt.reply({
        content: `❌ Only <@${captiveId}> can fight to break out of their Pokéball!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await btnInt.deferUpdate().catch(() => {});

    let playerMoveLog = '';
    let isShielded = false;

    if (btnInt.customId === heavyId) {
      const isRecoil = Math.random() < 0.25;
      const dmg = 28 + Math.floor(Math.random() * 18);
      ballHp = Math.max(0, ballHp - dmg);

      if (isRecoil) {
        const recoilDmg = 18;
        captiveHp = Math.max(0, captiveHp - recoilDmg);
        playerMoveLog = `💥 <@${captiveId}> unleashed **Heavy Struggle**! Dealt **${dmg} DMG** to the Pokéball, but suffered **${recoilDmg} recoil DMG**!`;
      } else {
        playerMoveLog = `💥 <@${captiveId}> unleashed **Heavy Struggle**! Hammered the sphere for **${dmg} DMG**!`;
      }
    } else if (btnInt.customId === quickId) {
      const dmg = 18 + Math.floor(Math.random() * 9);
      ballHp = Math.max(0, ballHp - dmg);
      playerMoveLog = `⚡ <@${captiveId}> targeted the latch with **Precision Burst**! Landed **${dmg} DMG**!`;
    } else if (btnInt.customId === shieldId) {
      isShielded = true;
      const counterDmg = 12 + Math.floor(Math.random() * 9);
      const healAmount = 10;
      captiveHp = Math.min(100, captiveHp + healAmount);
      ballHp = Math.max(0, ballHp - counterDmg);
      playerMoveLog = `🛡️ <@${captiveId}> raised **Iron Guard**! Restored **+${healAmount} HP** and reflected **${counterDmg} DMG** back into the matrix!`;
    }

    battleLogs.push(playerMoveLog);

    if (ballHp <= 0) {
      collector.stop('captive_won');
      return;
    }

    if (captiveHp <= 0) {
      collector.stop('captive_lost');
      return;
    }

    // Reinforced containment counter-attack
    const shockMoves = [
      'Neural Pulse',
      'Stasis Arc',
      'Electromagnetic Tether',
      'Containment Clamp',
      'High-Voltage Surge',
    ];
    const ballMoveName = shockMoves[Math.floor(Math.random() * shockMoves.length)];
    let rawBallDmg = 18 + Math.floor(Math.random() * 15); // 18-32 DMG

    if (isShielded) {
      rawBallDmg = Math.max(8, Math.floor(rawBallDmg * 0.5));
      captiveHp = Math.max(0, captiveHp - rawBallDmg);
      battleLogs.push(
        `🔴 Pokéball discharged **${ballMoveName}**, but **Iron Guard** absorbed half! Took **${rawBallDmg} DMG**!`
      );
    } else {
      captiveHp = Math.max(0, captiveHp - rawBallDmg);
      battleLogs.push(
        `🔴 Pokéball discharged a fierce **${ballMoveName}**! Dealt **${rawBallDmg} DMG** to <@${captiveId}>!`
      );
    }

    if (captiveHp <= 0) {
      collector.stop('captive_lost');
      return;
    }

    round++;
    collector.resetTimer();

    const roundEmbed = buildEmbed('⚔️ POKÉMON BREAKOUT: Shatter The Pokéball!', '#FFA500');
    await interaction
      .editReply({
        content: `<@${captiveId}> <@${trainerId}>`,
        embeds: [roundEmbed],
        components: [buildRow(false)],
      })
      .catch(() => {});
  });

  collector.on('end', async (_, reason) => {
    activeBattles.delete(captiveKey);

    try {
      if (reason === 'captive_won') {
        if (!db) {
          return interaction.editReply({
            content: `<@${captiveId}>`,
            embeds: [
              errorEmbed(
                'Database Error',
                'Could not conclude breakout: Database connection inactive.'
              ),
            ],
            components: [],
          });
        }

        await db
          .delete(pokemonCaptures)
          .where(
            and(eq(pokemonCaptures.guildId, guildId), eq(pokemonCaptures.pokemonId, captiveId))
          );

        // Clear cooldown since they successfully broke free
        captiveBreakoutCooldowns.delete(cooldownKey);

        const victoryEmbed = createBaseEmbed()
          .setColor('#10B981')
          .setTitle('💥 BREAKOUT SUCCESSFUL! Pokémon Broke Free!')
          .setDescription(
            `### 🕊️ With an explosive final surge, <@${captiveId}> completely shattered the Pokéball!\n\n` +
              `<@${captiveId}> has broken free from <@${trainerId}>'s control and escaped triumphantly back into the wild!\n\n` +
              `• **Pokéball Integrity:** \`[░░░░░░░░░░] 0/125 HP\` *(SHATTERED)*\n` +
              `• **Status:** Wild & Free in **${interaction.guild.name}**\n` +
              `• <@${trainerId}> no longer holds them in their party.`
          )
          .setThumbnail(captiveUser.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Webdevkin custom breakout minigame • Breakout Successful' });

        await interaction.editReply({
          content: `<@${captiveId}> <@${trainerId}>`,
          embeds: [victoryEmbed],
          components: [],
        });
      } else {
        // captive_lost or time
        // Set 3 minute cooldown on failure
        captiveBreakoutCooldowns.set(cooldownKey, Date.now() + 180000);

        const isTimeout = reason === 'time';
        const failReason = isTimeout
          ? `<@${captiveId}> hesitated in battle and was subdued by the Pokéball's auto-containment field!`
          : `<@${captiveId}> took too much damage and collapsed from exhaustion!`;

        const defeatEmbed = createBaseEmbed()
          .setColor('#EF4444')
          .setTitle('🔒 Breakout Suppressed — Containment Held!')
          .setDescription(
            `### ⚡ The Pokéball's security suppression system held firm!\n\n` +
              `${failReason}\n\n` +
              `• **Pokéball Integrity:** \`${Math.max(0, ballHp)}/125 HP\`\n` +
              `• <@${captiveId}> remains captured under <@${trainerId}>'s command.\n` +
              `• ⏳ <@${captiveId}> must rest for **3 minutes** before attempting another breakout!`
          )
          .setThumbnail(captiveUser.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Webdevkin custom breakout minigame • Breakout Suppressed' });

        await interaction.editReply({
          content: `<@${captiveId}> <@${trainerId}>`,
          embeds: [defeatEmbed],
          components: [],
        });
      }
    } catch (err) {
      logger.error('Error concluding breakout battle:', err);
    }
  });
}

/**
 * Handles the /pokemon fightback command for captured Pokémon trying to break free.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleFightBackCommand(interaction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const captiveUser = interaction.user;
  const captiveId = captiveUser.id;

  if (!db) {
    return interaction.reply({
      embeds: [errorEmbed('Database Error', 'Database is currently inactive.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 1. Check if user is currently captured by someone in this guild
  const ownerRecord = await getPokemonOwner(guildId, captiveId);
  if (!ownerRecord) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Not Captured',
          '🌿 You are not currently captured by anyone! You are roaming wild and free in this server.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const trainerId = ownerRecord.trainerId;
  const trainerUser = await interaction.client.users.fetch(trainerId).catch(() => null);

  // 2. Channel fightback permissions check
  const captiveMember = await interaction.guild.members.fetch(captiveId).catch(() => null);
  const permCheck = await checkFightBackPermissions(interaction.channel, captiveMember);
  if (!permCheck.allowed) {
    return interaction.reply({
      embeds: [errorEmbed('Breakout Denied', permCheck.message)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 3. Cooldown check (3 minutes after failing a breakout)
  const cooldownKey = `${guildId}:${captiveId}`;
  if (captiveBreakoutCooldowns.has(cooldownKey)) {
    const expiresAt = captiveBreakoutCooldowns.get(cooldownKey);
    const remaining = expiresAt - Date.now();
    if (remaining > 0) {
      const waitSeconds = Math.ceil(remaining / 1000);
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Exhausted from Breakout',
            `⏳ You are completely exhausted from your previous escape attempt!\n\n` +
              `Your energy is depleted. Rest for **${waitSeconds}s** before attempting to break free again.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      captiveBreakoutCooldowns.delete(cooldownKey);
    }
  }

  // 4. Active battle lock
  const captiveKey = `${guildId}:${captiveId}`;
  if (activeBattles.has(captiveKey)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Battle In Progress',
          '❌ An active battle or escape attempt is already in progress involving you! Please finish it first.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  activeBattles.add(captiveKey);

  // 5. Start the breakout battle
  await startCaptiveBreakoutBattle({
    interaction,
    captiveUser,
    trainerUser,
    trainerId,
    guildId,
    captiveKey,
  });
}

/**
 * Handles the pokemon list flow.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').User|null} targetUserOption
 */
async function handleListFlow(interaction, targetUserOption) {
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = targetUserOption || interaction.user;
  const guildId = interaction.guildId;

  if (!db) {
    return interaction.reply({
      embeds: [errorEmbed('Database Error', 'Database is currently inactive.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 1. Get party Pokémon captured by targetUser
  const party = await getTrainerPokemon(guildId, targetUser.id);

  // 2. Check if targetUser themselves is captured by someone in this server
  const capturedRecord = await getPokemonOwner(guildId, targetUser.id);

  const statusStr = capturedRecord
    ? `🔒 **Status:** Captured by <@${capturedRecord.trainerId}> (<t:${Math.floor(new Date(capturedRecord.capturedAt).getTime() / 1000)}:R>)`
    : `🌿 **Status:** Wild & Free *(Not captured by anyone)*`;

  let partyDesc = '';
  if (party.length === 0) {
    partyDesc = '_No Pokémon in party yet. Use `/capture-pokemon` to catch server members!_';
  } else {
    partyDesc = party
      .map((p, idx) => {
        const timeStr = `<t:${Math.floor(new Date(p.capturedAt).getTime() / 1000)}:R>`;
        return `**${idx + 1}.** <@${p.pokemonId}> (**${p.pokemonName}**) · ${timeStr}`;
      })
      .join('\n');
  }

  const targetName = targetUser.displayName || targetUser.username;
  const listEmbed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`🎒 Pokémon Party — ${targetName}`)
    .setDescription(`${statusStr}\n\n` + `### 👥 Active Party (${party.length})\n` + `${partyDesc}`)
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setFooter({
      text: `Webdevkin custom minigame • ${party.length} Pokémon in Party`,
    });

  return interaction.reply({ embeds: [listEmbed] });
}

/**
 * Checks whether a user has opted out of being captured as a Pokémon.
 * Returns true if the user opted out in this specific guild OR globally.
 * Defaults to false (everyone is opted in by default).
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isUserOptedOut(guildId, userId) {
  if (!db || !userId) return false;
  try {
    const rows = await db
      .select()
      .from(pokemonOptOuts)
      .where(
        and(
          eq(pokemonOptOuts.userId, userId),
          or(eq(pokemonOptOuts.guildId, guildId), eq(pokemonOptOuts.guildId, 'global'))
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    logger.error('Failed to check pokemon opt-out status:', err);
    return false;
  }
}

/**
 * Gets detailed opt status for a user.
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<{isOptedOut: boolean, isServerOptedOut: boolean, isGlobalOptedOut: boolean}>}
 */
async function getUserOptStatus(guildId, userId) {
  if (!db || !userId) {
    return { isOptedOut: false, isServerOptedOut: false, isGlobalOptedOut: false };
  }
  try {
    const rows = await db
      .select()
      .from(pokemonOptOuts)
      .where(
        and(
          eq(pokemonOptOuts.userId, userId),
          or(eq(pokemonOptOuts.guildId, guildId), eq(pokemonOptOuts.guildId, 'global'))
        )
      );

    const isGlobalOptedOut = rows.some((r) => r.guildId === 'global');
    const isServerOptedOut = rows.some((r) => r.guildId === guildId);
    return {
      isOptedOut: rows.length > 0,
      isServerOptedOut,
      isGlobalOptedOut,
    };
  } catch (err) {
    logger.error('Failed to get user opt status:', err);
    return { isOptedOut: false, isServerOptedOut: false, isGlobalOptedOut: false };
  }
}

/**
 * Updates a user's Pokémon opt-in / opt-out setting.
 * When opting out, automatically releases the user from any trainer party holding them.
 * @param {string} guildId
 * @param {string} userId
 * @param {'in'|'out'} action
 * @param {'server'|'global'} scope
 */
async function setUserOptStatus(guildId, userId, action, scope = 'server') {
  if (!db) throw new Error('Database connection inactive');
  const cleanScope = (scope || 'server').toLowerCase();

  if (action === 'out') {
    const targetGuildId = cleanScope === 'global' ? 'global' : guildId;

    const existing = await db
      .select()
      .from(pokemonOptOuts)
      .where(and(eq(pokemonOptOuts.userId, userId), eq(pokemonOptOuts.guildId, targetGuildId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(pokemonOptOuts).values({
        guildId: targetGuildId,
        userId,
      });
    }

    // Auto-release from any trainer holding this member as a Pokémon
    let releasedCaptures = 0;
    try {
      if (cleanScope === 'global') {
        const result = await db
          .delete(pokemonCaptures)
          .where(eq(pokemonCaptures.pokemonId, userId));
        releasedCaptures = result[0]?.affectedRows || 0;
      } else {
        const result = await db
          .delete(pokemonCaptures)
          .where(and(eq(pokemonCaptures.guildId, guildId), eq(pokemonCaptures.pokemonId, userId)));
        releasedCaptures = result[0]?.affectedRows || 0;
      }
    } catch (delErr) {
      logger.warn('Failed to auto-release pokemon upon opt-out:', delErr);
    }

    return { success: true, action: 'out', scope: cleanScope, releasedCaptures };
  } else if (action === 'in') {
    // When opting back in, clear opt-out records
    if (cleanScope === 'global') {
      await db.delete(pokemonOptOuts).where(eq(pokemonOptOuts.userId, userId));
    } else {
      await db
        .delete(pokemonOptOuts)
        .where(
          and(
            eq(pokemonOptOuts.userId, userId),
            or(eq(pokemonOptOuts.guildId, guildId), eq(pokemonOptOuts.guildId, 'global'))
          )
        );
    }
    return { success: true, action: 'in', scope: cleanScope };
  }

  throw new Error(`Invalid action: ${action}`);
}

/**
 * Handles the /pokemon opt, /pokemon opt-out, and /pokemon opt-in flows.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string|null} actionInput
 * @param {string|null} scopeInput
 */
async function handleOptFlow(interaction, actionInput, scopeInput) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({
      embeds: [
        errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.'),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const scope = (scopeInput || 'server').toLowerCase();
  const action = actionInput ? actionInput.toLowerCase() : null;

  if (action === 'out' || action === 'in') {
    try {
      const result = await setUserOptStatus(guildId, userId, action, scope);
      if (result.action === 'out') {
        const scopeDesc =
          result.scope === 'global'
            ? 'across **all Discord servers** (Global)'
            : `in **${interaction.guild.name}** (This Server)`;

        const releaseMsg =
          result.releasedCaptures > 0
            ? `\n\n🕊️ *You were automatically released from ${result.releasedCaptures} trainer party/parties.*`
            : '';

        const embed = createBaseEmbed()
          .setColor('#10B981')
          .setTitle('🛡️ Pokémon Captures Disabled (Opted Out)')
          .setDescription(
            `### 🔒 You have opted out of being a Pokémon ${scopeDesc}!\n\n` +
              `• **No trainer can capture you** with Pokéballs.\n` +
              `• You will **not receive** capture challenge pings or battle prompts.\n` +
              `• Other trainers attempting to capture you will be notified that you are not catchable.${releaseMsg}\n\n` +
              `*Changed your mind? Use \`/pokemon opt-in\` at any time to re-enable captures!*`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Arcadia Pokémon • Status: Opted Out' });

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      } else {
        const scopeDesc =
          result.scope === 'global'
            ? 'across **all Discord servers**'
            : `in **${interaction.guild.name}**`;

        const embed = createBaseEmbed()
          .setColor('#3B82F6')
          .setTitle('⚔️ Pokémon Captures Enabled (Opted In)')
          .setDescription(
            `### 🌟 You are now opted in to Pokémon captures ${scopeDesc}!\n\n` +
              `• Server trainers can now challenge you to wild Pokémon capture battles.\n` +
              `• When challenged, you can **Fight Back!** to shatter their Pokéballs or **Yield** to join their party.\n` +
              `• By default, all server members are opted in.\n\n` +
              `*You can opt out anytime using \`/pokemon opt-out\`.*`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: 'Arcadia Pokémon • Status: Opted In (Default)' });

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error('Failed to update pokemon opt status:', err);
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Settings Error',
            'An error occurred while updating your Pokémon preference. Please try again later.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Interactive menu when no action is passed (view status + toggle buttons)
  const status = await getUserOptStatus(guildId, userId);

  const buildStatusEmbed = (st) => {
    let currentStatusText = '';
    let color = '#3B82F6';

    if (st.isGlobalOptedOut) {
      color = '#EF4444';
      currentStatusText =
        '🛡️ **Status:** `Opted Out (Globally)`\n' +
        '• You are completely immune to capture in **all servers**.\n' +
        '• No one can throw a Pokéball at you anywhere.';
    } else if (st.isServerOptedOut) {
      color = '#F59E0B';
      currentStatusText =
        `🛡️ **Status:** \`Opted Out (${interaction.guild.name})\`\n` +
        '• You cannot be captured in **this server**.\n' +
        '• Trainers here cannot challenge you or add you to their party.';
    } else {
      color = '#10B981';
      currentStatusText =
        '🟢 **Status:** `Opted In (Default)`\n' +
        '• You can currently be challenged and captured as a wild Pokémon.\n' +
        '• You can always fight back in battle mini-games to break free!';
    }

    return createBaseEmbed()
      .setColor(color)
      .setTitle('⚙️ Pokémon Capture Preferences')
      .setDescription(
        `### Current Status for <@${userId}>\n\n` +
          `${currentStatusText}\n\n` +
          `**Options & Actions:**\n` +
          `• Click **🛡️ Opt Out (This Server)** to disable captures here only.\n` +
          `• Click **🌐 Opt Out (Global)** to disable captures across all servers.\n` +
          `• Click **⚔️ Opt In** to allow trainers to catch you (default).`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
      .setFooter({ text: 'Click a button below within 60 seconds to toggle your status' });
  };

  const optServerBtnId = `poke_opt_srv_${interaction.id}`;
  const optGlobalBtnId = `poke_opt_glb_${interaction.id}`;
  const optInBtnId = `poke_opt_in_${interaction.id}`;

  const buildButtons = (st, disabled = false) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(optServerBtnId)
        .setLabel('Opt Out (Server)')
        .setStyle(
          st.isServerOptedOut && !st.isGlobalOptedOut ? ButtonStyle.Secondary : ButtonStyle.Primary
        )
        .setEmoji('🛡️')
        .setDisabled(disabled || (st.isServerOptedOut && !st.isGlobalOptedOut)),
      new ButtonBuilder()
        .setCustomId(optGlobalBtnId)
        .setLabel('Opt Out (Global)')
        .setStyle(st.isGlobalOptedOut ? ButtonStyle.Secondary : ButtonStyle.Danger)
        .setEmoji('🌐')
        .setDisabled(disabled || st.isGlobalOptedOut),
      new ButtonBuilder()
        .setCustomId(optInBtnId)
        .setLabel('Opt In (Default)')
        .setStyle(!st.isOptedOut ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setEmoji('⚔️')
        .setDisabled(disabled || !st.isOptedOut)
    );
  };

  const initialEmbed = buildStatusEmbed(status);
  const initialRow = buildButtons(status, false);

  const replyMsg = await interaction.reply({
    embeds: [initialEmbed],
    components: [initialRow],
    flags: MessageFlags.Ephemeral,
  });

  const collector = replyMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 60000,
  });

  collector.on('collect', async (btnInt) => {
    await btnInt.deferUpdate().catch(() => {});

    try {
      if (btnInt.customId === optServerBtnId) {
        await setUserOptStatus(guildId, userId, 'out', 'server');
      } else if (btnInt.customId === optGlobalBtnId) {
        await setUserOptStatus(guildId, userId, 'out', 'global');
      } else if (btnInt.customId === optInBtnId) {
        await setUserOptStatus(guildId, userId, 'in', 'global');
      }

      const updatedStatus = await getUserOptStatus(guildId, userId);
      await interaction.editReply({
        embeds: [buildStatusEmbed(updatedStatus)],
        components: [buildButtons(updatedStatus, false)],
      });
    } catch (err) {
      logger.error('Error updating status in collector:', err);
    }
  });

  collector.on('end', async () => {
    const finalStatus = await getUserOptStatus(guildId, userId);
    await interaction
      .editReply({
        embeds: [buildStatusEmbed(finalStatus)],
        components: [buildButtons(finalStatus, true)],
      })
      .catch(() => {});
  });
}

/**
 * Autocomplete handler for member selection.
 * @param {import('discord.js').AutocompleteInteraction} interaction
 */
async function autocompleteMembers(interaction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase().trim();
    if (!interaction.guild) return interaction.respond([]);

    const members = Array.from(interaction.guild.members.cache.values())
      .filter((m) => !m.user.bot && m.user.id !== interaction.user.id)
      .filter((m) => {
        const name = (m.nickname || m.user.username).toLowerCase();
        const tag = m.user.tag.toLowerCase();
        const id = m.user.id;
        return (
          name.includes(focusedValue) || tag.includes(focusedValue) || id.includes(focusedValue)
        );
      })
      .slice(0, 25);

    const choices = members.map((m) => {
      const display = m.nickname ? `${m.nickname} (@${m.user.username})` : m.user.tag;
      return {
        name: display.length > 95 ? `${display.slice(0, 92)}...` : display,
        value: m.user.id,
      };
    });

    await interaction.respond(choices);
  } catch (err) {
    logger.error('Autocomplete error in autocompleteMembers:', err);
  }
}

/**
 * Autocomplete handler for suggesting captured Pokemon of the trainer.
 * @param {import('discord.js').AutocompleteInteraction} interaction
 */
async function autocompleteTrainerPokemon(interaction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase().trim();
    if (!interaction.guildId) return interaction.respond([]);

    const list = await getTrainerPokemon(interaction.guildId, interaction.user.id);
    if (list.length === 0) {
      return interaction.respond([
        { name: 'No captured Pokémon in your party (use /capture-pokemon)', value: 'none' },
      ]);
    }

    const filtered = list.filter((p) => {
      const name = (p.pokemonName || '').toLowerCase();
      const id = p.pokemonId;
      return name.includes(focusedValue) || id.includes(focusedValue);
    });

    const choices = filtered.slice(0, 25).map((p) => ({
      name: `${p.pokemonName} (${p.pokemonId})`,
      value: p.pokemonId,
    }));

    await interaction.respond(choices);
  } catch (err) {
    logger.error('Autocomplete error in autocompleteTrainerPokemon:', err);
  }
}

module.exports = {
  resolveUser,
  checkFightBackPermissions,
  recordUserMessageActivity,
  isUserActiveRecently,
  getTrainerPokemon,
  getPokemonOwner,
  hasTargetCapturedTrainer,
  isUserOptedOut,
  getUserOptStatus,
  setUserOptStatus,
  handleCaptureFlow,
  handleSummonFlow,
  handleReleaseFlow,
  handleTransferFlow,
  handleFightBackCommand,
  handleListFlow,
  handleOptFlow,
  autocompleteMembers,
  autocompleteTrainerPokemon,
};
