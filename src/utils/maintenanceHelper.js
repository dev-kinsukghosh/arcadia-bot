const logger = require('./logger.js');
const pc = require('picocolors');
const eventEmitter = require('./emitter.js');

// In-memory maintenance state
const maintenanceState = {
  enabled: false,
  reason: '',
  updatedAt: null,
  updatedBy: null,
};

const REDIS_KEY = 'system:maintenance';

/**
 * Escapes unsafe HTML characters to prevent XSS in rendered maintenance page
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Checks whether maintenance mode is currently active
 * @returns {boolean}
 */
function isMaintenanceActive() {
  return maintenanceState.enabled;
}

/**
 * Gets the current maintenance reason
 * @returns {string}
 */
function getMaintenanceReason() {
  return maintenanceState.reason || '';
}

/**
 * Gets a snapshot of the full maintenance state
 * @returns {{ enabled: boolean, reason: string, updatedAt: string|null, updatedBy: string|null }}
 */
function getMaintenanceDetails() {
  return { ...maintenanceState };
}

/**
 * Checks if a Discord user ID belongs to a bot developer
 * @param {string} userId
 * @returns {boolean}
 */
function isDevUser(userId) {
  if (!userId) return false;
  const devIds = (process.env.DEV_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return devIds.includes(String(userId).trim());
}

/**
 * Extracts a developer authorization token from incoming HTTP request headers, query, or cookies
 * @param {import('express').Request} req
 * @returns {string}
 */
function extractDevToken(req) {
  if (!req) return '';

  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.headers?.['x-dev-token']) {
    return String(req.headers['x-dev-token']).trim();
  }

  if (req.query?.key) {
    return String(req.query.key).trim();
  }

  if (req.query?.dev_token) {
    return String(req.query.dev_token).trim();
  }

  if (req.query?.token) {
    return String(req.query.token).trim();
  }

  // Parse URL search params if req.query is not populated (e.g. native WebSocket req.url)
  if (req.url && req.url.includes('?')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const param =
        urlObj.searchParams.get('key') ||
        urlObj.searchParams.get('dev_token') ||
        urlObj.searchParams.get('token');
      if (param) return param.trim();
    } catch {
      // Ignore
    }
  }

  // Check cookies (e.g. dev_token=...)
  if (req.headers?.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:dev_token|x-dev-token)=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return '';
}

/**
 * Checks if an incoming HTTP request is authorized as a developer
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isDevRequest(req) {
  if (!req) return false;

  const devSecret = process.env.DEV_SECRET || '';
  const devIds = (process.env.DEV_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const token = extractDevToken(req);

  // Match against configured DEV_SECRET
  if (devSecret && token && token === devSecret) {
    return true;
  }

  // Match against configured DEV_ID
  if (token && devIds.includes(token)) {
    return true;
  }

  return false;
}

/**
 * Sets maintenance mode state, updates memory cache, and persists to Redis and Database
 * @param {boolean} enabled
 * @param {string} [reason='']
 * @param {string} [author='Developer']
 * @returns {Promise<{ enabled: boolean, reason: string, updatedAt: string, updatedBy: string }>}
 */
