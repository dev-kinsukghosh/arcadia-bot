const axios = require('axios');
const pc = require('picocolors');
const { eq } = require('drizzle-orm');
const { db } = require('../utils/db.js');
const { apiEndpoints, internal } = require('../db/schema.js');
const { config } = require('../config.js');
const logger = require('../utils/logger.js');
const { generateMinecraftWordlist, KNOWN_ROOTS } = require('../utils/minecraftWordlist.js');

function isWildcardAlias(endpointPath) {
  for (const root of KNOWN_ROOTS) {
    if (endpointPath.startsWith(`/api/${root}/`) || endpointPath.startsWith(`/${root}/`)) {
      return true;
    }
  }
  return false;
}

// Configuration
const TOTAL_SCAN_DURATION_MS = 32 * 60 * 60 * 1000; // 32 hours
const CYCLE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const STATE_DB_KEY = 'endpoint_scan_state';

let scanTimer = null;
let isScanRunning = false;

/**
 * Clean path string to standard /api/... format
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  let clean = path.trim().replace(/^\/+/, '');
  if (!clean.startsWith('api/') && !clean.startsWith('v1/') && !clean.startsWith('v2/')) {
    clean = `api/${clean}`;
  }
  return `/${clean}`;
}

/**
 * Load scan state from database
 */
