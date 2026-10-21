const { WebSocketServer } = require('ws');
const logger = require('../utils/logger.js');
const { telemetry } = require('../utils/telemetry.js');
const redisClient = require('../utils/redis.js');
const eventEmitter = require('../utils/emitter.js');
const {
  isMaintenanceActive,
  getMaintenanceReason,
  isDevRequest,
} = require('../utils/maintenanceHelper.js');

/**
 * Initializes the WebSocket server attached to the HTTP server instance.
 * Handles client subscriptions, live telemetry streaming, and currency update broadcasting.
 *
 * @param {import('http').Server} server - Active HTTP server instance
 * @returns {{ wss: WebSocketServer, clients: Set<WebSocket> }}
 */
function initWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  const clients = new Set();
  let lastRejectLog = 0;

  wss.on('connection', (ws, req) => {
    const isDev = isDevRequest(req);
    ws.isDev = isDev;

    if (isMaintenanceActive() && !isDev) {
      const now = Date.now();
      if (now - lastRejectLog > 10000) {
        lastRejectLog = now;
        logger.info('WebSocket client rejected: Maintenance mode active.');
      }
      try {
        ws.send(
          JSON.stringify({
            type: 'error',
            code: 403,
            error: 'Maintenance Mode',
            message:
              'Website and Bot are currently undergoing maintenance. Only developers have access.',
            reason: getMaintenanceReason(),
          })
        );
        ws.close(4003, 'Maintenance Mode');
      } catch {
        // Ignore
      }
      return;
    }

    logger.info('WebSocket client connected.');
    clients.add(ws);
    telemetry.recordWsConnection();

    // Send initial status message
    ws.send(JSON.stringify({ type: 'status', data: 'connected' }));
    telemetry.recordWsMessage('sent');

    ws.on('message', async (raw) => {
      telemetry.recordWsMessage('received');
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe:telemetry') {
          ws.isTelemetrySubscribed = true;
          const snapshot = await telemetry.getSnapshot();
          ws.send(JSON.stringify({ type: 'telemetry:snapshot', data: snapshot }));
          telemetry.recordWsMessage('sent');
        } else if (msg.type === 'request:telemetry') {
          const snapshot = await telemetry.getSnapshot();
          ws.send(JSON.stringify({ type: 'telemetry:snapshot', data: snapshot }));
          telemetry.recordWsMessage('sent');
        }
      } catch {
        // Ignore invalid WS payloads
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected.');
      clients.delete(ws);
      telemetry.recordWsDisconnection();
    });

    ws.on('error', (err) => {
      logger.warn(`WebSocket error: ${err.message}`);
      clients.delete(ws);
      telemetry.recordWsDisconnection();
    });
  });

  // Background telemetry broadcaster for web dev panel (every 5 seconds)
  const telemetryBroadcastInterval = setInterval(async () => {
    const subscribedClients = Array.from(clients).filter(
      (c) => c.readyState === 1 && c.isTelemetrySubscribed
    );
    telemetry.setWsSubscribedCount(subscribedClients.length);
    if (subscribedClients.length === 0) return;

    try {
      const snapshot = await telemetry.getSnapshot();
      const payload = JSON.stringify({ type: 'telemetry:update', data: snapshot });
      for (const client of subscribedClients) {
        client.send(payload);
        telemetry.recordWsMessage('sent');
      }
    } catch {
      // Ignore broadcast errors
    }
  }, 5000);
  if (telemetryBroadcastInterval.unref) telemetryBroadcastInterval.unref();

  // Listen to currency sync updates and broadcast to connected WS clients
  eventEmitter.on('currencies:updated', async (updatedCurrencies) => {
    if (clients.size === 0) return;

    logger.info(
      `Broadcasting real-time currency updates to ${clients.size} client(s) via WebSockets.`
    );

    // Fetch previous rates from Redis to enrich the payload
    let previousRates = {};
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cached = await redisClient.get('currencies:previous_rates');
        if (cached) previousRates = JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    const payload = updatedCurrencies.map((c) => ({
      ...c,
      previousRate: previousRates[c.id] !== undefined ? String(previousRates[c.id]) : '0.0000',
    }));

    const msg = JSON.stringify({ type: 'update', data: payload });
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  });

  // Listen to maintenance mode toggle events to disconnect non-developer clients
  eventEmitter.on('maintenance:changed', (state) => {
    if (state.enabled) {
      for (const client of clients) {
        if (!client.isDev) {
          try {
            client.send(
              JSON.stringify({
                type: 'error',
                code: 403,
                error: 'Maintenance Mode',
                message: 'System entered maintenance mode. Only developers have access.',
                reason: state.reason,
              })
            );
            client.close(4003, 'Maintenance Mode');
          } catch {
            // Ignore
          }
        }
      }
    }
  });

  return { wss, clients };
}

module.exports = {
  initWebSocketServer,
};