async function setMaintenance(enabled, reason = '', author = 'Developer') {
  maintenanceState.enabled = Boolean(enabled);
  maintenanceState.reason = reason ? String(reason).trim() : '';
  maintenanceState.updatedAt = new Date().toISOString();
  maintenanceState.updatedBy = author || 'Developer';

  logger.warn(
    `[MAINTENANCE] Mode has been ${maintenanceState.enabled ? pc.bold(pc.red('ACTIVATED')) : pc.bold(pc.green('DEACTIVATED'))} by ${pc.cyan(maintenanceState.updatedBy)}${maintenanceState.reason ? ` (Reason: "${maintenanceState.reason}")` : ''}`
  );

  // Broadcast state change across application events
  eventEmitter.emit('maintenance:changed', { ...maintenanceState });

  // 1. Persist to Redis if available
  try {
    const redis = require('./redis.js');
    if (redis && redis.status === 'ready') {
      await redis.set(REDIS_KEY, JSON.stringify(maintenanceState));
    }
  } catch (err) {
    logger.warn(`Failed to persist maintenance state to Redis: ${err.message}`);
  }

  // 2. Persist to MySQL database (weby_custom table)
  try {
    const { db } = require('./db.js');
    const { webyCustom } = require('../db/schema.js');
    const { eq } = require('drizzle-orm');

    if (db) {
      const recordsToPersist = [
        { id: 'devconfig:maintenance:enabled', value: String(maintenanceState.enabled) },
        { id: 'devconfig:maintenance:reason', value: maintenanceState.reason },
        { id: 'devconfig:maintenance:updated_at', value: maintenanceState.updatedAt },
        { id: 'devconfig:maintenance:updated_by', value: maintenanceState.updatedBy },
      ];

      for (const item of recordsToPersist) {
        const existing = await db.select().from(webyCustom).where(eq(webyCustom.id, item.id));

        if (existing.length === 0) {
          await db.insert(webyCustom).values(item);
        } else {
          await db.update(webyCustom).set({ value: item.value }).where(eq(webyCustom.id, item.id));
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to persist maintenance state to DB: ${err.message}`);
  }

  return { ...maintenanceState };
}

/**
 * Loads maintenance state from Redis or MySQL database during application initialization
 * @returns {Promise<boolean>}
 */
async function loadMaintenanceState() {
  // 1. Try loading from Redis first
  try {
    const redis = require('./redis.js');
    if (redis && redis.status === 'ready') {
      const data = await redis.get(REDIS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        maintenanceState.enabled = Boolean(parsed.enabled);
        maintenanceState.reason = parsed.reason || '';
        maintenanceState.updatedAt = parsed.updatedAt || null;
        maintenanceState.updatedBy = parsed.updatedBy || null;
        logger.info(
          `Maintenance state loaded from Redis: ${maintenanceState.enabled ? pc.red('ACTIVE') : pc.green('INACTIVE')}`
        );
        return true;
      }
    }
  } catch {
    // Fall back to database
  }

  // 2. Fallback to MySQL database (weby_custom table)
  try {
    const { db } = require('./db.js');
    const { webyCustom } = require('../db/schema.js');
    const { inArray } = require('drizzle-orm');

    if (db) {
      const records = await db
        .select()
        .from(webyCustom)
        .where(
          inArray(webyCustom.id, [
            'devconfig:maintenance:enabled',
            'devconfig:maintenance:reason',
            'devconfig:maintenance:updated_at',
            'devconfig:maintenance:updated_by',
          ])
        );

      const map = new Map(records.map((r) => [r.id, r.value]));
      if (map.has('devconfig:maintenance:enabled')) {
        maintenanceState.enabled = map.get('devconfig:maintenance:enabled') === 'true';
        maintenanceState.reason = map.get('devconfig:maintenance:reason') || '';
        maintenanceState.updatedAt = map.get('devconfig:maintenance:updated_at') || null;
        maintenanceState.updatedBy = map.get('devconfig:maintenance:updated_by') || null;
        logger.info(
          `Maintenance state loaded from DB: ${maintenanceState.enabled ? pc.red('ACTIVE') : pc.green('INACTIVE')}`
        );

        // Warm Redis cache
        try {
          const redis = require('./redis.js');
          if (redis && redis.status === 'ready') {
            await redis.set(REDIS_KEY, JSON.stringify(maintenanceState));
          }
        } catch {
          // Ignore
        }
        return true;
      }
    }
  } catch (err) {
    logger.warn(`Failed to load maintenance state from database: ${err.message}`);
  }

  return false;
}

/**
 * Generates simple, clean HTML page for Maintenance mode
 * @param {string|{ active?: boolean, reason?: string, isDev?: boolean }} options
 * @returns {string}
 */
function generateMaintenanceHtml(options = {}) {
  let active = true;
  let reason = '';
  let isDev = false;

  if (typeof options === 'string') {
    reason = options;
    active = true;
  } else if (typeof options === 'object' && options !== null) {
    active = options.active !== undefined ? options.active : isMaintenanceActive();
    reason = options.reason !== undefined ? options.reason : getMaintenanceReason();
    isDev = Boolean(options.isDev);
  }

  const escapedReason = escapeHtml(reason);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${active ? 'Maintenance Active' : 'System Operational'} · ArcadiaMC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #07080c;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
      overflow: hidden;
      position: relative;
    }
    .container {
      max-width: 32rem;
      width: 100%;
      position: relative;
      z-index: 10;
    }
    .beacon-wrap {
      position: relative;
      width: 4.5rem;
      height: 4.5rem;
      margin: 0 auto 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .beacon-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.2);
      animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    .beacon-ring {
      position: absolute;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: 1px solid rgba(245, 158, 11, 0.35);
      background: rgba(245, 158, 11, 0.1);
    }
    .beacon-dot {
      position: relative;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
    }
    @keyframes ping {
      75%, 100% {
        transform: scale(1.8);
        opacity: 0;
      }
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
    }
    .reason-box {
      margin-top: 1.5rem;
      padding: 1.15rem 1.5rem;
      background: #121622;
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .reason-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #f59e0b;
      margin-bottom: 0.35rem;
    }
    .reason-text {
      color: #f1f5f9;
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.55;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="beacon-wrap">
      <div class="beacon-pulse"></div>
      <div class="beacon-ring"></div>
      <div class="beacon-dot"></div>
    </div>
    <h1>${active ? 'Maintenance Active' : 'System Operational'}</h1>
    ${
      active && escapedReason
        ? `<div class="reason-box">
             <div class="reason-label">Notice</div>
             <div class="reason-text">${escapedReason}</div>
           </div>`
        : ''
    }
  </div>
  <script>
    (function () {
      setInterval(function () {
        fetch('/api/maintenance')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && !d.maintenance) {
              window.location.reload();
            }
          })
          .catch(function () {});
      }, 5000);
    })();
  </script>
</body>
</html>`;
}

/**
 * Express middleware enforcing maintenance mode across web and REST endpoints.
 * When maintenance is ON:
 * - Browser requests to any page are instantly redirected (302) to /maintenance.
 * - On /maintenance, the simple maintenance page is rendered.
 * - REST API requests return HTTP 403 Forbidden.
 * - Developers bypass this check.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function maintenanceMiddleware(req, res, next) {
  // Allow public access to maintenance status API endpoint for monitors and Vue components
  if (req.path === '/api/maintenance') {
    return next();
  }

  // Developer bypass
  if (isDevRequest(req)) {
    // If dev passed token via query parameter, store it in cookie for convenient navigation
    const queryToken = req.query?.key || req.query?.dev_token || req.query?.token;
    if (queryToken && !req.headers?.cookie?.includes('dev_token=')) {
      res.setHeader(
        'Set-Cookie',
        `dev_token=${encodeURIComponent(queryToken)}; Path=/; SameSite=Lax; HttpOnly`
      );
    }
    return next();
  }

  if (!isMaintenanceActive()) {
    return next();
  }

  // Allow preflight CORS requests to complete
  if (req.method === 'OPTIONS') {
    return next();
  }

  const reason = getMaintenanceReason();

  // Allow static dashboard bundle assets (JS, CSS, images, web fonts)
  if (
    req.path.startsWith('/assets/') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.jpg') ||
    req.path.endsWith('.jpeg') ||
    req.path.endsWith('.ico') ||
    req.path.endsWith('.svg') ||
    req.path.endsWith('.woff') ||
    req.path.endsWith('.woff2') ||
    req.path.endsWith('.ttf') ||
    req.path.endsWith('.map')
  ) {
    return next();
  }

  // Browser/HTML navigation: redirect any subpage to root ('/')
  const isHtmlRequest =
    req.accepts &&
    req.accepts('html') &&
    !req.xhr &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/currencies') &&
    !req.path.startsWith('/towny') &&
    !req.path.startsWith('/wars') &&
    !req.path.startsWith('/events') &&
    !req.path.startsWith('/players') &&
    !req.path.startsWith('/shops') &&
    !req.path.startsWith('/icons') &&
    !req.path.startsWith('/heads');

  if (isHtmlRequest) {
    if (req.path !== '/') {
      return res.redirect(302, '/');
    }
    res.status(403);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateMaintenanceHtml({ active: true, reason, isDev: false }));
  }

  // Non-HTML API requests return HTTP 403 Forbidden
  return res.status(403).json({
    error: 'Forbidden',
    status: 403,
    maintenance: true,
    message: 'Maintenance active',
    reason: reason || undefined,
  });
}

module.exports = {
  isMaintenanceActive,
  getMaintenanceReason,
  getMaintenanceDetails,
  setMaintenance,
  loadMaintenanceState,
  isDevUser,
  isDevRequest,
  extractDevToken,
  maintenanceMiddleware,
  generateMaintenanceHtml,
};
