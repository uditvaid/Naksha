/**
 * Prokerala service tests.
 *
 * Suite 1: planet-mapping unit tests (mocked fetch, no network)
 *   - Rahu/Ketu label swap (API uses inverted convention)
 *   - NODE_AXIS invariant enforcement (Ketu = Rahu + 180°)
 *   - Sign, house, nakshatra, retrograde field mapping vs Swiss Eph fixture
 *   - Lagna parsing from kundli response
 *
 * Suite 2: geocoding offline fallback (fetch returns empty, tests fallback table)
 *
 * Suite 3: live proxy integration (requires LIVE_API=1 env var)
 *   Run: LIVE_API=1 jest prokerala.test
 */

import { generateChart, geocodePlace, PlaceNotFoundError } from '@services/prokerala';
import fixtures from './fixtures/chart_fixtures.json';

// ─── Mock dependencies (hoisted before imports) ───────────────────────────────

jest.mock('@constants/config', () => ({
  PROXY_BASE_URL: 'https://mock-proxy.test',
  APP_HMAC_SECRET: 'test-secret',
  TEST_MODE: false,
  BUILD_PROFILE: 'test',
  REVENUECAT_IOS_KEY: '',
  REVENUECAT_ANDROID_KEY: '',
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('test-device-id')),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-device-id',
}));

// ─── Fixture refs ─────────────────────────────────────────────────────────────

const fx = fixtures.fixtures[0]!;
const fxPlanets = fx.expected!.planets;
const fxDashas = fx.expected!.vimshottari.mahadasha_sequence;

const BIRTH_DATA = {
  name: 'Test',
  dateOfBirth: fx.input.date,
  timeOfBirth: '16:09',
  placeOfBirth: 'Faridabad, India',
  latitude: fx.input.lat,
  longitude: fx.input.lon,
  timezone: 'Asia/Kolkata',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFakePlanetPayload() {
  // Prokerala's inverted convention: South Node = "Rahu", North Node = "Ketu"
  // `degree` = absolute sidereal longitude (>30 triggers the sign-recompute branch in parsePlanetPosition)
  // `rasi.id` = 1-indexed sign (matches parsePlanetPosition field path)
  return {
    planet_position: [
      { name: 'Sun',     degree: 50.067,  rasi: { id: 2  }, is_retrograde: false, is_exalted: false, is_debilitated: false, nakshatra: { id: 4  } },
      { name: 'Moon',    degree: 58.267,  rasi: { id: 2  }, is_retrograde: false, is_exalted: false, is_debilitated: false, nakshatra: { id: 5  } },
      { name: 'Mars',    degree: 88.733,  rasi: { id: 3  }, is_retrograde: false, is_exalted: false, is_debilitated: false, nakshatra: { id: 7  } },
      { name: 'Mercury', degree: 34.467,  rasi: { id: 2  }, is_retrograde: true,  is_exalted: false, is_debilitated: false, nakshatra: { id: 3  } },
      { name: 'Jupiter', degree: 53.65,   rasi: { id: 2  }, is_retrograde: false, is_exalted: false, is_debilitated: false, nakshatra: { id: 5  } },
      { name: 'Venus',   degree: 65.95,   rasi: { id: 3  }, is_retrograde: false, is_exalted: false, is_debilitated: false, nakshatra: { id: 5  } },
      { name: 'Saturn',  degree: 258.85,  rasi: { id: 9  }, is_retrograde: true,  is_exalted: false, is_debilitated: false, nakshatra: { id: 20 } },
      // South Node labelled "Rahu" by Prokerala → becomes Ketu after swap (Leo, 125.9°)
      { name: 'Rahu',    degree: 125.9,   rasi: { id: 5  }, is_retrograde: true,  is_exalted: false, is_debilitated: false, nakshatra: { id: 10 } },
      // North Node labelled "Ketu" by Prokerala → becomes Rahu after swap (Aquarius, 305.9°)
      { name: 'Ketu',    degree: 305.9,   rasi: { id: 11 }, is_retrograde: true,  is_exalted: false, is_debilitated: false, nakshatra: { id: 23 } },
    ],
  };
}

function buildFakeKundliPayload() {
  return {
    ascendant: {
      rasi: { id: 7 }, // 1-indexed: 7 = Libra
      longitude: { degrees: 11, minutes: 13, seconds: 0 },
    },
  };
}

function makeFetchMock() {
  return jest.fn()
    .mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: buildFakeKundliPayload() }),
      text: () => Promise.resolve(''),
    }))
    .mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: buildFakePlanetPayload() }),
      text: () => Promise.resolve(''),
    }));
}

