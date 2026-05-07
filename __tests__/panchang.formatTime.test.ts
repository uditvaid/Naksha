/**
 * Regression: formatLocalTime must respect the timezone embedded in the
 * ISO string, NOT the device's local timezone. The previous implementation
 * used `Date.getHours()` which converted to whatever TZ the runtime was
 * in, so a Faridabad birth-coords user running the sim from EDT saw
 * 11:50 AM IST rendered as 2:20 AM EDT — a 9.5-hour silent shift.
 */

import { formatLocalTime } from '../src/lib/panchang';

describe('formatLocalTime', () => {
  test('renders IST-anchored timestamp as IST regardless of device TZ', () => {
    // Abhijit Muhurat for Faridabad on 2026-05-07 — should always show
    // 11:50 AM no matter where the runtime is.
    expect(formatLocalTime('2026-05-07T11:50:55+05:30')).toBe('11:50 AM');
  });

  test('renders pre-dawn IST time as 4:03 AM (Brahma Muhurat)', () => {
    expect(formatLocalTime('2026-05-07T04:03:36+05:30')).toBe('4:03 AM');
  });

  test('renders afternoon IST time as PM (Rahu Kalam)', () => {
    expect(formatLocalTime('2026-05-07T13:56:48+05:30')).toBe('1:56 PM');
  });

  test('handles UTC offset other than +05:30', () => {
    // PST: 14:30 -08:00 should still render as 2:30 PM (PST is the
    // anchor, not the device TZ).
    expect(formatLocalTime('2026-05-07T14:30:00-08:00')).toBe('2:30 PM');
  });

  test('handles Z (UTC) suffix', () => {
    expect(formatLocalTime('2026-05-07T09:00:00Z')).toBe('9:00 AM');
  });

  test('returns empty string for malformed input', () => {
    expect(formatLocalTime('')).toBe('');
    expect(formatLocalTime('not a date')).toBe('');
  });

  test('renders midnight as 12:00 AM, noon as 12:00 PM', () => {
    expect(formatLocalTime('2026-05-07T00:00:00+05:30')).toBe('12:00 AM');
    expect(formatLocalTime('2026-05-07T12:00:00+05:30')).toBe('12:00 PM');
  });
});
