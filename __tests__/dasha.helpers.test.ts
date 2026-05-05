/**
 * Tests for time-derived dasha helpers added in the isActive-staleness fix.
 *
 * These helpers replaced ~16 sites that used to read a frozen `dasha.isActive`
 * field; they're now the only source of truth for "what dasha is active right
 * now?". A regression here goes undetected until users notice wrong dasha
 * labels, so lock in the behavior.
 */

import { calculateVimshottariDasha, findActiveDasha, findActiveAntardasha } from '../src/utils/vedic';

const dashas = calculateVimshottariDasha(58.28, new Date('1989-06-04T10:39:00Z'));

describe('findActiveDasha', () => {
  test('resolves Jupiter mahadasha on 2026-05-05', () => {
    expect(findActiveDasha(dashas, new Date('2026-05-05T12:00:00Z'))?.planet).toBe('Jupiter');
  });

  test('resolves Mars mahadasha early in the sequence', () => {
    expect(findActiveDasha(dashas, new Date('1990-01-01T00:00:00Z'))?.planet).toBe('Mars');
  });

  test('resolves Saturn mahadasha post-2027', () => {
    expect(findActiveDasha(dashas, new Date('2030-01-01T00:00:00Z'))?.planet).toBe('Saturn');
  });

  test('returns undefined before sequence start', () => {
    expect(findActiveDasha(dashas, new Date('1985-01-01T00:00:00Z'))).toBeUndefined();
  });

  test('returns undefined for empty / undefined input', () => {
    expect(findActiveDasha(undefined)).toBeUndefined();
    expect(findActiveDasha([])).toBeUndefined();
  });
});

describe('antardasha computation', () => {
  test('every mahadasha has exactly 9 antardashas', () => {
    dashas.forEach((d) => expect(d.antardasha?.length).toBe(9));
  });

  test('antardasha planets follow the cycle starting from the mahadasha lord', () => {
    const ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    dashas.forEach((d) => {
      const startIdx = ORDER.indexOf(d.planet);
      d.antardasha!.forEach((a, i) => {
        expect(a.planet).toBe(ORDER[(startIdx + i) % 9]);
      });
    });
  });

  test('antardasha lengths sum to mahadasha length', () => {
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
    dashas.forEach((d) => {
      const totalAntar = d.antardasha!.reduce((sum, a) => {
        return sum + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / MS_PER_YEAR;
      }, 0);
      expect(Math.abs(totalAntar - d.years)).toBeLessThan(0.001);
    });
  });

  test('boundaries align: first antar starts at mahadasha start, last ends at mahadasha end', () => {
    dashas.forEach((d) => {
      expect(d.antardasha![0]!.startDate).toBe(d.startDate);
      const lastEnd = new Date(d.antardasha![d.antardasha!.length - 1]!.endDate).getTime();
      const dashaEnd = new Date(d.endDate).getTime();
      expect(Math.abs(lastEnd - dashaEnd)).toBeLessThan(1000);
    });
  });
});

describe('findActiveAntardasha', () => {
  test('resolves Jup-Rahu sub-period on 2026-05-05', () => {
    // Jupiter mahadasha runs 2011-10-30 → 2027-10-30. The 9 antardashas
    // (Jup→Sat→Merc→Ket→Ven→Sun→Moon→Mars→Rahu) put Jup-Rahu as the active
    // sub-period in mid-2026. This test pins the expectation so any future
    // refactor of the antardasha math gets caught.
    const jupiter = findActiveDasha(dashas, new Date('2026-05-05T12:00:00Z'))!;
    const active = findActiveAntardasha(jupiter.antardasha, new Date('2026-05-05T12:00:00Z'));
    expect(active?.planet).toBe('Rahu');
  });

  test('returns undefined for empty / undefined antardasha array', () => {
    expect(findActiveAntardasha(undefined)).toBeUndefined();
    expect(findActiveAntardasha([])).toBeUndefined();
  });
});
