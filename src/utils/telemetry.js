const os = require('os');
const path = require('path');
const fs = require('fs');
const v8 = require('v8');
const { performance } = require('perf_hooks');
const redis = require('./redis.js');
const { connection } = require('./db.js');

/**
 * Telemetry & Performance Monitoring Service
 * Tracks real-time CPU, memory, event loop lag, command execution stats,
 * background services health, HTTP metrics, external ArcadiaMC API health,
 * Discord gateway interactions, and time-series historical snapshots
 * designed for the Dev Admin Panel.
 */

const SNAPSHOT_INTERVAL_MS = 60 * 1000; // 1 snapshot per minute
const MAX_SNAPSHOTS = 120; // 2 hours of historical time-series data
const MAX_RECENT_COMMANDS = 100;
const MAX_RECENT_REQUESTS = 50;
const MAX_RECENT_API_CALLS = 30;

class TelemetryManager {
  constructor() {
    this.discordClient = null;

    // CPU monitoring state
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = process.hrtime.bigint();
    this.currentCpuPercent = 0;
    this.cpuCores = os.cpus().length || 1;

    // Event loop lag & Event Loop Utilization (ELU) state
    this.eventLoopLagMs = 0;
    this.lastLoopCheck = Date.now();
    this.lastElu = performance.eventLoopUtilization ? performance.eventLoopUtilization() : null;
    this.eventLoopUtilizationPercent = 0;

    // Command telemetry
    this.commandStats = {
      total: 0,
      success: 0,
      failed: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      usageByCommand: {},
      usageByUser: {},
      usageByGuild: {},
      recent: [],
    };

    // Rolling CPM (Commands Per Minute) and RPM (Requests Per Minute)
    this.commandTimestamps = [];
    this.requestTimestamps = [];

    // Discord Bot Gateway & Interaction Telemetry
    this.discordStats = {
      interactionsTotal: 0,
      buttonClicksTotal: 0,
      buttonClicksByAction: {},
      autocompleteTotal: 0,
      cooldownBlocksTotal: 0,
      blacklistBlocksTotal: 0,
      rateLimitsTotal: 0,
      rateLimitsByRoute: {},
      lastRateLimit: null,
      gateway: {
        eventsTotal: 0,
        eventsByType: {},
        disconnects: 0,
        reconnects: 0,
        resumes: 0,
      },
      recentInteractions: [],
    };

    // Background sync services telemetry
    this.services = {
      ConvoySync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      CurrencySync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      HeadsSync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      ShopsSync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      TownySync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      EmptyEndpointsSync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
      PlayerSync: {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      },
    };

    // External ArcadiaMC API Telemetry
    this.externalApiStats = {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      byEndpoint: {},
      recentCalls: [],
    };

    // HTTP / API Telemetry (Express)
    this.httpStats = {
      totalRequests: 0,
      statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      totalDurationMs: 0,
      avgDurationMs: 0,
      bytesReceivedTotal: 0,
      bytesSentTotal: 0,
      cacheHits: 0,
      cacheMisses: 0,
      requestsByRoute: {},
      slowRequests: [],
      recentRequests: [],
    };

    // Real-Time WebSocket Telemetry
    this.wsStats = {
      connectedClients: 0,
      peakClients: 0,
      subscribedTelemetryClients: 0,
      messagesSentTotal: 0,
      messagesReceivedTotal: 0,
      disconnectionsTotal: 0,
    };

    // Security & Access Telemetry
    this.securityStats = {
      unauthorizedAttemptsTotal: 0,
      recentUnauthorized: [],
    };

    // Garbage Collection (GC) Runtime Stats
    this.gcStats = {
      totalRuns: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      byType: {
        'Minor (Scavenge)': 0,
        'Major (Mark-Sweep)': 0,
        'Incremental Marking': 0,
        'Weak Processing': 0,
      },
      lastGc: null,
    };
    this.initGcObserver();

    // Web Client & Frontend Telemetry
    this.webStats = {
      pageViewsTotal: 0,
      clientErrorsTotal: 0,
      pageViewsByRoute: {},
      devices: { desktop: 0, mobile: 0, tablet: 0 },
      browsers: {},
      operatingSystems: {},
      webVitals: { lcp: [], fcp: [], cls: [], ttfb: [] },
      rateLimitsTriggered: 0,
      recentErrors: [],
      recentEvents: [],
      activeSessions: new Map(),
    };

    // Historical time-series snapshots (for dev panel charts)
    this.snapshots = [];

    // Periodic sampling timers
    this.cpuTimer = null;
    this.lagTimer = null;
    this.snapshotTimer = null;

    this.initSamplers();
  }

  /**
   * Set Discord client reference and attach rate limit & gateway listeners
   */
  setClient(client) {
    this.discordClient = client;

    if (client) {
      // 1. Intercept Discord REST API rate limiting
      if (client.rest && typeof client.rest.on === 'function') {
        client.rest.on('rateLimited', (rateLimitData) => {
          this.recordDiscordRateLimit(rateLimitData);
        });
      }

      // 2. Intercept Discord Gateway lifecycle and dispatch events
      if (typeof client.on === 'function') {
        client.on('raw', (packet) => {
          if (packet && packet.t) {
            this.recordGatewayEvent(packet.t);
          }
        });

        client.on('shardDisconnect', () => {
          this.discordStats.gateway.disconnects += 1;
        });

        client.on('shardReconnecting', () => {
          this.discordStats.gateway.reconnects += 1;
        });

        client.on('shardResume', () => {
          this.discordStats.gateway.resumes += 1;
        });
      }
    }
  }

