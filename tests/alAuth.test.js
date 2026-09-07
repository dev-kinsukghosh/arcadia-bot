const { getAlAuthorizedRoles, isAlAuthorized } = require('../src/utils/alAuthHelper.js');
const { connection } = require('../src/utils/db.js');

describe('Al-Sam Role Authorization Suite', () => {
  afterAll(async () => {
    if (connection) {
      await connection.end().catch(() => {});
    }
  });

  it('should return default authorized role IDs', async () => {
    const roles = await getAlAuthorizedRoles();
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
    expect(roles).toContain('1545866847344267404');
  });

  it('should authorize developer user IDs via bypass', async () => {
    const devId = (process.env.DEV_ID || '').split(',')[0].trim();
    if (devId) {
      const mockInteraction = {
        user: { id: devId },
        member: null,
      };
      const authorized = await isAlAuthorized(mockInteraction);
      expect(authorized).toBe(true);
    }
  });

  it('should deny unauthorized user without matching roles', async () => {
    const mockInteraction = {
      user: { id: '999999999999999999' },
      member: {
        roles: {
          cache: new Map([['111111111111111111', { id: '111111111111111111' }]]),
        },
      },
    };
    const authorized = await isAlAuthorized(mockInteraction);
    expect(authorized).toBe(false);
  });

  it('should authorize user possessing an allowed role ID', async () => {
    const roles = await getAlAuthorizedRoles();
    const targetRole = roles[0];

    const mockInteraction = {
      user: { id: '999999999999999999' },
      member: {
        roles: {
          cache: new Map([[targetRole, { id: targetRole }]]),
        },
      },
    };
    const authorized = await isAlAuthorized(mockInteraction);
    expect(authorized).toBe(true);
  });
});