async function loadScanState() {
  const rows = await db.select().from(internal).where(eq(internal.id, STATE_DB_KEY));
  if (rows.length > 0) {
    try {
      return JSON.parse(rows[0].value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save scan state to database
 */
async function saveScanState(state) {
  await db
    .insert(internal)
    .values({
      id: STATE_DB_KEY,
      value: JSON.stringify(state),
    })
    .onDuplicateKeyUpdate({
      target: internal.id,
      set: { value: JSON.stringify(state) },
    });
}

/**
 * Load list of already discovered endpoints from database
 * @returns {Promise<Set<string>>}
 */
async function getDiscoveredEndpoints() {
  const rows = await db.select({ endpoint: apiEndpoints.endpoint }).from(apiEndpoints);
  return new Set(rows.map((r) => r.endpoint.toLowerCase()));
}

/**
 * Test candidate endpoint against API server
 * @param {string} endpointPath e.g. '/api/factions'
 * @returns {Promise<{ found: boolean, status: number, data?: any }>}
 */
async function probeEndpoint(endpointPath) {
  const baseUrl = config.api.baseUrl.replace(/\/+$/, '');
  const targetUrl = `${baseUrl}${endpointPath}`;

  try {
    const res = await axios.get(targetUrl, {
      timeout: 8000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Arcadia-Community-Bot/1.0.0 (Endpoint-Scanner)',
      },
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (res.status === 200 || res.status === 201) {
      // Ensure response is JSON data, not HTML error/landing page
      const contentType = res.headers['content-type'] || '';
      const isJson =
        contentType.includes('application/json') ||
        (typeof res.data === 'object' && res.data !== null);

      if (isJson) {
        return { found: true, status: res.status, data: res.data };
      }
    }
    return { found: false, status: res.status };
  } catch (err) {
    return { found: false, status: err.response?.status || 0 };
  }
}

/**
 * Record newly discovered endpoint into database
 */
async function recordDiscoveredEndpoint(endpointPath, statusCode, sampleData) {
  const sampleStr = sampleData ? JSON.stringify(sampleData).slice(0, 1000) : null;

  await db
    .insert(apiEndpoints)
    .values({
      endpoint: endpointPath,
      statusCode,
      sampleResponse: sampleStr,
      discoveredAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      target: apiEndpoints.endpoint,
      set: {
        statusCode,
        sampleResponse: sampleStr,
        discoveredAt: new Date(),
      },
    });

  logger.system(
    pc.green(
      `🎉 [API DISCOVERY] Found new active endpoint: ${pc.bold(endpointPath)} (Status: ${statusCode})`
    )
  );
}

/**
 * Execute the 24-hour slow scan loop
 */
async function runScanCycle() {
  if (isScanRunning) return;
  isScanRunning = true;

  const rawWordlist = generateMinecraftWordlist();
  const discoveredSet = await getDiscoveredEndpoints();

  // Filter out endpoints that are already discovered or wildcard aliases
  const candidateQueue = rawWordlist
    .map(normalizePath)
    .filter((p) => !discoveredSet.has(p.toLowerCase()) && !isWildcardAlias(p));

  if (candidateQueue.length === 0) {
    logger.info(
      pc.cyan('🔍 [Endpoint Scanner] All candidate endpoints scanned or already discovered.')
    );
    isScanRunning = false;
    scheduleNextCycle(CYCLE_INTERVAL_MS);
    return;
  }

  // Calculate delay per probe to stretch candidate list evenly over 24 hours
  const probeDelayMs = Math.max(1500, Math.floor(TOTAL_SCAN_DURATION_MS / candidateQueue.length));

  let state = (await loadScanState()) || {
    lastCycleStart: Date.now(),
    currentIndex: 0,
    discoveredCount: 0,
  };

  // If a new cycle should start, reset index
  const timeSinceLastStart = Date.now() - (state.lastCycleStart || 0);
  if (timeSinceLastStart >= CYCLE_INTERVAL_MS || state.currentIndex >= candidateQueue.length) {
    state.lastCycleStart = Date.now();
    state.currentIndex = 0;
  }

  logger.info(
    pc.cyan(
      `🔍 [Endpoint Scanner] Starting scan cycle: ${candidateQueue.length} candidates, probing every ${Math.round(
        probeDelayMs / 1000
      )}s over 32h.`
    )
  );

  for (let i = state.currentIndex; i < candidateQueue.length; i++) {
    const candidate = candidateQueue[i];

    // Double check if discovered mid-scan
    if (!discoveredSet.has(candidate.toLowerCase())) {
      const result = await probeEndpoint(candidate);

      if (result.found) {
        await recordDiscoveredEndpoint(candidate, result.status, result.data);
        discoveredSet.add(candidate.toLowerCase());
        state.discoveredCount++;
      }
    }

    state.currentIndex = i + 1;
    await saveScanState(state);

    // Sleep delay between probes to keep scan slow and non-intrusive
    await new Promise((resolve) => setTimeout(resolve, probeDelayMs));
  }

  logger.info(
    pc.green(`✅ [Endpoint Scanner] 32-hour scan cycle completed. Next scan cycle in 1.6 days.`)
  );
  isScanRunning = false;

  // Schedule next 3-day cycle rest phase
  const elapsed = Date.now() - state.lastCycleStart;
  const remainingWait = Math.max(10000, CYCLE_INTERVAL_MS - elapsed);
  scheduleNextCycle(remainingWait);
}

/**
 * Schedule the next cycle execution
 */
function scheduleNextCycle(delayMs) {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    runScanCycle().catch((err) => {
      logger.error(`[Endpoint Scanner Error] ${err.message}`);
      isScanRunning = false;
      scheduleNextCycle(60000); // Retry in 1 minute on failure
    });
  }, delayMs);
}

/**
 * Initialize Endpoint Scanner background service
 */
async function initEndpointScanner() {
  const state = await loadScanState();
  const now = Date.now();

  let initialDelay = 5000; // Start 5 seconds after bot boot by default

  if (state && state.lastCycleStart) {
    const elapsed = now - state.lastCycleStart;
    if (elapsed < CYCLE_INTERVAL_MS) {
      if (state.currentIndex < 5000 && elapsed < TOTAL_SCAN_DURATION_MS) {
        // Resume active scan immediately
        initialDelay = 2000;
      } else {
        // In rest phase of the 3-day cycle
        initialDelay = CYCLE_INTERVAL_MS - elapsed;
      }
    }
  }

  logger.info(
    pc.cyan(
      `🌐 [Endpoint Scanner] Initialized. Next scan cycle starting in ${Math.round(
        initialDelay / 1000 / 60
      )} minute(s).`
    )
  );

  scheduleNextCycle(initialDelay);
}

module.exports = {
  initEndpointScanner,
  runScanCycle,
  getDiscoveredEndpoints,
};
