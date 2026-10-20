import { describe, it, expect, beforeEach } from 'vitest';
const { LogBuffer } = require('../src/utils/logBuffer.js');
const { TelemetryManager } = require('../src/utils/telemetry.js');

describe('LogBuffer Utility', () => {
  let buffer;

  beforeEach(() => {
    buffer = new LogBuffer(10);
  });

  it('should initialize with correct default stats', () => {
    const stats = buffer.getStats();
    expect(stats.total).toBe(0);
    expect(stats.bufferedCount).toBe(0);
    expect(stats.capacity).toBe(10);
  });

  it('should add and strip ANSI from log messages', () => {
    const entry = buffer.addLog('INFO', '\u001b[32mTest Green Message\u001b[0m');
    expect(entry.level).toBe('INFO');
    expect(entry.message).toBe('Test Green Message');
    expect(entry.id).toBe(1);

    const stats = buffer.getStats();
    expect(stats.total).toBe(1);
    expect(stats.INFO).toBe(1);
  });

  it('should filter logs by level and search query', () => {
    buffer.addLog('INFO', 'Server started successfully');
    buffer.addLog('WARNING', 'High memory usage detected');
    buffer.addLog('ERROR', 'Database connection refused');

    const errorLogs = buffer.getLogs({ level: 'ERROR' });
    expect(errorLogs.total).toBe(1);
    expect(errorLogs.logs[0].message).toContain('Database connection refused');

    const searchLogs = buffer.getLogs({ search: 'memory' });
    expect(searchLogs.total).toBe(1);
    expect(searchLogs.logs[0].message).toContain('High memory usage');
  });

  it('should respect maximum capacity and shift oldest entries', () => {
    for (let i = 1; i <= 15; i++) {
      buffer.addLog('INFO', `Log #${i}`);
    }
    const stats = buffer.getStats();
    expect(stats.total).toBe(15);
    expect(stats.bufferedCount).toBe(10);

    const all = buffer.getLogs({ limit: 10, order: 'asc' });
    expect(all.logs[0].message).toBe('Log #6');
    expect(all.logs[all.logs.length - 1].message).toBe('Log #15');
  });
});

