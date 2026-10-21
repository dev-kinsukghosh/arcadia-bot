const {
  isMaintenanceActive,
  getMaintenanceReason,
  getMaintenanceDetails,
  setMaintenance,
  isDevUser,
  isDevRequest,
  maintenanceMiddleware,
  generateMaintenanceHtml,
} = require('../src/utils/maintenanceHelper.js');

describe('Maintenance Mode Helper Suite', () => {
  const originalDevId = process.env.DEV_ID;
  const originalDevSecret = process.env.DEV_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.DEV_ID = '123456789012345678,987654321098765432';
    process.env.DEV_SECRET = 'supersecretdevkey123';
    process.env.NODE_ENV = 'production';
  });

  afterEach(async () => {
    await setMaintenance(false, '', 'TestRunner');
    process.env.DEV_ID = originalDevId;
    process.env.DEV_SECRET = originalDevSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should identify developer Discord user IDs correctly', () => {
    expect(isDevUser('123456789012345678')).toBe(true);
    expect(isDevUser('987654321098765432')).toBe(true);
    expect(isDevUser('111111111111111111')).toBe(false);
    expect(isDevUser('')).toBe(false);
    expect(isDevUser(null)).toBe(false);
  });

  it('should identify developer HTTP requests via tokens, query params, and headers', () => {
    // Via x-dev-token
    expect(
      isDevRequest({
        headers: { 'x-dev-token': 'supersecretdevkey123' },
      })
    ).toBe(true);

    // Via Bearer token
    expect(
      isDevRequest({
        headers: { authorization: 'Bearer supersecretdevkey123' },
      })
    ).toBe(true);

    // Via query param ?key=
    expect(
      isDevRequest({
        headers: {},
        query: { key: 'supersecretdevkey123' },
      })
    ).toBe(true);

    // Via DEV_ID token
    expect(
      isDevRequest({
        headers: {},
        query: { key: '123456789012345678' },
      })
    ).toBe(true);

    // Unauthorized request
    expect(
      isDevRequest({
        headers: {},
        query: { key: 'invalid_token' },
      })
    ).toBe(false);

    expect(
      isDevRequest({
        headers: {},
      })
    ).toBe(false);
  });

  it('should toggle maintenance mode on and off with custom reason', async () => {
    expect(isMaintenanceActive()).toBe(false);

    // Activate maintenance
    const activeDetails = await setMaintenance(true, 'Database migration in progress', 'Dev#1234');
    expect(isMaintenanceActive()).toBe(true);
    expect(getMaintenanceReason()).toBe('Database migration in progress');
    expect(activeDetails.enabled).toBe(true);
    expect(activeDetails.updatedBy).toBe('Dev#1234');

    // Deactivate maintenance
    const deactivatedDetails = await setMaintenance(false, '', 'Dev#1234');
    expect(isMaintenanceActive()).toBe(false);
    expect(getMaintenanceReason()).toBe('');
    expect(deactivatedDetails.enabled).toBe(false);
  });

  it('should generate valid maintenance HTML containing title and reason', () => {
    const html = generateMaintenanceHtml('Scheduled hardware maintenance');
    expect(html).toContain('Maintenance Active');
    expect(html).toContain('Scheduled hardware maintenance');

    const operationalHtml = generateMaintenanceHtml({ active: false });
    expect(operationalHtml).toContain('System Operational');
  });

  it('maintenanceMiddleware should pass next() when maintenance is inactive', () => {
    let nextCalled = false;
    const req = { method: 'GET', path: '/api/status', headers: {} };
    const res = {};
    const next = () => {
      nextCalled = true;
    };

    maintenanceMiddleware(req, res, next);
    expect(nextCalled).toBe(true);
  });

  it('maintenanceMiddleware should return 403 JSON for non-dev API requests during maintenance', async () => {
    await setMaintenance(true, 'Emergency bug patch', 'DevAdmin');

    let statusCode = null;
    let jsonResponse = null;

    const req = {
      method: 'GET',
      path: '/api/currencies',
      headers: {},
      accepts: () => false,
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    let nextCalled = false;
    maintenanceMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonResponse).toBeDefined();
    expect(jsonResponse.maintenance).toBe(true);
    expect(jsonResponse.reason).toBe('Emergency bug patch');
  });

  it('maintenanceMiddleware should allow developers to pass through during maintenance', async () => {
    await setMaintenance(true, 'Emergency maintenance', 'DevAdmin');

    let nextCalled = false;
    const req = {
      method: 'GET',
      path: '/api/currencies',
      headers: { 'x-dev-token': 'supersecretdevkey123' },
    };
    const res = {};
    const next = () => {
      nextCalled = true;
    };

    maintenanceMiddleware(req, res, next);
    expect(nextCalled).toBe(true);
  });
});
