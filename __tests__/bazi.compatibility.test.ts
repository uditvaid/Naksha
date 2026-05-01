import { getChineseCompatibility } from '@utils/bazi';

describe('getChineseCompatibility', () => {
  it('returns all required fields', () => {
    const m = getChineseCompatibility('1989-06-04', '1992-08-15');
    expect(m.yourZodiac).toBeTruthy();
    expect(m.partnerZodiac).toBeTruthy();
    expect(m.yourDayMaster).toBeTruthy();
    expect(m.partnerDayMaster).toBeTruthy();
    expect(m.zodiacLevel).toMatch(/best|good|neutral|challenging/);
    expect(m.elementInterplay).toMatch(/mirroring|nurturing|received|controlling|controlled|neutral/);
    expect(m.summary).toBeTruthy();
    expect(m.elementInterplayDescription).toBeTruthy();
  });

  it('correctly identifies Snake (1989) ↔ Monkey (1992) as challenging', () => {
    // 1989 is the Snake year, 1992 is the Monkey year, BAZI_COMPATIBILITY[Snake]
    // lists Monkey under challenging.
    const m = getChineseCompatibility('1989-06-04', '1992-08-15');
    expect(m.yourZodiac).toBe('Snake');
    expect(m.partnerZodiac).toBe('Monkey');
    expect(m.zodiacLevel).toBe('challenging');
  });

  it('correctly identifies Snake ↔ Ox (1985) as best (classic Ox-Snake-Rooster triad)', () => {
    const m = getChineseCompatibility('1989-06-04', '1985-03-10');
    expect(m.yourZodiac).toBe('Snake');
    expect(m.partnerZodiac).toBe('Ox');
    expect(m.zodiacLevel).toBe('best');
  });

  it('returns "neutral" for matching zodiacs (same animal)', () => {
    const m = getChineseCompatibility('1989-06-04', '1989-12-15');
    expect(m.yourZodiac).toBe(m.partnerZodiac);
    expect(m.zodiacLevel).toBe('neutral');
  });

  it('classifies element interplay correctly for mirroring', () => {
    // Same person — same day master → mirroring
    const m = getChineseCompatibility('2000-01-01', '2000-01-01');
    expect(m.yourDayElement).toBe(m.partnerDayElement);
    expect(m.elementInterplay).toBe('mirroring');
  });

  it('is symmetric in zodiac level (your-vs-theirs vs theirs-vs-yours)', () => {
    const a = getChineseCompatibility('1989-06-04', '1985-03-10');
    const b = getChineseCompatibility('1985-03-10', '1989-06-04');
    expect(a.zodiacLevel).toBe(b.zodiacLevel);
  });
});
