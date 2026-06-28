const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const logger = require('./logger.js');
const pc = require('picocolors');

const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');
const MC_VERSION = process.env.MC_VERSION || '1.21.1';

// Upscale output size — nearest-neighbor keeps pixel art crisp at any multiple of 16
const UPSCALE_SIZE = 128;

/**
 * Some Minecraft items use a different texture file name than their item ID.
 * Map the item name (uppercase) to the correct texture base name (lowercase).
 */
const TEXTURE_ALIASES = {
  // Enchanted golden apple shares the same texture as regular golden apple
  ENCHANTED_GOLDEN_APPLE: 'golden_apple',
  // Tall flowers only have a _top texture on mcasset.cloud
  PEONY: 'peony_top',
  ROSE_BUSH: 'rose_bush_top',
  LILAC: 'lilac_top',
  SUNFLOWER: 'sunflower_front',
  // Potted plants
  PITCHER_PLANT: 'pitcher_crop_top',
};

/**
 * Upscale a raw PNG buffer using true nearest-neighbor interpolation (pixel-by-pixel).
 * Uses getImageData/putImageData instead of drawImage to guarantee crisp pixel art — no blurring.
 * @param {Buffer} rawBuffer - Raw 16x16 PNG data
 * @returns {Promise<Buffer>} - Upscaled PNG buffer at UPSCALE_SIZE×UPSCALE_SIZE
 */
async function upscaleIcon(rawBuffer) {
  const src = await loadImage(rawBuffer);
  const srcW = src.width;
  const srcH = src.height;

  // Draw source into a temp canvas to read its raw pixel data
  const srcCanvas = createCanvas(srcW, srcH);
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(src, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);

  // Output canvas
  const outCanvas = createCanvas(UPSCALE_SIZE, UPSCALE_SIZE);
  const outCtx = outCanvas.getContext('2d');
  const outData = outCtx.createImageData(UPSCALE_SIZE, UPSCALE_SIZE);

  const scaleX = UPSCALE_SIZE / srcW;
  const scaleY = UPSCALE_SIZE / srcH;

  // For each output pixel, find the nearest source pixel (floor → no interpolation)
  for (let y = 0; y < UPSCALE_SIZE; y++) {
    for (let x = 0; x < UPSCALE_SIZE; x++) {
      const srcX = Math.floor(x / scaleX);
      const srcY = Math.floor(y / scaleY);

      const srcIdx = (srcY * srcW + srcX) * 4;
      const outIdx = (y * UPSCALE_SIZE + x) * 4;

      outData.data[outIdx] = srcData.data[srcIdx]; // R
      outData.data[outIdx + 1] = srcData.data[srcIdx + 1]; // G
      outData.data[outIdx + 2] = srcData.data[srcIdx + 2]; // B
      outData.data[outIdx + 3] = srcData.data[srcIdx + 3]; // A
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas.toBuffer('image/png');
}

/**
 * Resize a raw image buffer to UPSCALE_SIZE×UPSCALE_SIZE using smooth scaling
 * @param {Buffer} rawBuffer - Raw high-res image data
 * @returns {Promise<Buffer>} - Resized PNG buffer
 */
async function resizeImage(rawBuffer) {
  const src = await loadImage(rawBuffer);
  const canvas = createCanvas(UPSCALE_SIZE, UPSCALE_SIZE);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, UPSCALE_SIZE, UPSCALE_SIZE);

  return canvas.toBuffer('image/png');
}

/**
 * Downloads a single item/block icon:
 * 1. Tries to retrieve a high-quality 3D inventory render from api.minecraftitems.xyz
 * 2. Falls back to flat textures from mcasset.cloud with nearest-neighbor upscaling if unavailable.
 * @param {string} itemName - The uppercase Minecraft item name (e.g. "BIRCH_LOG")
 */
async function downloadItemIcon(itemName) {
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const outputFilePath = path.join(ICONS_DIR, `${itemName}.png`);
  const lowercaseName = itemName.toLowerCase();

  // 1. Try 3D Render API first (provides beautiful inventory renders)
  const apiURL = `https://api.minecraftitems.xyz/api/item/${lowercaseName}/size=4`;
  try {
    logger.debug(`Attempting to download 3D render from: ${apiURL}`);
    const response = await axios.get(apiURL, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('image/png')) {
      const resizedBuffer = await resizeImage(Buffer.from(response.data));
      fs.writeFileSync(outputFilePath, resizedBuffer);
      logger.success(
        `Downloaded 3D render for ${pc.bold(pc.green(itemName))} -> src/icons/${itemName}.png`
      );
      return true;
    }
  } catch (error) {
    logger.debug(
      `3D Render API not available for ${itemName}: ${error.message}. Falling back to mcasset.cloud.`
    );
  }

  // 2. Fallback: MCAsset Cloud flat texture
  const resolvedName = TEXTURE_ALIASES[itemName] || lowercaseName;

  // Generate name variants (e.g. peony_top for tall plants)
  const nameVariants = [
    resolvedName,
    `${resolvedName}_top`,
    `${resolvedName}_front`,
    `${resolvedName}_side`,
    `${resolvedName}_bottom`,
    `${resolvedName}_empty`,
  ];

  const urls = [];
  for (const variant of nameVariants) {
    urls.push(
      `https://assets.mcasset.cloud/${MC_VERSION}/assets/minecraft/textures/item/${variant}.png`
    );
    urls.push(
      `https://assets.mcasset.cloud/${MC_VERSION}/assets/minecraft/textures/block/${variant}.png`
    );
  }

  for (const url of urls) {
    try {
      logger.debug(`Attempting to download flat texture from: ${url}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      // Verify the content type is indeed an image to avoid saving Nuxt fallback HTML
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('image/png')) {
        logger.debug(`URL returned non-image content (${contentType}). Trying next fallback...`);
        continue;
      }

      // Upscale to UPSCALE_SIZE×UPSCALE_SIZE using nearest-neighbor before saving
      const rawBuffer = Buffer.from(response.data);
      const upscaledBuffer = await upscaleIcon(rawBuffer);
      fs.writeFileSync(outputFilePath, upscaledBuffer);

      logger.success(
        `Downloaded & upscaled flat icon for ${pc.bold(pc.green(itemName))} -> src/icons/${itemName}.png (${UPSCALE_SIZE}px)`
      );
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.debug(`Icon not found at URL: ${url} (HTTP 404)`);
      } else {
        logger.warn(`Failed to connect to ${url}: ${error.message}`);
      }
    }
  }

  logger.warn(
    `Could not find or download icon for ${pc.bold(pc.red(itemName))} using either 3D API or flat texture fallbacks.`
  );
  return false;
}

/**
 * Queue downloads of missing icons from a trades list with a 5-second delay between requests
 * @param {Array<string>} itemNames - List of item names to scan
 */
function downloadMissingIcons(itemNames) {
  const missingItems = itemNames.filter((itemName) => {
    const iconPath = path.join(ICONS_DIR, `${itemName}.png`);
    return !fs.existsSync(iconPath);
  });

  if (missingItems.length === 0) {
    return;
  }

  logger.info(
    `Found ${pc.bold(pc.yellow(missingItems.length))} missing item icons. Queueing downloads with a 5s delay...`
  );

  missingItems.forEach((itemName, index) => {
    const delay = index * 5000;
    setTimeout(async () => {
      try {
        await downloadItemIcon(itemName);
      } catch (err) {
        logger.error(`Error in scheduled icon downloader for ${itemName}:`, err);
      }
    }, delay);
  });
}

module.exports = {
  downloadItemIcon,
  downloadMissingIcons,
};
