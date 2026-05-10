/**
 * Unit tests for buildAffirmationContext.
 *
 * Composer is deterministic — same inputs always produce the same
 * paragraphs. These tests lock down the lookup tables and the graceful-
 * fallback paths so a renamed nakshatra or a missing panchang doesn't
 * silently produce an empty modal.
 */

import { buildAffirmationContext } from '../src/lib/affirmationContext';
import type { PanchangData } from '../src/services/prokerala';

const SUNDAY_NOON_MS = new Date('2026-05-10T12:00:00').getTime();

function fakePanchang(overrides: Partial<PanchangData> = {}): PanchangData {
  return {
    vaara: 'Sunday',
    nakshatra: [{ id: 23, name: 'Dhanishta', lord: 'Mars', start: '2026-05-10T00:00:00', end: '2026-05-11T00:00:00' }],
    tithi: [{ name: 'Ashtami', paksha: 'Krishna Paksha', start: '2026-05-10T00:00:00', end: '2026-05-11T00:00:00' }],
    yoga: [],
    karana: [],
    sunrise: '',
    sunset: '',
    moonrise: '',
    moonset: '',
    date: '2026-05-10',
    ...overrides,
  };
}

describe('buildAffirmationContext', () => {
  test('Sunday + Dhanishta + waning + Jupiter mahadasha — full happy path', () => {
    const ctx = buildAffirmationContext(fakePanchang(), 'Jupiter', SUNDAY_NOON_MS);
    expect(ctx.whyToday).toContain('Sunday is ruled by Sun');
    expect(ctx.whyToday).toContain('Moon is in Dhanishta');
    expect(ctx.whyToday).toContain('rhythm');
    expect(ctx.whyToday).toContain('releasing'); // waning paksha
    expect(ctx.currentChapter).toContain('Jupiter');
    expect(ctx.currentChapter).toContain('expansion');
  });

  test('waxing paksha switches the moon-direction sentence', () => {
    const ctx = buildAffirmationContext(
      fakePanchang({ tithi: [{ name: 'Tritiya', paksha: 'Shukla Paksha', start: '2026-05-10T00:00:00', end: '2026-05-11T00:00:00' }] }),
      undefined,
      SUNDAY_NOON_MS,
    );
    expect(ctx.whyToday).toContain('growing');
    expect(ctx.whyToday).not.toContain('releasing');
  });

  test('different weekday gets a different ruler line', () => {
    const ctx = buildAffirmationContext(
      fakePanchang({ vaara: 'Saturday' }),
      undefined,
      SUNDAY_NOON_MS,
    );
    expect(ctx.whyToday).toContain('Saturday is ruled by Saturn');
  });

  test('null panchang falls back to a generic line', () => {
    const ctx = buildAffirmationContext(null, undefined, SUNDAY_NOON_MS);
    expect(ctx.whyToday.length).toBeGreaterThan(20);
    // No nakshatra-specific phrasing when panchang is null
    expect(ctx.whyToday).not.toContain('Moon is in');
    expect(ctx.currentChapter).toBeNull();
  });

  test('missing dasha lord — currentChapter is null but whyToday still composes', () => {
    const ctx = buildAffirmationContext(fakePanchang(), undefined, SUNDAY_NOON_MS);
    expect(ctx.currentChapter).toBeNull();
    expect(ctx.whyToday).toContain('Sunday');
  });

  test('unknown nakshatra is skipped without breaking the line', () => {
    const ctx = buildAffirmationContext(
      fakePanchang({ nakshatra: [{ id: 999, name: 'Unknown', lord: 'X', start: '2026-05-10T00:00:00', end: '2026-05-11T00:00:00' }] }),
      undefined,
      SUNDAY_NOON_MS,
    );
    expect(ctx.whyToday).toContain('Sunday is ruled by Sun');
    expect(ctx.whyToday).not.toContain('Unknown');
  });

  test('every weekday ruler maps to a non-empty theme', () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const vaara of days) {
      const ctx = buildAffirmationContext(fakePanchang({ vaara }), undefined, SUNDAY_NOON_MS);
      expect(ctx.whyToday.length).toBeGreaterThan(20);
      expect(ctx.whyToday).toContain(vaara);
    }
  });

  test('every supported mahadasha lord produces a chapter', () => {
    const lords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    for (const lord of lords) {
      const ctx = buildAffirmationContext(fakePanchang(), lord, SUNDAY_NOON_MS);
      expect(ctx.currentChapter).not.toBeNull();
      expect(ctx.currentChapter).toContain(lord);
    }
  });
});