// ─── Suite 1: planet mapping (mocked fetch) ───────────────────────────────────

describe('Prokerala mapping — planet fields, Rahu/Ketu swap, NODE_AXIS', () => {
  let chart: Awaited<ReturnType<typeof generateChart>>;

  beforeAll(async () => {
    global.fetch = makeFetchMock() as any;
    chart = await generateChart(BIRTH_DATA as any);
  });

  afterAll(() => { jest.resetAllMocks(); });

  test('lagna sign is Libra', () => {
    expect(chart.lagna).toBe('Libra');
  });

  test('chart has exactly 9 grahas', () => {
    expect(chart.planets).toHaveLength(9);
    for (const g of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']) {
      expect(chart.planets.map(p => p.planet)).toContain(g);
    }
  });

  // ── Rahu/Ketu label swap ──

  test('Rahu is Aquarius after swap (API North Node labelled "Ketu")', () => {
    expect(chart.planets.find(p => p.planet === 'Rahu')?.sign).toBe('Aquarius');
  });

  test('Ketu is Leo after swap (API South Node labelled "Rahu")', () => {
    expect(chart.planets.find(p => p.planet === 'Ketu')?.sign).toBe('Leo');
  });

  // ── NODE_AXIS invariant ──

  test('Ketu longitude = (Rahu + 180) mod 360 within 0.1°', () => {
    const rahu = chart.planets.find(p => p.planet === 'Rahu')!;
    const ketu = chart.planets.find(p => p.planet === 'Ketu')!;
    const rahuLon = rahu.signIndex * 30 + rahu.degree;
    const ketuLon = ketu.signIndex * 30 + ketu.degree;
    expect(Math.abs(((rahuLon + 180) % 360) - ketuLon)).toBeLessThan(0.1);
  });

  test('Rahu and Ketu are in opposite houses (|diff| = 6)', () => {
    const rahu = chart.planets.find(p => p.planet === 'Rahu')!;
    const ketu = chart.planets.find(p => p.planet === 'Ketu')!;
    expect(Math.abs(rahu.house - ketu.house)).toBe(6);
  });

  // ── Sign / house mapping ──

  test.each<[string, string, number]>([
    ['Sun',     'Taurus',      8],
    ['Moon',    'Taurus',      8],
    ['Mars',    'Gemini',      9],
    ['Mercury', 'Taurus',      8],
    ['Jupiter', 'Taurus',      8],
    ['Venus',   'Gemini',      9],
    ['Saturn',  'Sagittarius', 3],
    ['Rahu',    'Aquarius',    5],
    ['Ketu',    'Leo',         11],
  ])('%s → %s H%i', (name, sign, house) => {
    const p = chart.planets.find(pl => pl.planet === name);
    expect(p).toBeDefined();
    expect(p!.sign).toBe(sign);
    expect(p!.house).toBe(house);
  });

  // ── Retrograde flags ──

  test.each<[string, boolean]>([
    ['Mercury', true],
    ['Saturn',  true],
    ['Rahu',    true],
    ['Ketu',    true],
    ['Sun',     false],
    ['Moon',    false],
    ['Mars',    false],
    ['Jupiter', false],
    ['Venus',   false],
  ])('%s retrograde = %s', (name, expected) => {
    expect(chart.planets.find(p => p.planet === name)?.isRetrograde).toBe(expected);
  });

  // ── Nakshatra mapping ──

  test.each<[string, string]>([
    ['Sun',    'Rohini'],
    ['Moon',   'Mrigashira'],
    ['Mars',   'Punarvasu'],
    ['Saturn', 'Purva Ashadha'],
    ['Rahu',   'Dhanishtha'],
    ['Ketu',   'Magha'],
  ])('%s nakshatra = %s', (name, nak) => {
    expect(chart.planets.find(p => p.planet === name)?.nakshatra).toBe(nak);
  });

  // ── Dasha sequence ──

  test('9 dasha periods', () => { expect(chart.dashas).toHaveLength(9); });

  test('first lord is Mars (Moon in Mrigashira)', () => {
    expect(chart.dashas![0]!.planet).toBe('Mars');
  });

  test('dasha cyclic order correct', () => {
    const ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
    const start = ORDER.indexOf(chart.dashas![0]!.planet);
    chart.dashas!.forEach((d, i) => expect(d.planet).toBe(ORDER[(start + i) % 9]));
  });

  test('Jupiter dasha active on 2026-04-27', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const active = chart.dashas!.find(d => new Date(d.startDate) <= now && now < new Date(d.endDate));
    expect(active?.planet).toBe('Jupiter');
  });

  test('Jupiter dasha start within 30 days of 2011-10-29', () => {
    const jup = chart.dashas!.find(d => d.planet === 'Jupiter')!;
    const diff = Math.abs(new Date(jup.startDate).getTime() - new Date('2011-10-29').getTime()) / 86400000;
    expect(diff).toBeLessThan(30);
  });
});

