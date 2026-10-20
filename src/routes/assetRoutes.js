const express = require('express');
const path = require('path');
const logger = require('../utils/logger.js');
const { getHeadBuffer } = require('../services/headManager.js');

const router = express.Router();

// 1. Local player heads cache serving and downloader proxy
router.get('/heads/:username.png', async (req, res) => {
  // Explicit cross-origin headers to bypass helmet CORP restrictions
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const username = req.params.username;

  try {
    const buffer = await getHeadBuffer(username);
    if (buffer) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
      return res.send(buffer);
    }
  } catch (err) {
    logger.error(`Error serving head for ${username}: ${err.message}`);
  }

  res.status(404).send('Not Found');
});

// 2. Static serving for downloaded shop item icons
router.use('/icons', express.static(path.join(process.cwd(), 'src', 'icons')));

module.exports = router;
