const fs = require('fs');
const path = require('path');
const axios = require('axios');
const redisClient = require('../utils/redis.js');
const logger = require('../utils/logger.js');

const headsDir = path.join(process.cwd(), 'src', 'heads');

if (!fs.existsSync(headsDir)) {
  fs.mkdirSync(headsDir, { recursive: true });
}

// Function to download a player head
async function downloadHead(username) {
  const lowerName = username.toLowerCase();
  const filePath = path.join(headsDir, `${lowerName}.png`);
  try {
    const response = await axios.get(`https://minotar.net/avatar/${lowerName}/48.png`, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    fs.writeFileSync(filePath, response.data);
    return true;
  } catch (error) {
    logger.error(`Failed to download head for ${username}: ${error.message}`);
    return false;
  }
}

// Function to update all heads in batch
async function updateAllHeadsBatch(usernames) {
  logger.system(`Starting player heads weekly batch update for ${usernames.length} players...`);
  let updatedCount = 0;
  for (const username of usernames) {
    const lowerName = username.toLowerCase();
    const filePath = path.join(headsDir, `${lowerName}.png`);
    try {
      const response = await axios.get(`https://minotar.net/avatar/${lowerName}/48.png`, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const newBuffer = response.data;
      if (fs.existsSync(filePath)) {
        const oldBuffer = fs.readFileSync(filePath);
        if (Buffer.compare(oldBuffer, newBuffer) !== 0) {
          fs.writeFileSync(filePath, newBuffer);
          updatedCount++;
          logger.debug(`Updated head cache for player: ${username}`);
        }
      } else {
        fs.writeFileSync(filePath, newBuffer);
        updatedCount++;
      }
    } catch {
      // ignore individual failures to keep loop going
    }
    // spacing delay of 100ms to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 100));
  }
  logger.success(`Batch player heads update completed. Updated ${updatedCount} heads.`);
}

// Check schedule to run every 7 days
async function checkScheduleAndRunBatch(townyData) {
  if (!townyData) return;
  const redis = redisClient;
  if (!redis || redis.status !== 'ready') return;

  const lastRunKey = 'cache:heads:last_update';
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  try {
    const lastRun = await redis.get(lastRunKey);
    if (!lastRun || now - parseInt(lastRun, 10) >= sevenDaysMs) {
      // Gather all unique usernames from townyData
      const usernames = new Set();
      if (townyData.towns) {
        townyData.towns.forEach((t) => {
          if (t.mayor && t.mayor.name) usernames.add(t.mayor.name);
        });
      }
      if (townyData.nations) {
        townyData.nations.forEach((n) => {
          if (n.king && n.king.name) usernames.add(n.king.name);
        });
      }

      // Run batch update in the background
      updateAllHeadsBatch(Array.from(usernames))
        .then(() => {
          redis.set(lastRunKey, now.toString());
        })
        .catch((err) => {
          logger.error(`Weekly player head batch update failed: ${err.message}`);
        });
    }
  } catch (err) {
    logger.warn(`Failed to check heads schedule: ${err.message}`);
  }
}

module.exports = {
  headsDir,
  downloadHead,
  checkScheduleAndRunBatch,
  updateAllHeadsBatch,
};
