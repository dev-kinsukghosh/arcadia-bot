const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const logger = require('./logger.js');

/**
 * Helper to fetch an image from a URL and convert it to a buffer for napi-rs/canvas
 * @param {string} url - Image URL (e.g. Discord avatar)
 * @returns {Promise<Buffer>} Image buffer
 */
async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    logger.error(`Failed to fetch image from URL: ${url}`, error);
    throw error;
  }
}

/**
 * Creates a premium glassmorphic Welcome Card image
 * @param {Object} options
 * @param {string} options.username - User's username
 * @param {string} options.discriminator - User's discriminator
 * @param {string} options.avatarUrl - Absolute URL of the user's avatar
 * @param {string} options.serverName - The Discord Server Name
 * @param {number} [options.memberCount] - Current member count
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function createWelcomeCard({ username, discriminator, avatarUrl, serverName, memberCount }) {
  const width = 1000;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw a beautiful dark space gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#100a24'); // Deep purple
  bgGrad.addColorStop(0.5, '#070b19'); // Deep space blue
  bgGrad.addColorStop(1, '#1b081a'); // Dark violet
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Add abstract colorful nebula glows
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(80px)';

  // Magenta glow top left
  ctx.fillStyle = 'rgba(255, 0, 128, 0.15)';
  ctx.beginPath();
  ctx.arc(200, 100, 200, 0, Math.PI * 2);
  ctx.fill();

  // Cyan glow bottom right
  ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.beginPath();
  ctx.arc(800, 350, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Draw glassmorphic main card panel
  const margin = 30;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const radius = 24;

  ctx.save();
  // Border gradient
  const borderGrad = ctx.createLinearGradient(margin, margin, cardW, cardH);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;

  // Background fill
  const cardGrad = ctx.createLinearGradient(margin, margin, cardW, cardH);
  cardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  cardGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
  ctx.fillStyle = cardGrad;

  // Draw rounded card path
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, radius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Fetch and draw Avatar
  let avatarImg;
  try {
    const avatarBuf = await fetchImageBuffer(avatarUrl);
    avatarImg = await loadImage(avatarBuf);
  } catch (error) {
    logger.warn('Failed to load avatar, using placeholder', error);
  }

  const avatarSize = 140;
  const avatarX = 100;
  const avatarY = height / 2 - avatarSize / 2;

  ctx.save();
  // Shadow for avatar
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;

  // Outer glow border for avatar
  const avatarBorderGrad = ctx.createLinearGradient(
    avatarX - 5,
    avatarY - 5,
    avatarX + avatarSize + 5,
    avatarY + avatarSize + 5
  );
  avatarBorderGrad.addColorStop(0, '#00f2fe');
  avatarBorderGrad.addColorStop(1, '#4facfe');
  ctx.fillStyle = avatarBorderGrad;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
  ctx.fill();

  // Clip path for circular avatar
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2);
  ctx.clip();

  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = '#4facfe';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  // 5. Draw Welcome and Info Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textX = avatarX + avatarSize + 40;

  // Welcome sub-title
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('WELCOME TO THE COMMUNITY', textX, height / 2 - 60);

  // Username
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  const nameString =
    discriminator && discriminator !== '0' && discriminator !== '0000'
      ? `${username}#${discriminator}`
      : username;
  ctx.fillText(nameString, textX, height / 2 - 10);

  // Welcoming message & Server name
  ctx.font = '20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`Have a great time here in ${serverName}!`, textX, height / 2 + 35);

  // Member count tag
  if (memberCount) {
    const badgeX = textX;
    const badgeY = height / 2 + 75;
    const badgeText = `Member #${memberCount}`;

    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + 24;
    const badgeH = 28;

    // Draw badge background
    ctx.save();
    ctx.fillStyle = 'rgba(79, 172, 254, 0.2)';
    ctx.strokeStyle = 'rgba(79, 172, 254, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    // Draw badge text
    ctx.fillStyle = '#00f2fe';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  createWelcomeCard,
};