  /**
   * Initialize PerformanceObserver to track V8 Garbage Collection runs
   */
  initGcObserver() {
    try {
      const { PerformanceObserver } = require('perf_hooks');
      if (
        PerformanceObserver &&
        PerformanceObserver.supportedEntryTypes &&
        PerformanceObserver.supportedEntryTypes.includes('gc')
      ) {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            this.recordGcRun({
              kind: entry.detail?.kind || entry.kind || 0,
              durationMs: entry.duration || 0,
              timestamp: Date.now(),
            });
          }
        });
        obs.observe({ entryTypes: ['gc'] });
        this.gcObserver = obs;
      }
    } catch {
      // GC observation not supported or disabled in runtime
    }
  }

  /**
   * Record a Garbage Collection pause event
   */
  recordGcRun({ kind = 0, durationMs = 0, timestamp = Date.now() } = {}) {
    this.gcStats.totalRuns += 1;
    const dur = Math.max(0, parseFloat(durationMs.toFixed(2)));
    this.gcStats.totalDurationMs = parseFloat((this.gcStats.totalDurationMs + dur).toFixed(2));
    if (dur > this.gcStats.maxDurationMs) {
      this.gcStats.maxDurationMs = dur;
    }
    this.gcStats.avgDurationMs = parseFloat(
      (this.gcStats.totalDurationMs / this.gcStats.totalRuns).toFixed(2)
    );

    let typeName = 'Minor (Scavenge)';
    if (kind === 2 || kind === 4) typeName = 'Major (Mark-Sweep)';
    else if (kind === 8) typeName = 'Incremental Marking';
    else if (kind === 16) typeName = 'Weak Processing';

    this.gcStats.byType[typeName] = (this.gcStats.byType[typeName] || 0) + 1;
    this.gcStats.lastGc = {
      type: typeName,
      durationMs: dur,
      timestamp: new Date(timestamp).toISOString(),
    };
  }

  /**
   * Record Discord REST rate limit event
   */
  recordDiscordRateLimit(data = {}) {
    this.discordStats.rateLimitsTotal += 1;
    const route = data.route || data.url || 'unknown';
    this.discordStats.rateLimitsByRoute[route] =
      (this.discordStats.rateLimitsByRoute[route] || 0) + 1;
    this.discordStats.lastRateLimit = {
      route,
      retryAfterMs: data.retryAfter || data.timeToReset || 0,
      global: !!data.global,
      timestamp: new Date().toISOString(),
    };

    if (redis && redis.status === 'ready') {
      redis.incr('stats:discord:ratelimits:total').catch(() => {});
    }
  }

  /**
   * Record Discord Gateway dispatch event
   */
  recordGatewayEvent(eventName) {
    if (!eventName) return;
    this.discordStats.gateway.eventsTotal += 1;
    this.discordStats.gateway.eventsByType[eventName] =
      (this.discordStats.gateway.eventsByType[eventName] || 0) + 1;
  }

  /**
   * Record unauthorized access attempt to protected dev panel endpoints
   */
  recordUnauthorizedAccess({ ip = 'unknown', path = '/', method = 'GET' } = {}) {
    this.securityStats.unauthorizedAttemptsTotal += 1;
    const entry = {
      timestamp: new Date().toISOString(),
      time: Date.now(),
      ip,
      path,
      method,
    };
    this.securityStats.recentUnauthorized.unshift(entry);
    if (this.securityStats.recentUnauthorized.length > 30) {
      this.securityStats.recentUnauthorized.pop();
    }
  }

  /**
   * Real-time WebSocket connection tracking
   */
  recordWsConnection() {
    this.wsStats.connectedClients += 1;
    if (this.wsStats.connectedClients > this.wsStats.peakClients) {
      this.wsStats.peakClients = this.wsStats.connectedClients;
    }
  }

  /**
   * Real-time WebSocket disconnection tracking
   */
  recordWsDisconnection() {
    this.wsStats.connectedClients = Math.max(0, this.wsStats.connectedClients - 1);
    this.wsStats.disconnectionsTotal += 1;
  }

  /**
   * Record WebSocket message sent / received
   */
  recordWsMessage(direction = 'received') {
    if (direction === 'sent') {
      this.wsStats.messagesSentTotal += 1;
    } else {
      this.wsStats.messagesReceivedTotal += 1;
    }
  }

  /**
   * Set count of actively subscribed telemetry WS clients
   */
  setWsSubscribedCount(count) {
    this.wsStats.subscribedTelemetryClients = Math.max(0, count);
  }

  /**
   * Rolling Commands Per Minute (CPM) in last 60 seconds
   */
  getRollingCpm() {
    const cutoff = Date.now() - 60000;
    this.commandTimestamps = this.commandTimestamps.filter((t) => t >= cutoff);
    return this.commandTimestamps.length;
  }

  /**
   * Rolling Requests Per Minute (RPM) in last 60 seconds
   */
  getRollingRpm() {
    const cutoff = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t >= cutoff);
    return this.requestTimestamps.length;
  }

  /**
   * Initialize background CPU, event loop lag, and snapshot samplers
   */
  initSamplers() {
    // 1. CPU & ELU sampler (every 5 seconds)
    this.cpuTimer = setInterval(() => {
      this.sampleCpu();
    }, 5000);
    if (this.cpuTimer.unref) this.cpuTimer.unref();

    // 2. Event loop lag sampler (every 2 seconds)
    this.lagTimer = setInterval(() => {
      const now = Date.now();
      const expectedInterval = 2000;
      const actualElapsed = now - this.lastLoopCheck;
      this.eventLoopLagMs = Math.max(0, actualElapsed - expectedInterval);
      this.lastLoopCheck = now;
    }, 2000);
    if (this.lagTimer.unref) this.lagTimer.unref();

    // 3. Historical snapshot recorder (every 60 seconds)
    this.snapshotTimer = setInterval(() => {
      this.recordSnapshot();
    }, SNAPSHOT_INTERVAL_MS);
    if (this.snapshotTimer.unref) this.snapshotTimer.unref();

    // Initial warm-up snapshot
    setTimeout(() => {
      this.recordSnapshot();
    }, 3000);
  }

  /**
   * Sample CPU usage percentage over elapsed wall time and Event Loop Utilization
   */
  sampleCpu() {
    try {
      const currentUsage = process.cpuUsage(this.lastCpuUsage);
      const currentTime = process.hrtime.bigint();
      const elapsedNs = Number(currentTime - this.lastCpuTime);

      if (elapsedNs > 0) {
        const totalCpuNs = (currentUsage.user + currentUsage.system) * 1000;
        const rawPercent = (totalCpuNs / (elapsedNs * this.cpuCores)) * 100;
        this.currentCpuPercent = Math.min(100, Math.max(0, parseFloat(rawPercent.toFixed(1))));
      }

      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = currentTime;

      // Event Loop Utilization (ELU)
      if (performance.eventLoopUtilization && this.lastElu) {
        const elu = performance.eventLoopUtilization(this.lastElu);
        this.eventLoopUtilizationPercent = Math.min(
          100,
          Math.max(0, parseFloat((elu.utilization * 100).toFixed(1)))
        );
        this.lastElu = performance.eventLoopUtilization();
      }
    } catch {
      // Ignore CPU sampling errors
    }
  }

  /**
   * Record a time-series telemetry snapshot
   */
  recordSnapshot() {
    const mem = process.memoryUsage();
    const snapshot = {
      timestamp: new Date().toISOString(),
      time: Date.now(),
      cpuPercent: this.currentCpuPercent,
      eventLoopUtilizationPercent: this.eventLoopUtilizationPercent,
      memory: {
        rssMb: parseFloat((mem.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(1)),
        heapTotalMb: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(1)),
        externalMb: parseFloat((mem.external / 1024 / 1024).toFixed(1)),
      },
      eventLoopLagMs: this.eventLoopLagMs,
      commandsTotal: this.commandStats.total,
      cpm: this.getRollingCpm(),
      httpTotal: this.httpStats.totalRequests,
      rpm: this.getRollingRpm(),
      bandwidthSentKb: parseFloat((this.httpStats.bytesSentTotal / 1024).toFixed(1)),
      externalApiTotal: this.externalApiStats.totalCalls,
      guilds: this.discordClient?.guilds?.cache?.size || 0,
      wsPing: this.discordClient?.ws?.ping || 0,
      wsClients: this.wsStats.connectedClients,
      activeWebVisitors: this.getActiveWebVisitorsCount(),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Persist snapshot to Redis for dashboard restart resilience
    if (redis && redis.status === 'ready') {
      redis
        .lpush('telemetry:snapshots:history', JSON.stringify(snapshot))
        .then(() => redis.ltrim('telemetry:snapshots:history', 0, MAX_SNAPSHOTS - 1))
        .catch(() => {});
    }
  }

  /**
   * Record a command execution
   */
  recordCommandExecution({
    commandName,
    userId,
    userTag = 'Unknown',
    guildId = 'DM',
    guildName = 'Direct Message',
    durationMs = 0,
    success = true,
    error = null,
  }) {
    const dur = Math.max(0, Math.round(durationMs));

    this.commandTimestamps.push(Date.now());
    this.commandStats.total += 1;
    this.discordStats.interactionsTotal += 1;
    if (success) {
      this.commandStats.success += 1;
    } else {
      this.commandStats.failed += 1;
    }

    this.commandStats.totalDurationMs += dur;
    this.commandStats.avgDurationMs = Math.round(
      this.commandStats.totalDurationMs / this.commandStats.total
    );

    if (this.commandStats.minDurationMs === 0 || dur < this.commandStats.minDurationMs) {
      this.commandStats.minDurationMs = dur;
    }
    if (dur > this.commandStats.maxDurationMs) {
      this.commandStats.maxDurationMs = dur;
    }

    // Command counts
    this.commandStats.usageByCommand[commandName] =
      (this.commandStats.usageByCommand[commandName] || 0) + 1;

    // User counts
    this.commandStats.usageByUser[userId] = (this.commandStats.usageByUser[userId] || 0) + 1;

    // Guild counts
    this.commandStats.usageByGuild[guildId] = (this.commandStats.usageByGuild[guildId] || 0) + 1;

    const entry = {
      id: this.commandStats.total,
      timestamp: new Date().toISOString(),
      time: Date.now(),
      command: commandName,
      userId,
      userTag,
      guildId,
      guildName,
      durationMs: dur,
      success,
      error: error ? String(error) : null,
    };

    this.commandStats.recent.unshift(entry);
    if (this.commandStats.recent.length > MAX_RECENT_COMMANDS) {
      this.commandStats.recent.pop();
    }

    // Async update in Redis
    if (redis && redis.status === 'ready') {
      try {
        redis.incr('stats:commands:total').catch(() => {});
        redis.hincrby('stats:commands:usage', commandName, 1).catch(() => {});
        redis.incr(success ? 'stats:commands:success' : 'stats:commands:failed').catch(() => {});

        if (userId) {
          redis.hincrby('stats:commands:users', userId, 1).catch(() => {});
          redis.hset('stats:commands:user_names', userId, userTag).catch(() => {});
        }
        if (guildId) {
          redis.hincrby('stats:commands:guilds', guildId, 1).catch(() => {});
          redis.hset('stats:commands:guild_names', guildId, guildName).catch(() => {});
        }

        redis
          .lpush('telemetry:commands:recent', JSON.stringify(entry))
          .then(() => redis.ltrim('telemetry:commands:recent', 0, MAX_RECENT_COMMANDS - 1))
          .catch(() => {});
      } catch {
        // Ignore redis tracking errors
      }
    }
  }

  /**
   * Record Discord button click interaction
   */
  recordButtonClick(customId = '', action = 'button') {
    this.discordStats.interactionsTotal += 1;
    this.discordStats.buttonClicksTotal += 1;

    const actKey = action || 'button';
    this.discordStats.buttonClicksByAction[actKey] =
      (this.discordStats.buttonClicksByAction[actKey] || 0) + 1;

    if (redis && redis.status === 'ready') {
      redis.incr('stats:discord:buttons:total').catch(() => {});
      redis.hincrby('stats:discord:buttons:actions', actKey, 1).catch(() => {});
    }
  }

  /**
   * Record Discord autocomplete query
   */
  recordAutocomplete(commandName) {
    this.discordStats.interactionsTotal += 1;
    this.discordStats.autocompleteTotal += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:discord:autocomplete:total').catch(() => {});
    }
  }

  /**
   * Record Discord cooldown hit
   */
  recordCooldownHit(commandName, userId) {
    this.discordStats.cooldownBlocksTotal += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:discord:cooldowns:total').catch(() => {});
    }
  }

  /**
   * Record Blacklist block
   */
  recordBlacklistBlock(userId) {
    this.discordStats.blacklistBlocksTotal += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:discord:blacklist_blocks:total').catch(() => {});
    }
  }

  /**
   * Record External ArcadiaMC API request telemetry
   */
  recordExternalApiCall({
    method = 'GET',
    url = '',
    status = 200,
    durationMs = 0,
    success = true,
    error = null,
  }) {
    const dur = Math.max(0, Math.round(durationMs));
    const cleanUrl = url.replace(/\?.*$/, '').replace(/https?:\/\/[^/]+/, '');
    const endpoint = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;

    this.externalApiStats.totalCalls += 1;
    if (success) {
      this.externalApiStats.successCalls += 1;
    } else {
      this.externalApiStats.failedCalls += 1;
    }

    this.externalApiStats.totalDurationMs += dur;
    this.externalApiStats.avgDurationMs = Math.round(
      this.externalApiStats.totalDurationMs / this.externalApiStats.totalCalls
    );

    if (!this.externalApiStats.byEndpoint[endpoint]) {
      this.externalApiStats.byEndpoint[endpoint] = {
        count: 0,
        success: 0,
        errors: 0,
        totalMs: 0,
        avgMs: 0,
        minMs: dur,
        maxMs: dur,
        lastStatus: status,
        lastCall: new Date().toISOString(),
        consecutiveFailures: 0,
        circuitStatus: 'HEALTHY',
        statusDistribution: {},
      };
    }

    const ep = this.externalApiStats.byEndpoint[endpoint];
    ep.count += 1;
    ep.statusDistribution[status] = (ep.statusDistribution[status] || 0) + 1;

    if (success) {
      ep.success += 1;
      ep.consecutiveFailures = 0;
      ep.circuitStatus = 'HEALTHY';
    } else {
      ep.errors += 1;
      ep.consecutiveFailures += 1;
      ep.circuitStatus = ep.consecutiveFailures >= 3 ? 'DOWN' : 'DEGRADED';
      ep.lastError = {
        message: error ? String(error) : `HTTP ${status}`,
        status,
        timestamp: new Date().toISOString(),
      };
    }

    ep.totalMs += dur;
    ep.avgMs = Math.round(ep.totalMs / ep.count);
    if (dur < ep.minMs) ep.minMs = dur;
    if (dur > ep.maxMs) ep.maxMs = dur;
    ep.lastStatus = status;
    ep.lastCall = new Date().toISOString();

    const entry = {
      timestamp: new Date().toISOString(),
      time: Date.now(),
      method,
      endpoint,
      status,
      durationMs: dur,
      success,
      error: error ? String(error) : null,
    };

    this.externalApiStats.recentCalls.unshift(entry);
    if (this.externalApiStats.recentCalls.length > MAX_RECENT_API_CALLS) {
      this.externalApiStats.recentCalls.pop();
    }

    if (redis && redis.status === 'ready') {
      redis.incr('stats:api:external:total').catch(() => {});
      redis.hincrby('stats:api:external:endpoints', endpoint, 1).catch(() => {});
    }
  }

  /**
   * Record a background sync service run
   */
  recordServiceRun(
    serviceName,
    { durationMs = 0, success = true, error = null, itemsCount = null, details = null } = {}
  ) {
    if (!this.services[serviceName]) {
      this.services[serviceName] = {
        status: 'idle',
        lastRun: null,
        durationMs: 0,
        runs: 0,
        errors: 0,
        lastError: null,
      };
    }

    const s = this.services[serviceName];
    s.status = success ? 'healthy' : 'error';
    s.lastRun = new Date().toISOString();
    s.lastRunTime = Date.now();
    s.durationMs = Math.round(durationMs);
    s.runs += 1;
    if (!success) {
      s.errors += 1;
      s.lastError = error ? String(error) : 'Unknown service failure';
    }
    if (itemsCount !== null) {
      s.itemsCount = itemsCount;
    }
    if (details) {
      s.details = details;
    }

    // Persist to Redis
    if (redis && redis.status === 'ready') {
      redis
        .hset(
          `telemetry:service:${serviceName}`,
          'status',
          s.status,
          'lastRun',
          s.lastRun,
          'durationMs',
          String(s.durationMs),
          'runs',
          String(s.runs),
          'errors',
          String(s.errors),
          'lastError',
          s.lastError || ''
        )
        .catch(() => {});
    }
  }

  /**
   * Express Middleware to track API HTTP telemetry
   */
  apiMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const reqBytes = parseInt(req.headers['content-length'] || '0', 10) || 0;
      this.httpStats.bytesReceivedTotal += reqBytes;
      this.requestTimestamps.push(startTime);

      let resBytes = 0;
      const originalWrite = res.write;
      const originalEnd = res.end;

      res.write = function (chunk, ...args) {
        if (chunk) {
          resBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
        }
        return originalWrite.apply(res, [chunk, ...args]);
      };

      res.end = function (chunk, ...args) {
        if (chunk) {
          resBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
        }
        return originalEnd.apply(res, [chunk, ...args]);
      };

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const statusClass = `${Math.floor(status / 100)}xx`;

        this.httpStats.totalRequests += 1;
        this.httpStats.bytesSentTotal += resBytes;

        if (this.httpStats.statusCodes[statusClass] !== undefined) {
          this.httpStats.statusCodes[statusClass] += 1;
        }

        this.httpStats.totalDurationMs += duration;
        this.httpStats.avgDurationMs = Math.round(
          this.httpStats.totalDurationMs / this.httpStats.totalRequests
        );

        const routeKey = req.baseUrl
          ? `${req.baseUrl}${req.route?.path || req.path}`
          : req.route?.path || req.path;

        if (!this.httpStats.requestsByRoute[routeKey]) {
          this.httpStats.requestsByRoute[routeKey] = {
            count: 0,
            totalDurationMs: 0,
            avgDurationMs: 0,
            minDurationMs: duration,
            maxDurationMs: duration,
            statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
            lastCalled: new Date().toISOString(),
          };
        }

        const rStat = this.httpStats.requestsByRoute[routeKey];
        rStat.count += 1;
        rStat.totalDurationMs += duration;
        rStat.avgDurationMs = Math.round(rStat.totalDurationMs / rStat.count);
        if (duration < rStat.minDurationMs) rStat.minDurationMs = duration;
        if (duration > rStat.maxDurationMs) rStat.maxDurationMs = duration;
        if (rStat.statusCodes[statusClass] !== undefined) {
          rStat.statusCodes[statusClass] += 1;
        }
        rStat.lastCalled = new Date().toISOString();

        const entry = {
          time: Date.now(),
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.baseUrl ? `${req.baseUrl}${req.path}` : req.path,
          status,
          durationMs: duration,
          bytesReceived: reqBytes,
          bytesSent: resBytes,
          ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          cached: res.getHeader('X-Cache') === 'HIT',
        };

        this.httpStats.recentRequests.unshift(entry);
        if (this.httpStats.recentRequests.length > MAX_RECENT_REQUESTS) {
          this.httpStats.recentRequests.pop();
        }

        if (duration > 500) {
          this.httpStats.slowRequests.unshift(entry);
          if (this.httpStats.slowRequests.length > 20) {
            this.httpStats.slowRequests.pop();
          }
        }

        // Redis HTTP tracking
        if (redis && redis.status === 'ready') {
          redis.incr('stats:http:total').catch(() => {});
          redis.hincrby('stats:http:status', statusClass, 1).catch(() => {});
        }
      });

      next();
    };
  }

  /**
   * Record Cache Hit
   */
  recordCacheHit() {
    this.httpStats.cacheHits += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:cache:hits').catch(() => {});
    }
  }

  /**
   * Record Cache Miss
   */
  recordCacheMiss() {
    this.httpStats.cacheMisses += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:cache:misses').catch(() => {});
    }
  }

  /**
   * Record rate limit or tarpit hit
   */
  recordRateLimitHit(type = 'ip', ip = 'unknown') {
    this.webStats.rateLimitsTriggered += 1;
    if (redis && redis.status === 'ready') {
      redis.incr('stats:web:ratelimits:total').catch(() => {});
    }
  }

  /**
   * Record Web Frontend Event (Pageview, Client Error, Web Vital, Device)
   */
  recordWebEvent({
    type = 'pageview',
    path: reqPath = '/',
    referrer = '',
    userAgent = '',
    ip = 'unknown',
    durationMs = 0,
    error = null,
    device = null,
    browser = null,
    os: clientOs = null,
    vital = null, // e.g. { metric: 'LCP', value: 1200 }
    sessionId = null,
  } = {}) {
    const now = Date.now();
    const cleanPath = String(reqPath || '/').split('?')[0];

    // Track active web session
    const effectiveSession = sessionId || `${ip}_${userAgent}`.slice(0, 64);
    this.webStats.activeSessions.set(effectiveSession, now);

    // Prune stale sessions older than 5 minutes
    const sessionCutoff = now - 5 * 60 * 1000;
    for (const [sId, lastSeen] of this.webStats.activeSessions.entries()) {
      if (lastSeen < sessionCutoff) {
        this.webStats.activeSessions.delete(sId);
      }
    }

    if (device && this.webStats.devices[device] !== undefined) {
      this.webStats.devices[device] += 1;
    }
    if (browser) {
      this.webStats.browsers[browser] = (this.webStats.browsers[browser] || 0) + 1;
    }
    if (clientOs) {
      this.webStats.operatingSystems[clientOs] =
        (this.webStats.operatingSystems[clientOs] || 0) + 1;
    }

    if (vital && vital.metric && this.webStats.webVitals[vital.metric.toLowerCase()]) {
      const arr = this.webStats.webVitals[vital.metric.toLowerCase()];
      arr.push(vital.value);
      if (arr.length > 50) arr.shift();
    }

    if (type === 'pageview') {
      this.webStats.pageViewsTotal += 1;
      this.webStats.pageViewsByRoute[cleanPath] =
        (this.webStats.pageViewsByRoute[cleanPath] || 0) + 1;

      if (redis && redis.status === 'ready') {
        redis.incr('stats:web:pageviews:total').catch(() => {});
        redis.hincrby('stats:web:pageviews:routes', cleanPath, 1).catch(() => {});
      }
    } else if (type === 'error') {
      this.webStats.clientErrorsTotal += 1;
      const errEntry = {
        timestamp: new Date().toISOString(),
        time: now,
        path: cleanPath,
        error: error ? String(error) : 'Unknown client error',
        userAgent,
        device,
      };

      this.webStats.recentErrors.unshift(errEntry);
      if (this.webStats.recentErrors.length > 50) {
        this.webStats.recentErrors.pop();
      }

      if (redis && redis.status === 'ready') {
        redis.incr('stats:web:errors:total').catch(() => {});
        redis
          .lpush('telemetry:web:errors:recent', JSON.stringify(errEntry))
          .then(() => redis.ltrim('telemetry:web:errors:recent', 0, 49))
          .catch(() => {});
      }
    }

    const eventEntry = {
      timestamp: new Date().toISOString(),
      time: now,
      type,
      path: cleanPath,
      referrer,
      durationMs,
      device,
    };

    this.webStats.recentEvents.unshift(eventEntry);
    if (this.webStats.recentEvents.length > 50) {
      this.webStats.recentEvents.pop();
    }
  }

  /**
   * Get count of active web visitors in last 5 minutes
   */
  getActiveWebVisitorsCount() {
    const now = Date.now();
    const cutoff = now - 5 * 60 * 1000;
    let count = 0;
    for (const lastSeen of this.webStats.activeSessions.values()) {
      if (lastSeen >= cutoff) count += 1;
    }
    return count;
  }

  /**
   * Check MySQL connection & latency
   */
  async checkDatabaseHealth() {
    const start = Date.now();
    try {
      if (!connection) {
        return {
          connected: false,
          latencyMs: 0,
          error: 'Database connection instance unavailable',
        };
      }
      await connection.execute('SELECT 1');
      return {
        connected: true,
        latencyMs: Date.now() - start,
        error: null,
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Fetch database table row counts, sizes, total database footprint, and connection pool metrics
   */
  async getDatabaseTableCounts() {
    if (!connection)
      return { tables: {}, summary: { totalTables: 0, totalRows: 0, totalSizeMb: 0 } };
    try {
      const [rows] = await connection.execute(
        `SELECT table_name, table_rows, data_length, index_length 
         FROM information_schema.tables 
         WHERE table_schema = DATABASE()`
      );

      const tables = {};
      let totalRows = 0;
      let totalDataKb = 0;
      let totalIndexKb = 0;

      if (Array.isArray(rows)) {
        for (const row of rows) {
          const tName = row.table_name || row.TABLE_NAME;
          const rCount = Number(row.table_rows || row.TABLE_ROWS || 0);
          const dKb = Math.round(Number(row.data_length || row.DATA_LENGTH || 0) / 1024);
          const iKb = Math.round(Number(row.index_length || row.INDEX_LENGTH || 0) / 1024);

          tables[tName] = {
            rowCount: rCount,
            dataLengthKb: dKb,
            indexLengthKb: iKb,
            totalLengthKb: dKb + iKb,
          };
          totalRows += rCount;
          totalDataKb += dKb;
          totalIndexKb += iKb;
        }
      }

      let pool = null;
      if (connection.pool) {
        pool = {
          allConnections: connection.pool._allConnections
            ? connection.pool._allConnections.length
            : null,
          freeConnections: connection.pool._freeConnections
            ? connection.pool._freeConnections.length
            : null,
          queueLength: connection.pool._connectionQueue
            ? connection.pool._connectionQueue.length
            : null,
        };
      }

      return {
        tables,
        summary: {
          totalTables: Object.keys(tables).length,
          totalRows,
          totalDataMb: parseFloat((totalDataKb / 1024).toFixed(2)),
          totalIndexMb: parseFloat((totalIndexKb / 1024).toFixed(2)),
          totalSizeMb: parseFloat(((totalDataKb + totalIndexKb) / 1024).toFixed(2)),
        },
        pool,
      };
    } catch {
      return { tables: {}, summary: { totalTables: 0, totalRows: 0, totalSizeMb: 0 } };
    }
  }

  /**
   * Check Redis connection, latency, and detailed memory/ops telemetry
   */
  async checkRedisHealth() {
    const start = Date.now();
    try {
      if (!redis || redis.status !== 'ready') {
        return {
          connected: false,
          status: redis ? redis.status : 'disconnected',
          latencyMs: 0,
          usedMemoryHuman: '0B',
          totalKeys: 0,
        };
      }

      await redis.ping();
      const latencyMs = Date.now() - start;

      let usedMemoryHuman = 'Unknown';
      let usedMemoryRssHuman = 'Unknown';
      let usedMemoryPeakHuman = 'Unknown';
      let memFragmentationRatio = 0;
      let instantaneousOpsPerSec = 0;
      let connectedClients = 0;
      let keyspaceHits = 0;
      let keyspaceMisses = 0;
      let totalKeys = 0;

      try {
        const info = await redis.info('all');

        const mMem = info.match(/used_memory_human:([^\r\n]+)/);
        if (mMem) usedMemoryHuman = mMem[1].trim();

        const mRss = info.match(/used_memory_rss_human:([^\r\n]+)/);
        if (mRss) usedMemoryRssHuman = mRss[1].trim();

        const mPeak = info.match(/used_memory_peak_human:([^\r\n]+)/);
        if (mPeak) usedMemoryPeakHuman = mPeak[1].trim();

        const mFrag = info.match(/mem_fragmentation_ratio:([^\r\n]+)/);
        if (mFrag) memFragmentationRatio = parseFloat(mFrag[1].trim()) || 0;

        const mOps = info.match(/instantaneous_ops_per_sec:([^\r\n]+)/);
        if (mOps) instantaneousOpsPerSec = parseInt(mOps[1].trim(), 10) || 0;

        const mClients = info.match(/connected_clients:([^\r\n]+)/);
        if (mClients) connectedClients = parseInt(mClients[1].trim(), 10) || 0;

        const mHits = info.match(/keyspace_hits:([^\r\n]+)/);
        if (mHits) keyspaceHits = parseInt(mHits[1].trim(), 10) || 0;

        const mMisses = info.match(/keyspace_misses:([^\r\n]+)/);
        if (mMisses) keyspaceMisses = parseInt(mMisses[1].trim(), 10) || 0;

        totalKeys = await redis.dbsize();
      } catch {
        // Ignore info retrieval errors
      }

      const totalKeyOps = keyspaceHits + keyspaceMisses;
      const keyspaceHitRatio =
        totalKeyOps > 0 ? parseFloat(((keyspaceHits / totalKeyOps) * 100).toFixed(1)) : 0;

      return {
        connected: true,
        status: 'ready',
        latencyMs,
        usedMemoryHuman,
        usedMemoryRssHuman,
        usedMemoryPeakHuman,
        memFragmentationRatio,
        instantaneousOpsPerSec,
        connectedClients,
        keyspaceHits,
        keyspaceMisses,
        keyspaceHitRatio,
        totalKeys,
      };
    } catch (err) {
      return {
        connected: false,
        status: 'error',
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Compute on-disk asset cache statistics (Player Heads & Item Icons)
   */
  getAssetCacheStats() {
    const stats = {
      headsCount: 0,
      headsSizeKb: 0,
      iconsCount: 0,
      iconsSizeKb: 0,
    };

    const headsDir = path.join(process.cwd(), 'src', 'heads');
    if (fs.existsSync(headsDir)) {
      try {
        const files = fs.readdirSync(headsDir);
        stats.headsCount = files.length;
        for (const file of files.slice(0, 1000)) {
          try {
            const s = fs.statSync(path.join(headsDir, file));
            stats.headsSizeKb += s.size / 1024;
          } catch {
            // ignore
          }
        }
        stats.headsSizeKb = Math.round(stats.headsSizeKb);
      } catch {
        // ignore
      }
    }

    const iconsDir = path.join(process.cwd(), 'src', 'icons');
    if (fs.existsSync(iconsDir)) {
      try {
        const files = fs.readdirSync(iconsDir);
        stats.iconsCount = files.length;
        for (const file of files.slice(0, 1000)) {
          try {
            const s = fs.statSync(path.join(iconsDir, file));
            stats.iconsSizeKb += s.size / 1024;
          } catch {
            // ignore
          }
        }
        stats.iconsSizeKb = Math.round(stats.iconsSizeKb);
      } catch {
        // ignore
      }
    }

    return stats;
  }

  /**
   * Internal V8 heap spaces and OS resource usage
   */
  getV8InternalStats() {
    let heapSpaces = [];
    try {
      heapSpaces = v8.getHeapSpaceStatistics().map((s) => ({
        spaceName: s.space_name,
        sizeMb: parseFloat((s.space_size / 1024 / 1024).toFixed(2)),
        usedMb: parseFloat((s.space_used_size / 1024 / 1024).toFixed(2)),
        availableMb: parseFloat((s.space_available_size / 1024 / 1024).toFixed(2)),
      }));
    } catch {
      // ignore
    }

    let resourceUsage = null;
    try {
      if (process.resourceUsage) {
        resourceUsage = process.resourceUsage();
      }
    } catch {
      // ignore
    }

    return {
      heapSpaces,
      resourceUsage,
    };
  }

  /**
   * Aggregate Web Vitals (LCP, FCP, CLS, TTFB) with P75, averages, and ratings
   */
  getWebVitalsSummary() {
    const summary = {};
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fcp: { good: 1800, poor: 3000 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
    };

    for (const [key, values] of Object.entries(this.webStats.webVitals)) {
      if (!values || values.length === 0) {
        summary[key] = { count: 0, p75: 0, avg: 0, min: 0, max: 0, rating: 'NO_DATA' };
        continue;
      }
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const p75Index = Math.min(Math.floor(count * 0.75), count - 1);
      const p75 = sorted[p75Index];
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const avg = parseFloat((sum / count).toFixed(2));
      const min = sorted[0];
      const max = sorted[count - 1];

      let rating = 'GOOD';
      const t = thresholds[key];
      if (t) {
        if (p75 > t.poor) rating = 'POOR';
        else if (p75 > t.good) rating = 'NEEDS_IMPROVEMENT';
      }

      summary[key] = { count, p75, avg, min, max, rating };
    }
    return summary;
  }

  /**
   * Detailed Discord bot cache and channel breakdown
   */
  getDiscordCacheStats() {
    if (!this.discordClient) {
      return {
        channelsTotal: 0,
        textChannels: 0,
        voiceChannels: 0,
        threads: 0,
        rolesTotal: 0,
        emojisTotal: 0,
        stickersTotal: 0,
        approximateTotalMembers: 0,
      };
    }

    const client = this.discordClient;
    let channelsTotal = 0;
    let textChannels = 0;
    let voiceChannels = 0;
    let threads = 0;
    let rolesTotal = 0;
    let approximateTotalMembers = 0;

    if (client.guilds?.cache) {
      for (const guild of client.guilds.cache.values()) {
        approximateTotalMembers += guild.memberCount || 0;
        if (guild.channels?.cache) {
          for (const ch of guild.channels.cache.values()) {
            channelsTotal += 1;
            if (ch.isTextBased && typeof ch.isThread === 'function' && !ch.isThread()) {
              textChannels += 1;
            } else if (typeof ch.isVoiceBased === 'function' && ch.isVoiceBased()) {
              voiceChannels += 1;
            } else if (typeof ch.isThread === 'function' && ch.isThread()) {
              threads += 1;
            }
          }
        }
        if (guild.roles?.cache) {
          rolesTotal += guild.roles.cache.size;
        }
      }
    }

    return {
      channelsTotal,
      textChannels,
      voiceChannels,
      threads,
      rolesTotal,
      emojisTotal: client.emojis?.cache?.size || 0,
      stickersTotal: client.stickers?.cache?.size || 0,
      approximateTotalMembers,
    };
  }

  /**
   * Node.js runtime diagnostics (handles, requests, GC)
   */
  getNodeRuntimeStats() {
    let activeHandles = 0;
    let activeRequests = 0;

    try {
      if (typeof process._getActiveHandles === 'function') {
        activeHandles = process._getActiveHandles().length;
      }
    } catch {
      // ignore
    }

    try {
      if (typeof process._getActiveRequests === 'function') {
        activeRequests = process._getActiveRequests().length;
      }
    } catch {
      // ignore
    }

    return {
      activeHandles,
      activeRequests,
      gc: this.gcStats,
    };
  }

  /**
   * Generate complete telemetry snapshot for the dev panel
   */
  async getSnapshot() {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const [dbHealth, dbTables, redisHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.getDatabaseTableCounts(),
      this.checkRedisHealth(),
    ]);

    const assetCache = this.getAssetCacheStats();
    const v8Stats = this.getV8InternalStats();
    const runtime = this.getNodeRuntimeStats();
    const cacheStats = this.getDiscordCacheStats();
    const vitalsSummary = this.getWebVitalsSummary();

    // Top commands calculation
    const topCommands = Object.entries(this.commandStats.usageByCommand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Top users calculation
    const topUsers = Object.entries(this.commandStats.usageByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Top guilds calculation
    const topGuilds = Object.entries(this.commandStats.usageByGuild)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([guildId, count]) => ({ guildId, count }));

    // Cache hit ratio
    const totalCacheQueries = this.httpStats.cacheHits + this.httpStats.cacheMisses;
    const cacheHitRatio =
      totalCacheQueries > 0
        ? parseFloat(((this.httpStats.cacheHits / totalCacheQueries) * 100).toFixed(1))
        : 0;

    // External API availability
    const externalApiAvailability =
      this.externalApiStats.totalCalls > 0
        ? parseFloat(
            ((this.externalApiStats.successCalls / this.externalApiStats.totalCalls) * 100).toFixed(
              1
            )
          )
        : 100;

    return {
      timestamp: new Date().toISOString(),
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        cpuPercent: this.currentCpuPercent,
        cpuCores: this.cpuCores,
        eventLoopLagMs: this.eventLoopLagMs,
        eventLoopUtilizationPercent: this.eventLoopUtilizationPercent,
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        pid: process.pid,
        rates: {
          cpm: this.getRollingCpm(),
          rpm: this.getRollingRpm(),
        },
        bandwidth: {
          bytesReceivedKb: parseFloat((this.httpStats.bytesReceivedTotal / 1024).toFixed(1)),
          bytesSentKb: parseFloat((this.httpStats.bytesSentTotal / 1024).toFixed(1)),
        },
        memory: {
          rssMb: parseFloat((mem.rss / 1024 / 1024).toFixed(1)),
          heapUsedMb: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(1)),
          heapTotalMb: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(1)),
          externalMb: parseFloat((mem.external / 1024 / 1024).toFixed(1)),
          systemTotalMb: parseFloat((totalMem / 1024 / 1024).toFixed(1)),
          systemFreeMb: parseFloat((freeMem / 1024 / 1024).toFixed(1)),
          systemUsedMb: parseFloat((usedMem / 1024 / 1024).toFixed(1)),
        },
        timeSeriesSnapshots: this.snapshots,
        assetCache,
        v8Stats,
        runtime,
      },
      discord: {
        status: this.discordClient?.isReady() ? 'ready' : 'connecting',
        guildsCount: this.discordClient?.guilds?.cache?.size || 0,
        cachedUsersCount: this.discordClient?.users?.cache?.size || 0,
        wsPingMs: this.discordClient?.ws?.ping || 0,
        interactions: this.discordStats,
        cache: cacheStats,
        user: this.discordClient?.user
          ? {
              id: this.discordClient.user.id,
              tag: this.discordClient.user.tag,
            }
          : null,
      },
      commands: {
        total: this.commandStats.total,
        success: this.commandStats.success,
        failed: this.commandStats.failed,
        successRate:
          this.commandStats.total > 0
            ? parseFloat(((this.commandStats.success / this.commandStats.total) * 100).toFixed(1))
            : 100,
        avgDurationMs: this.commandStats.avgDurationMs,
        minDurationMs: this.commandStats.minDurationMs,
        maxDurationMs: this.commandStats.maxDurationMs,
        topCommands,
        topUsers,
        topGuilds,
        recent: this.commandStats.recent.slice(0, 30),
      },
      externalApi: {
        totalCalls: this.externalApiStats.totalCalls,
        successCalls: this.externalApiStats.successCalls,
        failedCalls: this.externalApiStats.failedCalls,
        availabilityPercent: externalApiAvailability,
        avgDurationMs: this.externalApiStats.avgDurationMs,
        byEndpoint: this.externalApiStats.byEndpoint,
        recentCalls: this.externalApiStats.recentCalls.slice(0, 15),
      },
      http: {
        totalRequests: this.httpStats.totalRequests,
        avgDurationMs: this.httpStats.avgDurationMs,
        statusCodes: this.httpStats.statusCodes,
        cacheHits: this.httpStats.cacheHits,
        cacheMisses: this.httpStats.cacheMisses,
        cacheHitRatioPercent: cacheHitRatio,
        bytesReceivedTotal: this.httpStats.bytesReceivedTotal,
        bytesSentTotal: this.httpStats.bytesSentTotal,
        requestsByRoute: this.httpStats.requestsByRoute,
        slowRequests: this.httpStats.slowRequests.slice(0, 10),
        recentRequests: this.httpStats.recentRequests.slice(0, 20),
      },
      websocket: this.wsStats,
      security: this.securityStats,
      web: {
        pageViewsTotal: this.webStats.pageViewsTotal,
        clientErrorsTotal: this.webStats.clientErrorsTotal,
        activeVisitors: this.getActiveWebVisitorsCount(),
        devices: this.webStats.devices,
        browsers: this.webStats.browsers,
        operatingSystems: this.webStats.operatingSystems,
        rateLimitsTriggered: this.webStats.rateLimitsTriggered,
        vitalsSummary,
        topRoutes: Object.entries(this.webStats.pageViewsByRoute)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([route, count]) => ({ route, count })),
        recentErrors: this.webStats.recentErrors.slice(0, 15),
        recentEvents: this.webStats.recentEvents.slice(0, 20),
      },
      services: this.services,
      database: {
        ...dbHealth,
        tables: dbTables.tables || dbTables,
        summary: dbTables.summary || null,
        pool: dbTables.pool || null,
      },
      redis: redisHealth,
    };
  }
}

const telemetry = new TelemetryManager();

module.exports = {
  TelemetryManager,
  telemetry,
};