describe('TelemetryManager Utility', () => {
  let telemetry;

  beforeEach(() => {
    telemetry = new TelemetryManager();
  });

  it('should record command executions and update latency statistics', () => {
    telemetry.recordCommandExecution({
      commandName: 'ping',
      userId: '123456789',
      userTag: 'Developer#0001',
      guildId: '987654321',
      guildName: 'Dev Server',
      durationMs: 45,
      success: true,
    });

    telemetry.recordCommandExecution({
      commandName: 'ping',
      userId: '123456789',
      userTag: 'Developer#0001',
      guildId: '987654321',
      guildName: 'Dev Server',
      durationMs: 55,
      success: true,
    });

    expect(telemetry.commandStats.total).toBe(2);
    expect(telemetry.commandStats.success).toBe(2);
    expect(telemetry.commandStats.avgDurationMs).toBe(50);
    expect(telemetry.commandStats.usageByCommand.ping).toBe(2);
    expect(telemetry.commandStats.recent.length).toBe(2);
  });

  it('should record web frontend events and track active sessions', () => {
    telemetry.recordWebEvent({
      type: 'pageview',
      path: '/currencies',
      sessionId: 'session_abc',
    });

    telemetry.recordWebEvent({
      type: 'error',
      path: '/towny',
      error: 'Uncaught TypeError: network fail',
      sessionId: 'session_abc',
    });

    expect(telemetry.webStats.pageViewsTotal).toBe(1);
    expect(telemetry.webStats.clientErrorsTotal).toBe(1);
    expect(telemetry.webStats.pageViewsByRoute['/currencies']).toBe(1);
    expect(telemetry.getActiveWebVisitorsCount()).toBe(1);
  });

  it('should track background sync service runs', () => {
    telemetry.recordServiceRun('ConvoySync', {
      durationMs: 120,
      success: true,
      itemsCount: 15,
    });

    expect(telemetry.services.ConvoySync.status).toBe('healthy');
    expect(telemetry.services.ConvoySync.runs).toBe(1);
    expect(telemetry.services.ConvoySync.durationMs).toBe(120);
    expect(telemetry.services.ConvoySync.itemsCount).toBe(15);
  });

  it('should track external ArcadiaMC API call latencies and success rates', () => {
    telemetry.recordExternalApiCall({
      method: 'GET',
      url: 'https://api.arcadiamc.top/currencies',
      status: 200,
      durationMs: 85,
      success: true,
    });

    telemetry.recordExternalApiCall({
      method: 'GET',
      url: 'https://api.arcadiamc.top/currencies',
      status: 502,
      durationMs: 115,
      success: false,
      error: 'Bad Gateway',
    });

    expect(telemetry.externalApiStats.totalCalls).toBe(2);
    expect(telemetry.externalApiStats.successCalls).toBe(1);
    expect(telemetry.externalApiStats.failedCalls).toBe(1);
    expect(telemetry.externalApiStats.avgDurationMs).toBe(100);
    expect(telemetry.externalApiStats.byEndpoint['/currencies'].count).toBe(2);
    expect(telemetry.externalApiStats.recentCalls.length).toBe(2);
  });

  it('should track Discord buttons, autocompletes, and cooldown blocks', () => {
    telemetry.recordButtonClick('nav_next', 'nav_page');
    telemetry.recordAutocomplete('towny');
    telemetry.recordCooldownHit('exchange', '123456');
    telemetry.recordBlacklistBlock('999999');

    expect(telemetry.discordStats.interactionsTotal).toBe(2);
    expect(telemetry.discordStats.buttonClicksTotal).toBe(1);
    expect(telemetry.discordStats.autocompleteTotal).toBe(1);
    expect(telemetry.discordStats.cooldownBlocksTotal).toBe(1);
    expect(telemetry.discordStats.blacklistBlocksTotal).toBe(1);
  });

  it('should track Discord REST rate limits and Gateway dispatch events', () => {
    telemetry.recordDiscordRateLimit({ route: '/channels/123/messages', retryAfter: 1500, global: false });
    telemetry.recordGatewayEvent('INTERACTION_CREATE');
    telemetry.recordGatewayEvent('MESSAGE_CREATE');

    expect(telemetry.discordStats.rateLimitsTotal).toBe(1);
    expect(telemetry.discordStats.rateLimitsByRoute['/channels/123/messages']).toBe(1);
    expect(telemetry.discordStats.gateway.eventsTotal).toBe(2);
    expect(telemetry.discordStats.gateway.eventsByType['INTERACTION_CREATE']).toBe(1);
  });

  it('should track WebSocket connection, disconnections, and message throughput', () => {
    telemetry.recordWsConnection();
    telemetry.recordWsConnection();
    telemetry.recordWsMessage('sent');
    telemetry.recordWsMessage('received');
    telemetry.recordWsDisconnection();

    expect(telemetry.wsStats.connectedClients).toBe(1);
    expect(telemetry.wsStats.peakClients).toBe(2);
    expect(telemetry.wsStats.messagesSentTotal).toBe(1);
    expect(telemetry.wsStats.messagesReceivedTotal).toBe(1);
    expect(telemetry.wsStats.disconnectionsTotal).toBe(1);
  });

  it('should track unauthorized access attempts to protected panel endpoints', () => {
    telemetry.recordUnauthorizedAccess({ ip: '1.2.3.4', path: '/api/dev/telemetry', method: 'GET' });

    expect(telemetry.securityStats.unauthorizedAttemptsTotal).toBe(1);
    expect(telemetry.securityStats.recentUnauthorized.length).toBe(1);
    expect(telemetry.securityStats.recentUnauthorized[0].ip).toBe('1.2.3.4');
  });

  it('should calculate rolling CPM and RPM rates', () => {
    telemetry.commandTimestamps.push(Date.now(), Date.now());
    telemetry.requestTimestamps.push(Date.now(), Date.now(), Date.now());

    expect(telemetry.getRollingCpm()).toBe(2);
    expect(telemetry.getRollingRpm()).toBe(3);
  });

  it('should aggregate Core Web Vitals with ratings', () => {
    telemetry.recordWebEvent({
      type: 'vital',
      vital: { metric: 'LCP', value: 1500 },
    });
    telemetry.recordWebEvent({
      type: 'vital',
      vital: { metric: 'LCP', value: 2000 },
    });

    const summary = telemetry.getWebVitalsSummary();
    expect(summary.lcp).toBeDefined();
    expect(summary.lcp.count).toBe(2);
    expect(summary.lcp.rating).toBe('GOOD');
  });

  it('should track Garbage Collection pause events and runtime handles', () => {
    telemetry.recordGcRun({ kind: 2, durationMs: 4.5 });

    expect(telemetry.gcStats.totalRuns).toBe(1);
    expect(telemetry.gcStats.totalDurationMs).toBe(4.5);
    expect(telemetry.gcStats.maxDurationMs).toBe(4.5);
    expect(telemetry.gcStats.byType['Major (Mark-Sweep)']).toBe(1);

    const runtime = telemetry.getNodeRuntimeStats();
    expect(runtime.gc).toBeDefined();
    expect(runtime.activeHandles).toBeGreaterThanOrEqual(0);
    expect(runtime.activeRequests).toBeGreaterThanOrEqual(0);
  });

  it('should generate a comprehensive telemetry snapshot with deep metrics', async () => {
    const snapshot = await telemetry.getSnapshot();
    expect(snapshot.system).toBeDefined();
    expect(snapshot.system.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.system.assetCache).toBeDefined();
    expect(snapshot.system.v8Stats).toBeDefined();
    expect(snapshot.system.runtime).toBeDefined();
    expect(snapshot.system.rates).toBeDefined();
    expect(snapshot.system.bandwidth).toBeDefined();
    expect(snapshot.discord).toBeDefined();
    expect(snapshot.discord.interactions).toBeDefined();
    expect(snapshot.discord.cache).toBeDefined();
    expect(snapshot.commands).toBeDefined();
    expect(snapshot.externalApi).toBeDefined();
    expect(snapshot.externalApi.availabilityPercent).toBeDefined();
    expect(snapshot.http).toBeDefined();
    expect(snapshot.http.requestsByRoute).toBeDefined();
    expect(snapshot.websocket).toBeDefined();
    expect(snapshot.security).toBeDefined();
    expect(snapshot.web).toBeDefined();
    expect(snapshot.web.vitalsSummary).toBeDefined();
    expect(snapshot.services).toBeDefined();
    expect(snapshot.database).toBeDefined();
    expect(snapshot.redis).toBeDefined();
  });
});


