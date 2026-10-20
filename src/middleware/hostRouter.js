const path = require('path');
const express = require('express');

/**
 * Creates conditional host routing middleware.
 * Distinguishes between dashboard host (arcc.webdevkin.com) and API hosts.
 *
 * @param {object} options
 * @param {import('express').Router} options.apiRouter - The aggregated API router
 */
function createHostRouter({ apiRouter }) {
  const distPath = path.resolve(__dirname, '../../dashboard/dist');
  const indexHtml = path.join(distPath, 'index.html');
  const staticMiddleware = express.static(distPath);

  return (req, res, _next) => {
    const hostname = req.hostname;

    if (hostname === 'arcc.webdevkin.com') {
      // If request is targeted at the API or dev endpoints, pass directly to apiRouter
      if (req.path.startsWith('/api') || req.path.startsWith('/dev')) {
        return apiRouter(req, res, () => {
          res.status(404).json({ error: 'Not Found' });
        });
      }

      // Dashboard host: serve static files and SPA fallback
      return staticMiddleware(req, res, () => {
        if (req.method === 'GET') {
          return res.sendFile(indexHtml);
        }
        res.status(404).json({ error: 'Not Found' });
      });
    } else {
      // API host, localhost, or any other host: serve API router only
      return apiRouter(req, res, () => {
        res.status(404).json({ error: 'Not Found' });
      });
    }
  };
}

module.exports = {
  createHostRouter,
};
