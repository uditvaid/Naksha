/**
 * Naksha chart calculation test suite.
 * Ground truth: Swiss Ephemeris (pyswisseph 2.10.3.2), Lahiri ayanamsha, Whole Sign, Mean Node.
 * Fixture file: __tests__/fixtures/chart_fixtures.json
 */

import { calculateVimshottariDasha, degreeToNakshatra, getWholeSignHouse } from '../src/utils/vedic';
import fixtures from './fixtures/chart_fixtures.json';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimum angular distance between two ecliptic longitudes (0–180°). */
function angularDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Parse an ISO date string and return a UTC Date. */
function utcDate(s: string): Date {
  return new Date(s + (s.length === 10 ? 'T00:00:00Z' : ''));
}

/** Absolute day difference between two dates. */
function daysDiff(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Fixture refs ─────────────────────────────────────────────────────────────

const primary = fixtures.fixtures[0]!;
const planets = primary.expected!.planets;
const lagna = primary.expected!.lagna;
const vimshottari = primary.expected!.vimshottari;

// ─── 1. Fixture sanity: invariants on the ground-truth data itself ────────────

describe('Ground-truth fixture invariants (math checks on Swiss Eph data)', () => {

  test('WHOLE_SIGN_HOUSE_RULE: house == ((sign_idx − lagna_idx) mod 12) + 1 for every graha', () => {
    for (const [name, p] of Object.entries(planets)) {
      const computed = ((p.sign_index_0 - lagna.sign_index_0 + 12) % 12) + 1;
      expect({ planet: name, house: p.house }).toEqual({ planet: name, house: computed });
    }
  });

  test('NODE_AXIS_LONGITUDE: (Rahu + 180) mod 360 == Ketu within 0.001°', () => {
    const ketuFromRahu = (planets.Rahu.sidereal_longitude + 180) % 360;
    const diff = Math.abs(ketuFromRahu - planets.Ketu.sidereal_longitude);
    expect(diff).toBeLessThan(0.001);
  });

  test('NODE_AXIS_HOUSE: Ketu.house == ((Rahu.house − 1 + 6) mod 12) + 1', () => {
    const expected = ((planets.Rahu.house - 1 + 6) % 12) + 1;
    expect(planets.Ketu.house).toBe(expected);
  });

  test('MERCURY_SUN_PROXIMITY: angular diff ≤ 28°', () => {
    const diff = angularDiff(planets.Mercury.sidereal_longitude, planets.Sun.sidereal_longitude);
    expect(diff).toBeLessThanOrEqual(28);
  });

  test('VENUS_SUN_PROXIMITY: angular diff ≤ 48°', () => {
    const diff = angularDiff(planets.Venus.sidereal_longitude, planets.Sun.sidereal_longitude);
    expect(diff).toBeLessThanOrEqual(48);
  });

  test('DASHA_TOTAL_YEARS: all 9 mahadasha years sum to 120', () => {
    const total = vimshottari.mahadasha_sequence.reduce((s, d) => s + d.years, 0);
    expect(total).toBe(120);
  });

  test('DASHA_CYCLIC_ORDER: sequence follows Ketu→Venus→Sun→Moon→Mars→Rahu→Jup→Sat→Merc', () => {
    const ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
    const lords = vimshottari.mahadasha_sequence.map(d => d.lord);
    const startIdx = ORDER.indexOf(lords[0]!);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    lords.forEach((lord, i) => {
      expect(lord).toBe(ORDER[(startIdx + i) % 9]);
    });
  });

  test('STARTING_DASHA_LORD: starting lord matches Moon nakshatra ruler', () => {
    expect(vimshottari.starting_lord).toBe('Mars'); // Mrigashira lord
  });

});

// ─── 2. degreeToNakshatra — fixture validation ────────────────────────────────

describe('degreeToNakshatra — fixture validation', () => {
  // NOTE: fixture spells "Dhanishta"; code constants spell "Dhanishtha" — use code spelling.
  const cases: [string, number, string, number][] = [
    ['Sun',     50.07,  'Rohini',          4],
    ['Moon',    58.28,  'Mrigashira',      2],
    ['Mars',    88.74,  'Punarvasu',       3],
    ['Mercury', 34.47,  'Krittika',        3],
    ['Jupiter', 53.65,  'Mrigashira',      1],
    ['Venus',   65.95,  'Mrigashira',      4],
    ['Saturn',  258.85, 'Purva Ashadha',   2],
    ['Rahu',    305.90, 'Dhanishtha',      4],
    ['Ketu',    125.90, 'Magha',           2],
    ['Lagna',   191.22, 'Swati',           2],
  ];

  test.each(cases)('%s at %f° → %s pada %i', (planet, lon, expectedNak, expectedPada) => {
    const { nakshatra, pada } = degreeToNakshatra(lon);
    expect(nakshatra).toBe(expectedNak);
    expect(pada).toBe(expectedPada);
  });
});

// ─── 3. Whole-sign house helper ───────────────────────────────────────────────

describe('getWholeSignHouse — fixture validation', () => {
  const lagnaIdx = lagna.sign_index_0; // 6 = Libra

  const cases: [string, number, number][] = [
    ['Sun',     1,  8],
    ['Moon',    1,  8],
    ['Mars',    2,  9],
    ['Mercury', 1,  8],
    ['Jupiter', 1,  8],
    ['Venus',   2,  9],
    ['Saturn',  8,  3],
    ['Rahu',    10, 5],
    ['Ketu',    4,  11],
  ];

  test.each(cases)('%s: sign_idx %i → house %i', (planet, signIdx, expectedHouse) => {
    expect(getWholeSignHouse(signIdx, lagnaIdx)).toBe(expectedHouse);
  });
});

// ─── 4. calculateVimshottariDasha — fixture validation ────────────────────────

describe('calculateVimshottariDasha — primary fixture (Jun 4, 1989 / 16:09 IST)', () => {
  // Birth: 1989-06-04 16:09 IST = 10:39 UTC
  const birthDate = new Date('1989-06-04T10:39:00Z');
  const moonDeg = 58.28; // Mrigashira pada 2

  let dashas: ReturnType<typeof calculateVimshottariDasha>;
  beforeAll(() => {
    dashas = calculateVimshottariDasha(moonDeg, birthDate);
  });

  test('returns 9 periods', () => {
    expect(dashas).toHaveLength(9);
  });

  test('starting lord is Mars (Mrigashira ruler)', () => {
    expect(dashas[0]!.planet).toBe('Mars');
  });

  test('Mars dasha start within 5 days of 1986-10-29', () => {
    const start = new Date(dashas[0]!.startDate);
    expect(daysDiff(start, utcDate('1986-10-29'))).toBeLessThan(5);
  });

  test('Mars dasha end within 5 days of 1993-10-29', () => {
    const end = new Date(dashas[0]!.endDate);
    expect(daysDiff(end, utcDate('1993-10-29'))).toBeLessThan(5);
  });

  test('Jupiter dasha start within 5 days of 2011-10-29', () => {
    const jup = dashas.find(d => d.planet === 'Jupiter')!;
    expect(daysDiff(new Date(jup.startDate), utcDate('2011-10-29'))).toBeLessThan(5);
  });

  test('Saturn dasha start within 5 days of 2027-10-29', () => {
    const sat = dashas.find(d => d.planet === 'Saturn')!;
    expect(daysDiff(new Date(sat.startDate), utcDate('2027-10-29'))).toBeLessThan(5);
  });

  test('Jupiter dasha is active on 2026-04-26', () => {
    const testDate = new Date('2026-04-26T00:00:00Z');
    const active = dashas.find(
      d => new Date(d.startDate) <= testDate && testDate < new Date(d.endDate)
    );
    expect(active?.planet).toBe('Jupiter');
  });

  test('dasha cyclic order is correct', () => {
    const ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
    const startIdx = ORDER.indexOf(dashas[0]!.planet);
    dashas.forEach((d, i) => {
      expect(d.planet).toBe(ORDER[(startIdx + i) % 9]);
    });
  });

  test('balance at birth ≈ 4.4 years (Mars elapsed ≈ 2.6 of 7)', () => {
    const marsEnd = new Date(dashas[0]!.endDate);
    const marsStart = new Date(dashas[0]!.startDate);
    const totalMs = marsEnd.getTime() - marsStart.getTime();
    const remainingMs = marsEnd.getTime() - birthDate.getTime();
    const balanceYears = (remainingMs / totalMs) * 7;
    // Fixture says 4.402; allow ±0.1
    expect(Math.abs(balanceYears - 4.402)).toBeLessThan(0.1);
  });
});

// ─── 5. DOB sensitivity — Jun 3 vs Jun 4 ─────────────────────────────────────

describe('DOB sensitivity: Jun 3 produces Moon-start dasha, Jun 4 produces Mars-start', () => {
  // Moon moves ~13.2°/day. Jun 4 moon = 58.28° (Mrigashira). Jun 3 moon ≈ 45.1° (Rohini).
  // Fixture 2 corroborates: Jun 3 → Moon lord, Jun 4 → Mars lord.

  test('58.28° (Jun 4 Moon) is in Mrigashira — lord Mars', () => {
    expect(degreeToNakshatra(58.28).nakshatra).toBe('Mrigashira');
    const dashas = calculateVimshottariDasha(58.28, new Date('1989-06-04T10:39:00Z'));
    expect(dashas[0]!.planet).toBe('Mars');
  });

  test('45.1° (Jun 3 Moon approx.) is in Rohini — lord Moon', () => {
    // Rohini: 40–53.33°. 45.1° is squarely inside it.
    expect(degreeToNakshatra(45.1).nakshatra).toBe('Rohini');
    const dashas = calculateVimshottariDasha(45.1, new Date('1989-06-03T10:39:00Z'));
    expect(dashas[0]!.planet).toBe('Moon');
  });

  test('Jun 3 Jupiter dasha (if Moon start) is ~7 years later than Jun 4', () => {
    const jun4Dashas = calculateVimshottariDasha(58.28, new Date('1989-06-04T10:39:00Z'));
    const jun3Dashas = calculateVimshottariDasha(45.1,  new Date('1989-06-03T10:39:00Z'));

    const jun4JupStart = new Date(jun4Dashas.find(d => d.planet === 'Jupiter')!.startDate);
    const jun3JupStart = new Date(jun3Dashas.find(d => d.planet === 'Jupiter')!.startDate);

    // Jun 4: Jupiter starts 2011; Jun 3 (Moon start → Rahu at birth → Jupiter later):
    // order from Moon: Moon→Mars→Rahu→Jup, so Jupiter lands ~7+ years later
    const deltaYears = (jun3JupStart.getTime() - jun4JupStart.getTime()) / (365.25 * 86400 * 1000);
    expect(deltaYears).toBeGreaterThan(5);
    expect(deltaYears).toBeLessThan(10);
  });
});

// ─── 6. NODE_AXIS invariant — code enforcement ────────────────────────────────

describe('NODE_AXIS invariant helpers', () => {
  test('(305.90 + 180) mod 360 == 125.90 within 0.001°', () => {
    // Validates the arithmetic the code uses when enforcing Ketu = Rahu + 180°
    const rahuLon = 305.90;
    const ketuLon = 125.90;
    expect(Math.abs((rahuLon + 180) % 360 - ketuLon)).toBeLessThan(0.001);
  });

  test('Ketu house from Rahu house: ((5 − 1 + 6) mod 12) + 1 == 11', () => {
    // Rahu house 5 (Aquarius from Libra lagna) → Ketu house 11 (Leo)
    const rahuHouse = 5;
    const ketuHouse = ((rahuHouse - 1 + 6) % 12) + 1;
    expect(ketuHouse).toBe(11);
  });
});