// ─── Suite 2: geocoding fallback ─────────────────────────────────────────────

describe('geocodePlace — offline fallback (Nominatim returns empty)', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as any;
  });

  afterEach(() => jest.resetAllMocks());

  test('Faridabad, India → correct coords + IST', async () => {
    const r = await geocodePlace('Faridabad, India');
    expect(r.latitude).toBeCloseTo(28.4089, 2);
    expect(r.longitude).toBeCloseTo(77.3178, 2);
    expect(r.timezone).toBe('Asia/Kolkata');
  });

  test('London, UK → Europe/London', async () => {
    const r = await geocodePlace('London, UK');
    expect(r.timezone).toBe('Europe/London');
    expect(r.latitude).toBeCloseTo(51.5, 0);
  });

  test('New York, USA → America/New_York', async () => {
    const r = await geocodePlace('New York, USA');
    expect(r.timezone).toBe('America/New_York');
  });

  test('Dubai, UAE → Asia/Dubai', async () => {
    const r = await geocodePlace('Dubai, UAE');
    expect(r.timezone).toBe('Asia/Dubai');
  });

  test('unknown place throws PlaceNotFoundError', async () => {
    await expect(geocodePlace('Zxqwerty, Nowhere')).rejects.toBeInstanceOf(PlaceNotFoundError);
  });

  test('Faridabad, Pakistan throws (city exists but wrong country)', async () => {
    await expect(geocodePlace('Faridabad, Pakistan')).rejects.toBeInstanceOf(PlaceNotFoundError);
  });

  test('place with no comma throws PlaceNotFoundError', async () => {
    await expect(geocodePlace('JustACity')).rejects.toBeInstanceOf(PlaceNotFoundError);
  });
});

// ─── Suite 3: live proxy (opt-in) ────────────────────────────────────────────

const LIVE = process.env.LIVE_API === '1';
const liveDescribe = LIVE ? describe : describe.skip;

liveDescribe('Live proxy — generateChart real API call (LIVE_API=1)', () => {
  jest.setTimeout(30000);
  let chart: Awaited<ReturnType<typeof generateChart>>;

  beforeAll(async () => { chart = await generateChart(BIRTH_DATA as any); });

  test('9 planets returned', () => { expect(chart.planets).toHaveLength(9); });
  test('lagna is Libra', () => { expect(chart.lagna).toBe('Libra'); });

  test.each<[string, string]>([
    ['Sun', 'Taurus'], ['Moon', 'Taurus'], ['Mars', 'Gemini'],
    ['Saturn', 'Sagittarius'], ['Rahu', 'Aquarius'], ['Ketu', 'Leo'],
  ])('%s sign = %s', (name, sign) => {
    expect(chart.planets.find(p => p.planet === name)?.sign).toBe(sign);
  });

  test('Sun degree within 1° of fixture', () => {
    const p = chart.planets.find(p => p.planet === 'Sun')!;
    expect(Math.abs(p.degree - fxPlanets.Sun.deg_in_sign)).toBeLessThan(1);
  });

  test('Moon degree within 1° of fixture', () => {
    const p = chart.planets.find(p => p.planet === 'Moon')!;
    expect(Math.abs(p.degree - fxPlanets.Moon.deg_in_sign)).toBeLessThan(1);
  });

  test('NODE_AXIS invariant on live data', () => {
    const rahu = chart.planets.find(p => p.planet === 'Rahu')!;
    const ketu = chart.planets.find(p => p.planet === 'Ketu')!;
    const diff = Math.abs(((rahu.signIndex * 30 + rahu.degree + 180) % 360) - (ketu.signIndex * 30 + ketu.degree));
    expect(diff).toBeLessThan(1);
  });

  test('Jupiter dasha active 2026', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    expect(chart.dashas!.find(d => new Date(d.startDate) <= now && now < new Date(d.endDate))?.planet).toBe('Jupiter');
  });

  test('all fixture dasha lords present', () => {
    for (const fd of fxDashas) {
      expect(chart.dashas!.map(d => d.planet)).toContain(fd.lord);
    }
  });
});
