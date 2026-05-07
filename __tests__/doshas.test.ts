/**
 * Unit tests for the Kalsarpa detector.
 *
 * Kalsarpa Yoga: all 7 visible planets between Rahu and Ketu on one
 * forward arc of the zodiac. Partial Kalsarpa: same shape on the
 * backward arc. Anything else: not present.
 */

import { detectKalsarpa } from '../src/lib/doshas';
import type { PlanetPosition } from '../src/store/userStore';

function planet(name: string, signIndex: number, degree: number, house = 1): PlanetPosition {
  return {
    planet: name,
    sign: 'Aries',
    signIndex,
    degree,
    house,
    nakshatra: 'Ashwini',
    pada: 1,
    isRetrograde: false,
    isExalted: false,
    isDebilitated: false,
  };
}

describe('detectKalsarpa', () => {
  test('classic forward Kalsarpa: all visible planets between Rahu→Ketu going forward', () => {
    // Rahu at 0° Aries (long=0). Ketu at 0° Libra (long=180).
    // All 7 visible planets between long 1 and 179 → forward Kalsarpa.
    const planets: PlanetPosition[] = [
      planet('Rahu', 0, 0, 1),
      planet('Ketu', 6, 0, 7),
      planet('Sun', 0, 15, 1),
      planet('Moon', 1, 10, 2),
      planet('Mars', 2, 20, 3),
      planet('Mercury', 3, 5, 4),
      planet('Jupiter', 4, 12, 5),
      planet('Venus', 5, 8, 6),
      planet('Saturn', 5, 25, 6),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(true);
    expect(result.isPartial).toBe(false);
    expect(result.rahuHouse).toBe(1);
    expect(result.subTypeSanskrit).toBe('Anant Kalsarpa');
  });

  test('partial Kalsarpa: all visible planets on the backward arc', () => {
    // Rahu at 0° Aries (long=0). All 7 visible between long 181 and 359.
    const planets: PlanetPosition[] = [
      planet('Rahu', 0, 0, 4),
      planet('Ketu', 6, 0, 10),
      planet('Sun', 6, 20, 7),
      planet('Moon', 7, 15, 8),
      planet('Mars', 8, 10, 9),
      planet('Mercury', 9, 5, 10),
      planet('Jupiter', 10, 12, 11),
      planet('Venus', 11, 8, 12),
      planet('Saturn', 11, 28, 12),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(true);
    expect(result.isPartial).toBe(true);
    expect(result.rahuHouse).toBe(4);
    expect(result.subTypeSanskrit).toBe('Shankhpal Kalsarpa');
  });

  test('not Kalsarpa: planets straddle the axis', () => {
    // Some forward, some backward → no Kalsarpa.
    const planets: PlanetPosition[] = [
      planet('Rahu', 0, 0, 1),
      planet('Ketu', 6, 0, 7),
      planet('Sun', 0, 15, 1),    // forward (15°)
      planet('Moon', 7, 10, 8),   // backward (220°)
      planet('Mars', 2, 20, 3),
      planet('Mercury', 3, 5, 4),
      planet('Jupiter', 4, 12, 5),
      planet('Venus', 5, 8, 6),
      planet('Saturn', 5, 25, 6),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(false);
    expect(result.isPartial).toBe(false);
    expect(result.rahuHouse).toBeNull();
  });

  test('returns no-dosha when Rahu is missing from the chart', () => {
    const planets: PlanetPosition[] = [
      planet('Sun', 0, 15, 1),
      planet('Moon', 1, 10, 2),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(false);
  });

  test('returns no-dosha when fewer than 7 visible planets are present', () => {
    const planets: PlanetPosition[] = [
      planet('Rahu', 0, 0, 1),
      planet('Sun', 0, 15, 1),
      planet('Moon', 1, 10, 2),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(false);
  });

  test('subType cycles through 12 houses correctly', () => {
    // Rahu in 7th house → Takshak Kalsarpa
    const planets: PlanetPosition[] = [
      planet('Rahu', 6, 0, 7),
      planet('Ketu', 0, 0, 1),
      planet('Sun', 6, 20, 7),
      planet('Moon', 7, 15, 8),
      planet('Mars', 8, 10, 9),
      planet('Mercury', 9, 5, 10),
      planet('Jupiter', 10, 12, 11),
      planet('Venus', 11, 8, 12),
      planet('Saturn', 11, 28, 12),
    ];
    const result = detectKalsarpa(planets);
    expect(result.hasDosha).toBe(true);
    expect(result.rahuHouse).toBe(7);
    expect(result.subTypeSanskrit).toBe('Takshak Kalsarpa');
  });
});
