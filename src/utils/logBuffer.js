let redisClient = null;
function getRedis() {
  if (!redisClient) {
    try {
      redisClient = require('./redis.js');
    } catch {
      // Ignore circular require during startup
    }
  }
  return redisClient;
}

/**
 * Log Buffer Manager
 * Captures, structures, and buffers application logs in-memory and Redis
 * for dev panel telemetry and real-time log streaming.
 */

const MAX_LOGS = 1000;
const REDIS_LOGS_KEY = 'logs:recent';
const REDIS_LOGS_MAX = 500;

// ANSI stripper regex
const ANSI_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function stripAnsi(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(ANSI_REGEX, '');
}

class LogBuffer {
  constructor(capacity = MAX_LOGS) {
    this.capacity = capacity;
    this.buffer = [];
    this.counter = 0;
    this.stats = {
      total: 0,
      DEBUG: 0,
      INFO: 0,
      SYSTEM: 0,
      SUCCESS: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    };
  }

  /**
   * Add a log entry to the buffer
   * @param {string} level - Log level
   * @param {string|any} message - Main log message
   * @param {...any} args - Extra arguments
   * @returns {Object} Structured log entry
   */
  addLog(level, message, ...args) {
    const normLevel = (level || 'INFO').toUpperCase().trim();
    this.counter += 1;
    this.stats.total += 1;
    if (this.stats[normLevel] !== undefined) {
      this.stats[normLevel] += 1;
    }

    const cleanMsg = stripAnsi(typeof message === 'object' ? JSON.stringify(message) : message);

    let stack = null;
    const details = [];

    for (const arg of args) {
      if (arg instanceof Error) {
        stack = arg.stack ? stripAnsi(arg.stack) : null;
        details.push({
          error: arg.message,
          name: arg.name,
        });
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          details.push(JSON.parse(JSON.stringify(arg)));
        } catch {
          details.push(String(arg));
        }
      } else if (arg !== undefined) {
        details.push(stripAnsi(String(arg)));
      }
    }

    const entry = {
      id: this.counter,
      timestamp: new Date().toISOString(),
      time: Date.now(),
      level: normLevel,
      message: cleanMsg,
      details: details.length > 0 ? (details.length === 1 ? details[0] : details) : null,
      stack: stack,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }

    // Persist asynchronously to Redis
    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      const serialized = JSON.stringify(entry);
      redis
        .lpush(REDIS_LOGS_KEY, serialized)
        .then(() => redis.ltrim(REDIS_LOGS_KEY, 0, REDIS_LOGS_MAX - 1))
        .catch(() => {});

      if (['ERROR', 'CRITICAL', 'WARNING'].includes(normLevel)) {
        redis.hincrby('stats:logs:levels', normLevel, 1).catch(() => {});
      }
    }

    return entry;
  }

  /**
   * Retrieve filtered logs
   * @param {Object} options
   * @param {string} [options.level] - Comma-separated or single level filter (e.g. 'ERROR,WARNING')
   * @param {string} [options.search] - Substring to search in message/details
   * @param {number} [options.limit=100] - Max logs to return
   * @param {number} [options.offset=0] - Offset for pagination
   * @param {number} [options.since] - Epoch ms timestamp
   * @param {number} [options.before] - Epoch ms timestamp
   * @param {string} [options.order='desc'] - 'desc' (newest first) or 'asc' (oldest first)
   * @returns {Object} { total, returned, logs }
   */
  getLogs({
    level = null,
    search = null,
    limit = 100,
    offset = 0,
    since = null,
    before = null,
    order = 'desc',
  } = {}) {
    let filtered = this.buffer;

    // Filter by level
    if (level && typeof level === 'string') {
      const allowed = level
        .toUpperCase()
        .split(',')
        .map((l) => l.trim());
      filtered = filtered.filter((entry) => allowed.includes(entry.level));
    }

    // Filter by timestamp range
    if (since) {
      const sinceNum = Number(since);
      if (!isNaN(sinceNum)) {
        filtered = filtered.filter((entry) => entry.time >= sinceNum);
      }
    }
    if (before) {
      const beforeNum = Number(before);
      if (!isNaN(beforeNum)) {
        filtered = filtered.filter((entry) => entry.time <= beforeNum);
      }
    }

    // Filter by search query
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((entry) => {
        if (entry.message && entry.message.toLowerCase().includes(q)) return true;
        if (entry.stack && entry.stack.toLowerCase().includes(q)) return true;
        if (entry.details) {
          const detailStr =
            typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
          if (detailStr.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    const total = filtered.length;

    // Sort order
    if (order === 'desc') {
      filtered = [...filtered].reverse();
    }

    const paged = filtered.slice(offset, offset + limit);

    return {
      total,
      returned: paged.length,
      limit,
      offset,
      logs: paged,
    };
  }

  /**
   * Return log statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      bufferedCount: this.buffer.length,
      capacity: this.capacity,
    };
  }

  /**
   * Clear in-memory and Redis log buffers
   */
  async clear() {
    this.buffer = [];
    this.counter = 0;
    this.stats = {
      total: 0,
      DEBUG: 0,
      INFO: 0,
      SYSTEM: 0,
      SUCCESS: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      try {
        await redis.del(REDIS_LOGS_KEY);
      } catch {
        // Ignore redis deletion error
      }
    }
  }
}

const logBuffer = new LogBuffer();

module.exports = {
  LogBuffer,
  logBuffer,
};
