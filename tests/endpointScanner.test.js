const { generateMinecraftWordlist } = require('../src/utils/minecraftWordlist.js');

describe('Endpoint Scanner & Wordlist Suite', () => {
  it('should generate a wordlist of 10000 candidate paths', () => {
    const list = generateMinecraftWordlist();
    expect(list).toBeDefined();
    expect(list.length).toBe(10000);
    expect(list[0]).toMatch(/^/);
  });

  it('should contain Minecraft & server specific path candidates', () => {
    const list = generateMinecraftWordlist();
    const hasTowny = list.some((item) => item.includes('towny'));
    const hasEconomy = list.some((item) => item.includes('economy') || item.includes('currency'));
    const hasPlayers = list.some((item) => item.includes('player'));

    expect(hasTowny).toBe(true);
    expect(hasEconomy).toBe(true);
    expect(hasPlayers).toBe(true);
  });
});
