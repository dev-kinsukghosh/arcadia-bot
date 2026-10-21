const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { db } = require('./db.js');
const { pokemonCaptures } = require('../db/schema.js');
const { eq, and, desc } = require('drizzle-orm');
const { createBaseEmbed, EMBED_COLORS, errorEmbed, successEmbed } = require('./embedHelper.js');
const logger = require('./logger.js');

// In-memory set to prevent duplicate concurrent capture battles on the same user/trainer
// Key: `${guildId}:${userId}`
const activeBattles = new Set();

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
    await interaction.editReply({
      content: `<@${targetUser.id}>`,
      embeds: [roundEmbed],
      components: [buildMiniGameRow(false)],
    }).catch(() => {});
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
            embeds: [errorEmbed('Database Error', 'Could not save capture: Database connection inactive.')],
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
      .where(and(eq(pokemonCaptures.guildId, guildId), eq(pokemonCaptures.trainerId, targetId), eq(pokemonCaptures.pokemonId, trainerId)))
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
      embeds: [errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.')],
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

  // 3. Mutual capture rule: "u cant capture the person who captured u"
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

  // 4. Check if target is already captured in this server
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

  // 5. Active battle lock
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
          embeds: [errorEmbed('Database Error', 'Could not save capture: Database connection inactive.')],
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
      embeds: [errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.')],
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
      embeds: [errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.')],
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
 * Handles the pokemon list flow.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').User|null} targetUserOption
 */
async function handleListFlow(interaction, targetUserOption) {
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [errorEmbed('Server Only', 'Pokémon commands can only be used inside a Discord server.')],
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
    .setDescription(
      `${statusStr}\n\n` +
        `### 👥 Active Party (${party.length})\n` +
        `${partyDesc}`
    )
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setFooter({
      text: `Webdevkin custom minigame • ${party.length} Pokémon in Party`,
    });

  return interaction.reply({ embeds: [listEmbed] });
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
        return name.includes(focusedValue) || tag.includes(focusedValue) || id.includes(focusedValue);
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
  getTrainerPokemon,
  getPokemonOwner,
  hasTargetCapturedTrainer,
  handleCaptureFlow,
  handleSummonFlow,
  handleReleaseFlow,
  handleListFlow,
  autocompleteMembers,
  autocompleteTrainerPokemon,
};
