const express = require('express');
const os = require('os');
const { telemetry } = require('../utils/telemetry.js');
const { logBuffer } = require('../utils/logBuffer.js');
const redis = require('../utils/redis.js');
const logger = require('../utils/logger.js');
const { isDevRequest } = require('../utils/maintenanceHelper.js');

const router = express.Router();

/**
 * Developer Authentication Middleware
 * Protects dev panel endpoints.
 * Checks for dev secret or developer ID match.
 */
function devAuth(req, res, next) {
  if (isDevRequest(req)) {
    return next();
  }

  telemetry.recordUnauthorizedAccess({
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    path: req.originalUrl || req.path,
    method: req.method,
  });

  return res.status(401).json({
    error: 'Unauthorized',
    message:
      'Valid developer token (x-dev-token header or ?key=) required to access developer telemetry.',
  });
}

/**
 * POST /api/dev/web-telemetry
 * Ingests telemetry, pageviews, and client errors from the web frontend
 * (Public ingestion endpoint so frontend client visitors can report telemetry)
 */
router.post('/web-telemetry', (req, res) => {
  try {
    const { type, path, referrer, durationMs, error, device, sessionId } = req.body || {};

    telemetry.recordWebEvent({
      type: type || 'pageview',
      path: path || '/',
      referrer: referrer || req.headers.referer || '',
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      durationMs: Number(durationMs) || 0,
      error,
      device,
      sessionId,
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to record web telemetry' });
  }
});

// Apply devAuth to all administrative dev routes below
router.use(devAuth);

/**
 * GET /api/dev/telemetry
 * Full system, bot, command, services, HTTP, and DB telemetry snapshot
 */
router.get('/telemetry', async (req, res) => {
  try {
    const snapshot = await telemetry.getSnapshot();
    res.json(snapshot);
  } catch (err) {
    logger.error(`Error generating dev telemetry snapshot: ${err.message}`);
    res.status(500).json({ error: 'Failed to generate telemetry snapshot', message: err.message });
  }
});

/**
 * GET /api/dev/logs
 * Query structured logs with level, limit, search, and pagination
 */
router.get('/logs', (req, res) => {
  try {
    const { level, limit, offset, search, since, before, order } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit || '100', 10), 1), 500);
    const parsedOffset = Math.max(parseInt(offset || '0', 10), 0);

    const result = logBuffer.getLogs({
      level,
      search,
      limit: parsedLimit,
      offset: parsedOffset,
      since,
      before,
      order: order === 'asc' ? 'asc' : 'desc',
    });

    const stats = logBuffer.getStats();

    res.json({
      ...result,
      stats,
    });
  } catch (err) {
    logger.error(`Error querying dev logs: ${err.message}`);
    res.status(500).json({ error: 'Failed to query logs', message: err.message });
  }
});

/**
 * POST /api/dev/logs/clear
 * Purge in-memory and Redis log buffers
 */
router.post('/logs/clear', async (req, res) => {
  try {
    await logBuffer.clear();
    logger.system('Developer panel cleared application log buffers.');
    res.json({ success: true, message: 'Log buffers cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs', message: err.message });
  }
});

/**
 * GET /api/dev/commands/recent
 * Quick access to recent command executions with latencies
 */
router.get('/commands/recent', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
  res.json({
    total: telemetry.commandStats.total,
    recent: telemetry.commandStats.recent.slice(0, limit),
  });
});

/**
 * GET /api/dev/services
 * Live status of background sync workers
 */
router.get('/services', (req, res) => {
  res.json(telemetry.services);
});

/**
 * GET /api/dev/database
 * Live database connection status and table row counts/sizes
 */
