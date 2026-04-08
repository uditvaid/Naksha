/**
 * Prokerala Astrology API Service
 * Docs: https://api.prokerala.com/docs
 * OAuth2 client credentials flow
 */

import { BirthData, ChartData, PlanetPosition, DashaPeriod } from '@store/userStore';
import { NAKSHATRAS, MAHADASHA_YEARS } from '@constants/astrology';
import { PROKERALA_CLIENT_ID, PROKERALA_CLIENT_SECRET } from '@constants/config';
import { calculateVimshottariDasha } from '@utils/vedic';

const BASE_URL = 'https://api.prokerala.com';
const CLIENT_ID = PROKERALA_CLIENT_ID;
const CLIENT_SECRET = PROKERALA_CLIENT_SECRET;

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Prokerala token error: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return cachedToken!;
}

async function prokeralaGet(endpoint: string, params: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}/v2/astrology/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Prokerala API error (${endpoint}): ${err}`);
  }

  const json = await res.json();
  return json.data;
}

// ─── Coordinate lookup ────────────────────────────────────────────────────────

interface GeoResult { latitude: number; longitude: number; timezone: string }

export async function geocodePlace(place: string): Promise<GeoResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'NakshaApp/1.0' } }
    );
    const results = await res.json();
    if (!results.length) throw new Error('Location not found');

    const { lat, lon } = results[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Derive timezone from longitude (rough but reliable fallback)
    const timezone = getTimezoneFromCoords(latitude, longitude);
    return { latitude, longitude, timezone };
  } catch {
    // Fallback lookup by city name
    const key = place.toLowerCase().split(',')[0]?.trim() ?? '';
    const FALLBACK: Record<string, GeoResult> = {
      'faridabad':     { latitude: 28.4089,  longitude: 77.3178,   timezone: 'Asia/Kolkata' },
      'delhi':         { latitude: 28.6139,  longitude: 77.2090,   timezone: 'Asia/Kolkata' },
      'new delhi':     { latitude: 28.6139,  longitude: 77.2090,   timezone: 'Asia/Kolkata' },
      'mumbai':        { latitude: 19.0760,  longitude: 72.8777,   timezone: 'Asia/Kolkata' },
      'bangalore':     { latitude: 12.9716,  longitude: 77.5946,   timezone: 'Asia/Kolkata' },
      'bengaluru':     { latitude: 12.9716,  longitude: 77.5946,   timezone: 'Asia/Kolkata' },
      'hyderabad':     { latitude: 17.3850,  longitude: 78.4867,   timezone: 'Asia/Kolkata' },
      'chennai':       { latitude: 13.0827,  longitude: 80.2707,   timezone: 'Asia/Kolkata' },
      'kolkata':       { latitude: 22.5726,  longitude: 88.3639,   timezone: 'Asia/Kolkata' },
      'ahmedabad':     { latitude: 23.0225,  longitude: 72.5714,   timezone: 'Asia/Kolkata' },
      'pune':          { latitude: 18.5204,  longitude: 73.8567,   timezone: 'Asia/Kolkata' },
      'columbus':      { latitude: 39.9612,  longitude: -82.9988,  timezone: 'America/New_York' },
      'new york':      { latitude: 40.7128,  longitude: -74.0060,  timezone: 'America/New_York' },
      'chicago':       { latitude: 41.8781,  longitude: -87.6298,  timezone: 'America/Chicago' },
      'los angeles':   { latitude: 34.0522,  longitude: -118.2437, timezone: 'America/Los_Angeles' },
      'houston':       { latitude: 29.7604,  longitude: -95.3698,  timezone: 'America/Chicago' },
      'phoenix':       { latitude: 33.4484,  longitude: -112.0740, timezone: 'America/Phoenix' },
      'toronto':       { latitude: 43.6532,  longitude: -79.3832,  timezone: 'America/Toronto' },
      'london':        { latitude: 51.5074,  longitude: -0.1278,   timezone: 'Europe/London' },
      'paris':         { latitude: 48.8566,  longitude: 2.3522,    timezone: 'Europe/Paris' },
      'dubai':         { latitude: 25.2048,  longitude: 55.2708,   timezone: 'Asia/Dubai' },
      'singapore':     { latitude: 1.3521,   longitude: 103.8198,  timezone: 'Asia/Singapore' },
      'sydney':        { latitude: -33.8688, longitude: 151.2093,  timezone: 'Australia/Sydney' },
      'karachi':       { latitude: 24.8607,  longitude: 67.0011,   timezone: 'Asia/Karachi' },
      'lahore':        { latitude: 31.5204,  longitude: 74.3587,   timezone: 'Asia/Karachi' },
      'dhaka':         { latitude: 23.8103,  longitude: 90.4125,   timezone: 'Asia/Dhaka' },
      'kathmandu':     { latitude: 27.7172,  longitude: 85.3240,   timezone: 'Asia/Kathmandu' },
    };
    return FALLBACK[key] ?? { latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' };
  }
}

// Derive approximate timezone from coordinates
function getTimezoneFromCoords(lat: number, lon: number): string {
  // India
  if (lon >= 68 && lon <= 97 && lat >= 8 && lat <= 37) return 'Asia/Kolkata';
  // Pakistan
  if (lon >= 60 && lon <= 77 && lat >= 23 && lat <= 37) return 'Asia/Karachi';
  // US Eastern
  if (lon >= -85 && lon <= -66 && lat >= 24 && lat <= 50) return 'America/New_York';
  // US Central
  if (lon >= -102 && lon < -85 && lat >= 25 && lat <= 50) return 'America/Chicago';
  // US Mountain
  if (lon >= -115 && lon < -102 && lat >= 25 && lat <= 50) return 'America/Denver';
  // US Pacific
  if (lon >= -125 && lon < -115 && lat >= 32 && lat <= 50) return 'America/Los_Angeles';
  // UK
  if (lon >= -8 && lon <= 2 && lat >= 49 && lat <= 61) return 'Europe/London';
  // Central Europe
  if (lon > 2 && lon <= 15 && lat >= 44 && lat <= 55) return 'Europe/Paris';
  // UAE
  if (lon >= 51 && lon <= 56 && lat >= 22 && lat <= 26) return 'Asia/Dubai';
  // Singapore/Malaysia
  if (lon >= 100 && lon <= 120 && lat >= -5 && lat <= 10) return 'Asia/Singapore';
  // Australia Eastern
  if (lon >= 140 && lon <= 155 && lat >= -45 && lat <= -10) return 'Australia/Sydney';
  // Canada Eastern
  if (lon >= -85 && lon <= -52 && lat >= 42 && lat <= 70) return 'America/Toronto';
  // Default IST
  return 'Asia/Kolkata';
}

// ─── Format datetime for Prokerala ───────────────────────────────────────────

function formatDateTime(dateStr: string, timeStr: string, timezone: string): string {
  // Compute UTC offset for the given timezone
  const OFFSETS: Record<string, string> = {
    'Asia/Kolkata': '+05:30',
    'Asia/Colombo': '+05:30',
    'Asia/Karachi': '+05:00',
    'America/New_York': '-05:00',
    'America/Chicago': '-06:00',
    'America/Denver': '-07:00',
    'America/Los_Angeles': '-08:00',
    'Europe/London': '+00:00',
    'Europe/Paris': '+01:00',
    'Australia/Sydney': '+11:00',
    'Asia/Dubai': '+04:00',
    'Asia/Singapore': '+08:00',
    'Asia/Tokyo': '+09:00',
  };
  const offset = OFFSETS[timezone] ?? '+05:30';
  const time = timeStr || '12:00';
  return `${dateStr}T${time}:00${offset}`;
}

// ─── Parse planet positions from Prokerala response ──────────────────────────

function parsePlanetPosition(planet: any, lagnaSignIndex: number): PlanetPosition {
  const signIndex = (planet.rasi?.id ?? 1) - 1;
  const house = ((signIndex - lagnaSignIndex + 12) % 12) + 1;
  const nakIdx = (planet.nakshatra?.id ?? 1) - 1;
  const nakshatra = NAKSHATRAS[nakIdx]?.name ?? 'Ashwini';

  return {
    planet: planet.name ?? 'Unknown',
    sign: SIGNS[signIndex] ?? 'Aries',
    signIndex,
    degree: planet.degree ?? 0,
    house,
    nakshatra,
    pada: planet.nakshatra_pada ?? 1,
    isRetrograde: planet.is_retrograde ?? false,
    isExalted: planet.is_exalted ?? false,
    isDebilitated: planet.is_debilitated ?? false,
  };
}

// ─── Main chart generation ────────────────────────────────────────────────────

export async function generateChart(birthData: BirthData): Promise<ChartData> {
  const datetime = formatDateTime(birthData.dateOfBirth, birthData.timeOfBirth, birthData.timezone);

  const baseParams = {
    datetime,
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1', // Lahiri
  };

  // Fetch planet positions and kundli in parallel
  const [kundliData, planetData] = await Promise.all([
    prokeralaGet('kundli', { ...baseParams, chart_type: 'rasi' }).catch(() => null),
    prokeralaGet('planet-position', baseParams).catch(() => null),
  ]);

  // Parse lagna
  const lagnaSignIndex = (kundliData?.ascendant?.rasi?.id ?? 7) - 1; // default Libra
  const lagna = SIGNS[lagnaSignIndex] ?? 'Libra';

  // Parse planets
  let planets: PlanetPosition[] = [];
  const rawPlanets = planetData?.planet_position ?? kundliData?.planet_positions ?? [];

  if (rawPlanets.length > 0) {
    planets = rawPlanets.map((p: any) => parsePlanetPosition(p, lagnaSignIndex));
  } else {
    // Fallback: construct from kundli if planet-position fails
    planets = buildFallbackPlanets(lagnaSignIndex, birthData);
  }

  // Fetch dashas, yogas, and navamsha in parallel
  const [dashaResult, yogaResult, navResult] = await Promise.all([
    prokeralaGet('dasha-periods', baseParams).catch(() => null),
    prokeralaGet('yoga', baseParams).catch(() => null),
    prokeralaGet('kundli', { ...baseParams, chart_type: 'navamsa' }).catch(() => null),
  ]);

  const dashas = dashaResult
    ? parseDashas(dashaResult.dasha_periods ?? dashaResult.mahadasha ?? [])
    : buildFallbackDashas(planets, birthData);

  const yogas = yogaResult
    ? (yogaResult.yoga_list ?? []).slice(0, 8).map((y: any) => y.name ?? y)
    : detectBasicYogas(planets);

  const navIdx = navResult ? (navResult.ascendant?.rasi?.id ?? lagnaSignIndex + 1) - 1 : lagnaSignIndex;
  const navamshaLagna = SIGNS[navIdx] ?? lagna;

  return { lagna, lagnaSign: lagnaSignIndex, planets, dashas, yogas, navamshaLagna };
}

// ─── Parse Prokerala dasha response ──────────────────────────────────────────

function parseDashas(raw: any[]): DashaPeriod[] {
  if (!raw.length) return [];
  const now = new Date();

  return raw.map((d: any) => {
    const start = new Date(d.start ?? d.start_date);
    const end = new Date(d.end ?? d.end_date);
    const planet = normalizePlanetName(d.planet ?? d.graha ?? '');
    return {
      planet,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      years: MAHADASHA_YEARS[planet] ?? 7,
      isActive: start <= now && now < end,
    };
  });
}

function normalizePlanetName(raw: string): string {
  const MAP: Record<string, string> = {
    'su': 'Sun', 'mo': 'Moon', 'ma': 'Mars', 'me': 'Mercury',
    'ju': 'Jupiter', 've': 'Venus', 'sa': 'Saturn', 'ra': 'Rahu', 'ke': 'Ketu',
    'sun': 'Sun', 'moon': 'Moon', 'mars': 'Mars', 'mercury': 'Mercury',
    'jupiter': 'Jupiter', 'venus': 'Venus', 'saturn': 'Saturn',
    'rahu': 'Rahu', 'ketu': 'Ketu',
  };
  return MAP[raw.toLowerCase()] ?? raw;
}

// ─── Yoga detection (basic) ───────────────────────────────────────────────────

function detectBasicYogas(planets: PlanetPosition[]): string[] {
  const yogas: string[] = [];
  const get = (name: string) => planets.find(p => p.planet === name);

  const moon = get('Moon');
  const jupiter = get('Jupiter');
  const sun = get('Sun');
  const mercury = get('Mercury');

  // Gajakesari: Moon and Jupiter in mutual kendras (1,4,7,10 from each other)
  if (moon && jupiter) {
    const diff = Math.abs(moon.house - jupiter.house);
    if ([0, 3, 6, 9].includes(diff)) yogas.push('Gajakesari Yoga');
  }

  // Budhaditya: Sun and Mercury in same sign
  if (sun && mercury && sun.sign === mercury.sign) yogas.push('Budhaditya Yoga');

  // Exalted planets
  planets.filter(p => p.isExalted).forEach(p => yogas.push(`${p.planet} Exaltation Yoga`));

  if (yogas.length === 0) yogas.push('Dharma Karmadhipati Yoga');
  return yogas.slice(0, 6);
}

// ─── Fallback planet positions (simplified astronomy) ─────────────────────────

function buildFallbackPlanets(lagnaSignIndex: number, birthData: BirthData): PlanetPosition[] {
  const year = new Date(birthData.dateOfBirth).getFullYear();
  const month = new Date(birthData.dateOfBirth).getMonth();
  const day = new Date(birthData.dateOfBirth).getDate();

  const julianDay = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) + Math.floor(275 * (month + 1) / 9) + day + 1721013.5;

  const T = (julianDay - 2451545.0) / 36525;

  // Simplified mean longitudes (degrees)
  const rawPositions: Record<string, number> = {
    Sun: (280.46646 + 36000.76983 * T) % 360,
    Moon: (218.3165 + 481267.8813 * T) % 360,
    Mars: (355.433 + 19140.2993 * T) % 360,
    Mercury: (252.2509 + 149472.6746 * T) % 360,
    Jupiter: (34.3515 + 3034.9057 * T) % 360,
    Venus: (181.9798 + 58517.8156 * T) % 360,
    Saturn: (50.0775 + 1222.1138 * T) % 360,
    Rahu: (125.0445 - 1934.1363 * T) % 360,
  };

  // Apply Lahiri ayanamsa
  const ayanamsa = 23.853 + (year - 2000) * 0.01396;

  const NAKSHATRA_NAMES = NAKSHATRAS.map(n => n.name);

  return Object.entries(rawPositions).map(([planet, tropical]) => {
    let sidereal = ((tropical - ayanamsa) % 360 + 360) % 360;
    const signIndex = Math.floor(sidereal / 30);
    const degreeInSign = sidereal % 30;
    const house = ((signIndex - lagnaSignIndex + 12) % 12) + 1;
    const nakIdx = Math.floor(sidereal / (360 / 27));
    const pada = Math.floor((sidereal % (360 / 27)) / (360 / 108)) + 1;

    return {
      planet,
      sign: SIGNS[signIndex] ?? 'Aries',
      signIndex,
      degree: Math.round(degreeInSign * 100) / 100,
      house,
      nakshatra: NAKSHATRA_NAMES[nakIdx] ?? 'Ashwini',
      pada: Math.min(pada, 4),
      isRetrograde: false,
      isExalted: false,
      isDebilitated: false,
    };
  }).concat([{
    planet: 'Ketu',
    sign: SIGNS[(Math.floor(((((125.0445 - 1934.1363 * T) % 360) - ayanamsa + 180) % 360 + 360) % 360 / 30))] ?? 'Aries',
    signIndex: Math.floor(((((125.0445 - 1934.1363 * T) % 360) - ayanamsa + 180) % 360 + 360) % 360 / 30),
    degree: 0,
    house: ((Math.floor(((((125.0445 - 1934.1363 * T) % 360) - ayanamsa + 180) % 360 + 360) % 360 / 30) - lagnaSignIndex + 12) % 12) + 1,
    nakshatra: 'Magha',
    pada: 1,
    isRetrograde: false,
    isExalted: false,
    isDebilitated: false,
  }]);
}

function buildFallbackDashas(planets: PlanetPosition[], birthData: BirthData): DashaPeriod[] {
  const moon = planets.find(p => p.planet === 'Moon');
  const moonDeg = moon ? moon.signIndex * 30 + moon.degree : 90;
  return calculateVimshottariDasha(moonDeg, new Date(birthData.dateOfBirth));
}
