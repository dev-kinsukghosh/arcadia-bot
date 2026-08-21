const { db, connection } = require('../src/utils/db.js');
const { townyHistory } = require('../src/db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');
const { syncTowny } = require('../src/services/townySync.js');
const { arcadiaApi } = require('../src/utils/apiClient.js');

describe('Towny History Database Query Suite', () => {
  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  it('should successfully execute queries on the towny_history table', async () => {
    expect(db).toBeDefined();
    expect(connection).toBeDefined();

    // Query historical records (might be empty initially but must not throw)
    const records = await db.select().from(townyHistory);
    expect(records).toBeInstanceOf(Array);

    logger.success(
      `MySQL Drizzle Query: ${pc.bold(
        pc.green('OK')
      )} (Found ${records.length} towny history records in DB)`
    );

    // Insert dummy record to test insert/delete loop
    const testName = 'test_town_junit';
    const testDate = '2026-08-06';

    // Cleanup previous failures if any
    await db.delete(townyHistory).where(eq(townyHistory.name, testName));

    // Try insert
    await db.insert(townyHistory).values({
      name: testName,
      type: 'town',
      date: testDate,
      residents: 15,
      chunks: 120,
      townsCount: 0,
    });

    const result = await db.select().from(townyHistory).where(eq(townyHistory.name, testName));

    expect(result.length).toBe(1);
    expect(result[0].residents).toBe(15);
    expect(result[0].chunks).toBe(120);

    // Clean up
    await db.delete(townyHistory).where(eq(townyHistory.name, testName));

    const verifyCleanup = await db
      .select()
      .from(townyHistory)
      .where(eq(townyHistory.name, testName));
    expect(verifyCleanup.length).toBe(0);

    logger.success(`Verified CRUD operations on ${pc.bold('towny_history')} table successfully.`);
  });

  it('should sync towny data and preserve history for deleted towns/nations', async () => {
    // 1. Setup mock responses
    const mockData1 = {
      towns: [
        { name: 'ActiveTown1', residents: 10, claims: { claimedChunks: 50 } },
        { name: 'ActiveTown2', residents: 5, claims: { claimedChunks: 20 } },
      ],
      nations: [{ name: 'ActiveNation1', residents: 15, chunks: 70, towns: 2 }],
    };

    const mockData2 = {
      towns: [
        { name: 'ActiveTown1', residents: 12, claims: { claimedChunks: 55 } },
        // ActiveTown2 is now "deleted" (missing)
      ],
      nations: [{ name: 'ActiveNation1', residents: 12, chunks: 55, towns: 1 }],
    };

    // Spy/Mock getTowny
    const getTownySpy = vi.spyOn(arcadiaApi, 'getTowny');
    getTownySpy.mockResolvedValue(mockData1);

    // Clean up potential leftover test data
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activetown1'));
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activetown2'));
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activenation1'));

    // Initial sync
    await syncTowny();

    // Verify both towns exist in history
    const townsInDb1 = await db.select().from(townyHistory);
    const activeTown1Row = townsInDb1.find((t) => t.name === 'activetown1');
    const activeTown2Row = townsInDb1.find((t) => t.name === 'activetown2');
    const activeNation1Row = townsInDb1.find((t) => t.name === 'activenation1');

    expect(activeTown1Row).toBeDefined();
    expect(activeTown2Row).toBeDefined();
    expect(activeNation1Row).toBeDefined();

    // Now switch mock to data2 (ActiveTown2 is deleted)
    getTownySpy.mockResolvedValue(mockData2);

    // Sync again
    await syncTowny();

    // Verify ActiveTown2 history has NOT been pruned, and ActiveTown1 and ActiveNation1 remain
    const townsInDb2 = await db.select().from(townyHistory);
    const prunedTownRow = townsInDb2.find((t) => t.name === 'activetown2');
    const remainingTownRow = townsInDb2.find((t) => t.name === 'activetown1');
    const remainingNationRow = townsInDb2.find((t) => t.name === 'activenation1');

    expect(prunedTownRow).toBeDefined();
    expect(remainingTownRow).toBeDefined();
    expect(remainingNationRow).toBeDefined();

    // Clean up
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activetown1'));
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activetown2'));
    await db.delete(townyHistory).where(eq(townyHistory.name, 'activenation1'));

    getTownySpy.mockRestore();
    logger.success('Verified synchronization and history preservation logic successfully.');
  });
});