router.get('/database', async (req, res) => {
  try {
    const [health, tables] = await Promise.all([
      telemetry.checkDatabaseHealth(),
      telemetry.getDatabaseTableCounts(),
    ]);
    res.json({ health, tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dev/redis
 * Detailed Redis telemetry: ops/sec, memory RSS/peak, fragmentation, and keyspace hits
 */
router.get('/redis', async (req, res) => {
  try {
    const stats = await telemetry.checkRedisHealth();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dev/external-api
 * External ArcadiaMC API latency, calls count, endpoint breakdowns, and errors
 */
router.get('/external-api', (req, res) => {
  res.json(telemetry.externalApiStats);
});

/**
 * GET /api/dev/discord
 * Discord Gateway connection, WS ping, interactions, button clicks, and cooldown blocks
 */
router.get('/discord', (req, res) => {
  res.json({
    status: telemetry.discordClient?.isReady() ? 'ready' : 'connecting',
    guildsCount: telemetry.discordClient?.guilds?.cache?.size || 0,
    cachedUsersCount: telemetry.discordClient?.users?.cache?.size || 0,
    wsPingMs: telemetry.discordClient?.ws?.ping || 0,
    stats: telemetry.discordStats,
  });
});

/**
 * GET /api/dev/system
 * Detailed system metrics, V8 heap spaces, event loop utilization, and asset caches
 */
router.get('/system', (req, res) => {
  res.json({
    cpuPercent: telemetry.currentCpuPercent,
    eventLoopLagMs: telemetry.eventLoopLagMs,
    eventLoopUtilizationPercent: telemetry.eventLoopUtilizationPercent,
    memory: process.memoryUsage(),
    os: {
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      loadAvg: os.loadavg(),
      cpus: os.cpus().length,
      platform: os.platform(),
      uptime: process.uptime(),
    },
    assetCache: telemetry.getAssetCacheStats(),
    v8Stats: telemetry.getV8InternalStats(),
  });
});

/**
 * GET /api/dev/web
 * Web frontend metrics, devices, browsers, Web Vitals, and active sessions
 */
router.get('/web', (req, res) => {
  res.json({
    pageViewsTotal: telemetry.webStats.pageViewsTotal,
    clientErrorsTotal: telemetry.webStats.clientErrorsTotal,
    activeVisitors: telemetry.getActiveWebVisitorsCount(),
    devices: telemetry.webStats.devices,
    browsers: telemetry.webStats.browsers,
    operatingSystems: telemetry.webStats.operatingSystems,
    webVitals: telemetry.webStats.webVitals,
    rateLimitsTriggered: telemetry.webStats.rateLimitsTriggered,
    topRoutes: Object.entries(telemetry.webStats.pageViewsByRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([route, count]) => ({ route, count })),
    recentErrors: telemetry.webStats.recentErrors,
    recentEvents: telemetry.webStats.recentEvents,
  });
});

/**
 * GET /api/dev/http
 * Detailed Express HTTP metrics, bandwidth in/out, route breakdown, and status codes
 */
router.get('/http', (req, res) => {
  res.json({
    totalRequests: telemetry.httpStats.totalRequests,
    rpm: telemetry.getRollingRpm(),
    avgDurationMs: telemetry.httpStats.avgDurationMs,
    bandwidth: {
      bytesReceivedTotal: telemetry.httpStats.bytesReceivedTotal,
      bytesSentTotal: telemetry.httpStats.bytesSentTotal,
      bytesReceivedKb: parseFloat((telemetry.httpStats.bytesReceivedTotal / 1024).toFixed(1)),
      bytesSentKb: parseFloat((telemetry.httpStats.bytesSentTotal / 1024).toFixed(1)),
    },
    statusCodes: telemetry.httpStats.statusCodes,
    cacheHits: telemetry.httpStats.cacheHits,
    cacheMisses: telemetry.httpStats.cacheMisses,
    requestsByRoute: telemetry.httpStats.requestsByRoute,
    slowRequests: telemetry.httpStats.slowRequests,
    recentRequests: telemetry.httpStats.recentRequests.slice(0, 30),
  });
});

/**
 * GET /api/dev/websocket
 * WebSocket connected clients count, messages sent/received, and subscribers
 */
router.get('/websocket', (req, res) => {
  res.json(telemetry.wsStats);
});

/**
 * GET /api/dev/apm
 * Deep Node.js runtime diagnostics (GC pauses, active handles, active requests, ELU %)
 */
router.get('/apm', (req, res) => {
  res.json({
    ...telemetry.getNodeRuntimeStats(),
    cpuPercent: telemetry.currentCpuPercent,
    eventLoopLagMs: telemetry.eventLoopLagMs,
    eventLoopUtilizationPercent: telemetry.eventLoopUtilizationPercent,
    memory: process.memoryUsage(),
    v8Stats: telemetry.getV8InternalStats(),
  });
});

/**
 * GET /api/dev/vitals
 * Core Web Vitals aggregates with P75, averages, and ratings
 */
router.get('/vitals', (req, res) => {
  res.json({
    summary: telemetry.getWebVitalsSummary(),
    raw: telemetry.webStats.webVitals,
  });
});

/**
 * GET /api/dev/security
 * Tracked rate limit blocks and unauthorized panel access attempts
 */
router.get('/security', (req, res) => {
  res.json({
    rateLimitsTriggered: telemetry.webStats.rateLimitsTriggered,
    blacklistBlocksTotal: telemetry.discordStats.blacklistBlocksTotal,
    cooldownBlocksTotal: telemetry.discordStats.cooldownBlocksTotal,
    discordRateLimitsTotal: telemetry.discordStats.rateLimitsTotal,
    discordRateLimitsByRoute: telemetry.discordStats.rateLimitsByRoute,
    unauthorizedAttemptsTotal: telemetry.securityStats.unauthorizedAttemptsTotal,
    recentUnauthorized: telemetry.securityStats.recentUnauthorized,
  });
});

/**
 * POST /api/dev/cache/clear
 * Purge Redis API caches
 */
router.post('/cache/clear', async (req, res) => {
  if (!redis || redis.status !== 'ready') {
    return res.status(503).json({ error: 'Redis is not connected.' });
  }

  try {
    const keys = await redis.keys('api_cache:*');
    const townyKey = 'cache:towny';
    const shopsKey = 'cache:shops';

    const keysToDelete = [...keys, townyKey, shopsKey];
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    logger.system(`Developer cleared ${keysToDelete.length} API cache keys from Redis.`);
    res.json({
      success: true,
      clearedKeysCount: keysToDelete.length,
      message: `Cleared ${keysToDelete.length} cache keys.`,
    });
  } catch (err) {
    logger.error(`Error clearing cache keys: ${err.message}`);
    res.status(500).json({ error: 'Failed to clear cache keys', message: err.message });
  }
});

module.exports = router;
