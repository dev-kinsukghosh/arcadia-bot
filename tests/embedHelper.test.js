const {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  EMBED_COLORS,
} = require('../src/utils/embedHelper.js');
const { EmbedBuilder } = require('discord.js');

describe('Embed Helper Utility', () => {
  it('should export correct EMBED_COLORS', () => {
    expect(EMBED_COLORS).toBeDefined();
    expect(EMBED_COLORS.CYBER).toBe(0x4f1f7d);
    expect(EMBED_COLORS.SUCCESS).toBe(0x2ecc71);
    expect(EMBED_COLORS.ERROR).toBe(0xe74c3c);
  });

  it('should create a valid base embed with global header/footer', () => {
    const embed = createBaseEmbed();
    expect(embed).toBeInstanceOf(EmbedBuilder);
    const data = embed.toJSON();
    expect(data.color).toBe(EMBED_COLORS.CYBER);
    expect(data.author.name).toBe('ArcadiaMC Network Bot');
    expect(data.footer.text).toContain('ArcadiaMC Community bot');
  });

  it('should create a correctly styled success embed', () => {
    const embed = successEmbed('Test Title', 'Test Description');
    expect(embed).toBeInstanceOf(EmbedBuilder);
    const data = embed.toJSON();
    expect(data.color).toBe(EMBED_COLORS.SUCCESS);
    expect(data.title).toBe('✅ Test Title');
    expect(data.description).toBe('Test Description');
  });

  it('should create a correctly styled error embed', () => {
    const embed = errorEmbed('Error Title', 'Error Description');
    expect(embed).toBeInstanceOf(EmbedBuilder);
    const data = embed.toJSON();
    expect(data.color).toBe(EMBED_COLORS.ERROR);
    expect(data.title).toBe('❌ Error Title');
    expect(data.description).toBe('Error Description');
  });

  it('should create a correctly styled info embed', () => {
    const embed = infoEmbed('Info Title', 'Info Description');
    expect(embed).toBeInstanceOf(EmbedBuilder);
    const data = embed.toJSON();
    expect(data.color).toBe(EMBED_COLORS.INFO);
    expect(data.title).toBe('🔹 Info Title');
    expect(data.description).toBe('Info Description');
  });
});
