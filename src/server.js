const { app } = require('./app.js');
const { config } = require('./config.js');
const logger = require('./utils/logger.js');
const pc = require('picocolors');
const { initWebSocketServer } = require('./ws/websocketServer.js');
const { loadMaintenanceState } = require('./utils/maintenanceHelper.js');

/**
 * Starts HTTP listener, binds keep-alive timeouts, and initializes WebSocket streaming.
 * @returns {import('http').Server}
 */
function startServer() {
  // Ensure maintenance state cache is loaded
  loadMaintenanceState().catch((err) => {
    logger.warn(`Maintenance state load warning on server startup: ${err.message}`);
  });

  const server = app.listen(config.web.port, () => {
    logger.info(
      `Dashboard API running at ${pc.bold(pc.cyan(`http://localhost:${config.web.port}`))}`
    );
  });

  // Handle connection timeouts to prevent Slowloris DoS
  server.keepAliveTimeout = 10 * 1000; // 10 seconds timeout
  server.headersTimeout = 12 * 1000;

  // Initialize WebSocket server on the same HTTP server port
  initWebSocketServer(server);

  return server;
}

module.exports = {
  app,
  startServer,
};

if (require.main === module) {
  startServer();
}
