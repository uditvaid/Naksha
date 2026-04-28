/**
 * Prokerala Astrology API Service
 * Docs: https://api.prokerala.com/docs
 * OAuth2 client credentials flow
 */

import { BirthData, ChartData, PlanetPosition, DashaPeriod } from '@store/userStore';
import { NAKSHATRAS, MAHADASHA_YEARS } from '@constants/astrology';
import { PROXY_BASE_URL } from '@constants/config';
import { buildAuthHeader } from './auth';
import { calculateVimshottariDasha } from '@utils/vedic';

const BASE_URL = `${PROXY_BASE_URL}/v1/prokerala`;

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const PROKERALA_REQUEST_TIMEOUT_MS = 15000;

async function prokeralaGet(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const authHeader = await buildAuthHeader();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROKERALA_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'x-naksha-auth': authHeader,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Prokerala API error (${endpoint}): ${err}`);
    }

    const json = await res.json();
    return json.data;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Prokerala API timeout (${endpoint}): server did not respond within ${PROKERALA_REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Coordinate lookup ────────────────────────────────────────────────────────

export interface GeoResult {
  latitude: number;
  longitude: number;
  timezone: string;
  resolvedName?: string; // The name Nominatim/our fallback actually matched — for UI confirmation
}

export class PlaceNotFoundError extends Error {
  constructor(public place: string) {
    super(`Could not find location "${place}"`);
    this.name = 'PlaceNotFoundError';
  }
}

interface FallbackCity extends GeoResult {
  city: string;
  countryAliases: string[];
}

const FALLBACK_CITIES: FallbackCity[] = [
  { city: 'faridabad',   latitude: 28.4089,  longitude: 77.3178,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'delhi',       latitude: 28.6139,  longitude: 77.2090,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'new delhi',   latitude: 28.6139,  longitude: 77.2090,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'mumbai',      latitude: 19.0760,  longitude: 72.8777,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'bangalore',   latitude: 12.9716,  longitude: 77.5946,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'bengaluru',   latitude: 12.9716,  longitude: 77.5946,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'hyderabad',   latitude: 17.3850,  longitude: 78.4867,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'chennai',     latitude: 13.0827,  longitude: 80.2707,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'kolkata',     latitude: 22.5726,  longitude: 88.3639,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'ahmedabad',   latitude: 23.0225,  longitude: 72.5714,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'pune',        latitude: 18.5204,  longitude: 73.8567,   timezone: 'Asia/Kolkata',        countryAliases: ['india', 'in'] },
  { city: 'columbus',    latitude: 39.9612,  longitude: -82.9988,  timezone: 'America/New_York',    countryAliases: ['usa', 'us', 'united states', 'united states of america', 'ohio'] },
  { city: 'new york',    latitude: 40.7128,  longitude: -74.0060,  timezone: 'America/New_York',    countryAliases: ['usa', 'us', 'united states', 'united states of america', 'new york', 'ny'] },
  { city: 'chicago',     latitude: 41.8781,  longitude: -87.6298,  timezone: 'America/Chicago',     countryAliases: ['usa', 'us', 'united states', 'united states of america', 'illinois', 'il'] },
  { city: 'los angeles', latitude: 34.0522,  longitude: -118.2437, timezone: 'America/Los_Angeles', countryAliases: ['usa', 'us', 'united states', 'united states of america', 'california', 'ca'] },
  { city: 'houston',     latitude: 29.7604,  longitude: -95.3698,  timezone: 'America/Chicago',     countryAliases: ['usa', 'us', 'united states', 'united states of america', 'texas', 'tx'] },
  { city: 'phoenix',     latitude: 33.4484,  longitude: -112.0740, timezone: 'America/Phoenix',     countryAliases: ['usa', 'us', 'united states', 'united states of america', 'arizona', 'az'] },
  { city: 'toronto',     latitude: 43.6532,  longitude: -79.3832,  timezone: 'America/Toronto',     countryAliases: ['canada', 'ca', 'ontario'] },
  { city: 'london',      latitude: 51.5074,  longitude: -0.1278,   timezone: 'Europe/London',       countryAliases: ['uk', 'united kingdom', 'england', 'great britain', 'gb'] },
  { city: 'paris',       latitude: 48.8566,  longitude: 2.3522,    timezone: 'Europe/Paris',        countryAliases: ['france', 'fr'] },
  { city: 'dubai',       latitude: 25.2048,  longitude: 55.2708,   timezone: 'Asia/Dubai',          countryAliases: ['uae', 'united arab emirates', 'ae'] },
  { city: 'singapore',   latitude: 1.3521,   longitude: 103.8198,  timezone: 'Asia/Singapore',      countryAliases: ['singapore', 'sg'] },
  { city: 'sydney',      latitude: -33.8688, longitude: 151.2093,  timezone: 'Australia/Sydney',    countryAliases: ['australia', 'au', 'new south wales', 'nsw'] },
  { city: 'karachi',     latitude: 24.8607,  longitude: 67.0011,   timezone: 'Asia/Karachi',        countryAliases: ['pakistan', 'pk'] },
  { city: 'lahore',      latitude: 31.5204,  longitude: 74.3587,   timezone: 'Asia/Karachi',        countryAliases: ['pakistan', 'pk'] },
  { city: 'dhaka',       latitude: 23.8103,  longitude: 90.4125,   timezone: 'Asia/Dhaka',          countryAliases: ['bangladesh', 'bd'] },
  { city: 'kathmandu',   latitude: 27.7172,  longitude: 85.3240,   timezone: 'Asia/Kathmandu',      countryAliases: ['nepal', 'np'] },
];

export async function geocodePlace(place: string): Promise<GeoResult> {
  const trimmed = place.trim();
  if (!trimmed) throw new PlaceNotFoundError(place);

  // Try Nominatim first — real geocoding with country/region context
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'NakshaApp/1.0' }, signal: controller.signal }
      );
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const { lat, lon, display_name } = results[0];
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            const timezone = getTimezoneFromCoords(latitude, longitude);
            return { latitude, longitude, timezone, resolvedName: display_name };
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Network/abort — fall through to offline fallback
  }

  // Offline fallback — match BOTH city and country tokens to avoid false positives
  // like "Faridabad, Pakistan" resolving to the India entry.
  const tokens = trimmed.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  const cityToken = tokens[0] ?? '';
  const otherTokens = tokens.slice(1);

  const candidates = FALLBACK_CITIES.filter(c => c.city === cityToken);
  if (candidates.length > 0) {
    if (otherTokens.length > 0) {
      const match = candidates.find(c =>
        otherTokens.some(t => c.countryAliases.includes(t))
      );
      if (match) {
        const { city: _c, countryAliases: _ca, ...geo } = match;
        return { ...geo, resolvedName: trimmed };
      }
      throw new PlaceNotFoundError(place);
    }
    if (candidates.length === 1) {
      const { city: _c, countryAliases: _ca, ...geo } = candidates[0];
      return { ...geo, resolvedName: trimmed };
    }
  }

  throw new PlaceNotFoundError(place);
}

// Derive approximate timezone from coordinates
function getTimezoneFromCoords(lat: number, lon: number): string {
  // Specific sub-continent zones checked before broad India box
  // Nepal: narrow lon band, higher lat
  if (lon >= 80 && lon <= 88.2 && lat >= 26 && lat <= 30.5) return 'Asia/Kathmandu';
  // Bangladesh
  if (lon >= 88 && lon <= 93 && lat >= 20.5 && lat <= 26.7) return 'Asia/Dhaka';
  // Pakistan
  if (lon >= 60 && lon <= 77 && lat >= 23 && lat <= 37) return 'Asia/Karachi';
  // India (broad box — after more specific neighbors above)
  if (lon >= 68 && lon <= 97 && lat >= 8 && lat <= 37) return 'Asia/Kolkata';
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
  const time = timeStr || '12:00';
  const offset = computeOffset(dateStr, time, timezone);
  return `${dateStr}T${time}:00${offset}`;
}

// Compute the UTC offset for the given date in the given IANA timezone, accounting for DST.
// Works by formatting the date in both UTC and the target TZ and diffing the parts.
const STATIC_OFFSETS: Record<string, string> = {
  'Asia/Kolkata': '+05:30',
  'Asia/Colombo': '+05:30',
  'Asia/Karachi': '+05:00',
  'Asia/Kathmandu': '+05:45',
  'Asia/Dhaka': '+06:00',
  'Asia/Dubai': '+04:00',
  'Asia/Singapore': '+08:00',
  'Asia/Tokyo': '+09:00',
  'America/New_York': '-05:00',
  'America/Chicago': '-06:00',
  'America/Denver': '-07:00',
  'America/Los_Angeles': '-08:00',
  'America/Phoenix': '-07:00',
  'America/Toronto': '-05:00',
  'Europe/London': '+00:00',
  'Europe/Paris': '+01:00',
  'Australia/Sydney': '+10:00',
};

function computeOffset(dateStr: string, timeStr: string, timezone: string): string {
  try {
    // Treat the birth datetime as if in UTC, then ask what that instant looks like in the target TZ.
    // The difference reveals the TZ's offset at that moment (DST-aware).
    const asUtc = new Date(`${dateStr}T${timeStr}:00Z`);
    if (isNaN(asUtc.getTime())) throw new Error('invalid date');

    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(asUtc).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});

    const tzAsUtc = Date.UTC(
      Number(tzParts.year), Number(tzParts.month) - 1, Number(tzParts.day),
      Number(tzParts.hour === '24' ? '00' : tzParts.hour), Number(tzParts.minute), Number(tzParts.second)
    );

    const offsetMinutes = Math.round((tzAsUtc - asUtc.getTime()) / 60000);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  } catch {
    return STATIC_OFFSETS[timezone] ?? '+05:30';
  }
}

// ─── Parse planet positions from Prokerala response ──────────────────────────

function parsePlanetPosition(planet: any, lagnaSignIndex: number): PlanetPosition {
  let signIndex: number;
  let degree: number;

  if (planet.longitude && typeof planet.longitude === 'object' && 'degrees' in planet.longitude) {
    // Prokerala planet-position API shape:
    //   sign.id  = 1-indexed zodiac sign
    //   longitude = within-sign { degrees, minutes, seconds }
    signIndex = (planet.sign?.id ?? 1) - 1;
    degree = (planet.longitude.degrees ?? 0)
           + (planet.longitude.minutes ?? 0) / 60
           + (planet.longitude.seconds ?? 0) / 3600;
  } else {
    // Fallback / test shape: rasi.id + degree (absolute 0–360 or within-sign 0–30)
    signIndex = (planet.rasi?.id ?? planet.sign?.id ?? 1) - 1;
    degree = planet.degree ?? 0;
    if (degree > 30) {
      signIndex = Math.floor(degree / 30) % 12;
      degree = degree % 30;
    }
  }

  const house = ((signIndex - lagnaSignIndex + 12) % 12) + 1;

  // Compute nakshatra from absolute longitude rather than the API's nakshatra.id,
  // which can be off-by-one depending on whether the endpoint returns 0- or 1-based IDs.
  const absoluteLon = signIndex * 30 + degree;
  const nakWidth = 360 / 27;
  const nakIdx = Math.floor(absoluteLon / nakWidth) % 27;
  const pada = Math.min(Math.floor((absoluteLon % nakWidth) / (nakWidth / 4)) + 1, 4);
  const nakshatra = NAKSHATRAS[nakIdx]?.name ?? 'Ashwini';

  if (__DEV__ && planet.nakshatra?.id != null) {
    const apiNakIdx = planet.nakshatra.id - 1;
    const apiNak = NAKSHATRAS[apiNakIdx]?.name ?? 'unknown';
    if (apiNak !== nakshatra) {
      console.warn(`[Prokerala] nakshatra mismatch for ${planet.name}: API says ${apiNak} (id=${planet.nakshatra.id}), longitude-computed says ${nakshatra} (lon=${absoluteLon.toFixed(3)}°)`);
    }
  }

  return {
    planet: normalizePlanetName(planet.name ?? 'Unknown'),
    sign: SIGNS[signIndex] ?? 'Aries',
    signIndex,
    degree,
    house,
    nakshatra,
    pada,
    isRetrograde: planet.is_retrograde ?? false,
    isExalted: planet.is_exalted ?? false,
    isDebilitated: planet.is_debilitated ?? false,
  };
}

// ─── Fallback lagna computation ───────────────────────────────────────────────

function computeFallbackLagnaSignIndex(birthData: BirthData): number {
  try {
    const [hStr, mStr] = (birthData.timeOfBirth || '12:00').split(':');
    const localHour = parseInt(hStr ?? '12', 10) + parseInt(mStr ?? '0', 10) / 60;
    const tzOffset = FALLBACK_TZ_OFFSETS[birthData.timezone] ?? 5.5;
    const utcHour = ((localHour - tzOffset) % 24 + 24) % 24;

    const date = new Date(birthData.dateOfBirth);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const julianDay = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4)
      + Math.floor(275 * (month + 1) / 9) + day + utcHour / 24 + 1721013.5;

    const T = (julianDay - 2451545.0) / 36525;
    let gmst = 280.46061837 + 360.98564736629 * (julianDay - 2451545.0)
      + 0.000387933 * T * T - (T * T * T) / 38710000;
    gmst = ((gmst % 360) + 360) % 360;

    const lst = ((gmst + birthData.longitude) % 360 + 360) % 360;
    const lstRad = (lst * Math.PI) / 180;
    const latRad = (birthData.latitude * Math.PI) / 180;
    const obliquity = 23.4393 * Math.PI / 180;

    const ascRad = Math.atan2(
      -Math.cos(lstRad),
      Math.sin(lstRad) * Math.cos(obliquity) + Math.tan(latRad) * Math.sin(obliquity)
    );
    let ascDeg = (ascRad * 180) / Math.PI;
    ascDeg = ((ascDeg % 360) + 360) % 360;

    const ayanamsa = 23.853 + (year - 2000) * 0.01396;
    const sidereal = ((ascDeg - ayanamsa) % 360 + 360) % 360;
    return Math.floor(sidereal / 30);
  } catch {
    return 6; // Libra last-resort
  }
}

// ─── Main chart generation ────────────────────────────────────────────────────

export async function generateChart(birthData: BirthData): Promise<ChartData> {
  const datetime = formatDateTime(birthData.dateOfBirth, birthData.timeOfBirth, birthData.timezone);
  if (__DEV__) console.log('[Prokerala] datetime sent to API:', datetime, '| timezone:', birthData.timezone);

  const baseParams = {
    datetime,
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1', // Lahiri
  };

  // Fetch planet positions and kundli in parallel
  const [kundliData, planetData] = await Promise.all([
    prokeralaGet('kundli', { ...baseParams, chart_type: 'rasi' }).catch((e) => { if (__DEV__) console.warn('[Prokerala] kundli failed:', e?.message); return null; }),
    prokeralaGet('planet-position', baseParams).catch((e) => { if (__DEV__) console.warn('[Prokerala] planet-position failed:', e?.message); return null; }),
  ]);

  // Parse lagna
  const lagnaSignIndex = kundliData?.ascendant?.rasi?.id != null
    ? kundliData.ascendant.rasi.id - 1
    : computeFallbackLagnaSignIndex(birthData);
  const lagna = SIGNS[lagnaSignIndex] ?? 'Libra';

  // Parse planets
  let planets: PlanetPosition[] = [];
  const rawPlanets = planetData?.planet_position ?? kundliData?.planet_positions ?? [];

  if (__DEV__) {
    console.log('[Prokerala] raw planet array:', JSON.stringify(rawPlanets, null, 2));
  }

  if (rawPlanets.length > 0) {
    planets = rawPlanets.map((p: any) => parsePlanetPosition(p, lagnaSignIndex));
    // Prokerala API labels South Node as "Rahu" and North Node as "Ketu" —
    // swap to standard Vedic convention: Rahu = North Node, Ketu = South Node
    planets = planets.map(p => {
      if (p.planet === 'Rahu') return { ...p, planet: 'Ketu' };
      if (p.planet === 'Ketu') return { ...p, planet: 'Rahu' };
      return p;
    });
    // Enforce NODE_AXIS invariant: derive Ketu exactly opposite Rahu (within 0.001°)
    const rahuEntry = planets.find(p => p.planet === 'Rahu');
    if (rahuEntry) {
      const rahuLon = rahuEntry.signIndex * 30 + rahuEntry.degree;
      const ketuLon = (rahuLon + 180) % 360;
      const ketuSignIndex = Math.floor(ketuLon / 30);
      const ketuHouse = ((ketuSignIndex - lagnaSignIndex + 12) % 12) + 1;
      const nakWidth = 360 / 27;
      const ketuNakIdx = Math.floor(ketuLon / nakWidth) % 27;
      const ketuPada = Math.min(Math.floor((ketuLon % nakWidth) / (nakWidth / 4)) + 1, 4);
      const derivedKetu: PlanetPosition = {
        planet: 'Ketu',
        sign: SIGNS[ketuSignIndex] ?? 'Aries',
        signIndex: ketuSignIndex,
        degree: Math.round((ketuLon % 30) * 100) / 100,
        house: ketuHouse,
        nakshatra: NAKSHATRAS[ketuNakIdx]?.name ?? 'Ashwini',
        pada: ketuPada,
        isRetrograde: true,
        isExalted: false,
        isDebilitated: false,
      };
      const ketuIdx = planets.findIndex(p => p.planet === 'Ketu');
      if (ketuIdx >= 0) {
        planets[ketuIdx] = derivedKetu;
      } else {
        planets.push(derivedKetu);
      }
    }
  } else {
    if (__DEV__) console.warn('[Prokerala] Using fallback planet positions (no API data). timeOfBirth:', birthData.timeOfBirth, 'timezone:', birthData.timezone);
    planets = buildFallbackPlanets(lagnaSignIndex, birthData);
  }

  // Fetch yogas and navamsha in parallel. Dasha-periods endpoint is intentionally
  // omitted: we compute dashas locally from the Moon longitude already parsed above.
  // The API can return a wrong starting lord when its internal Moon position differs
  // slightly from our parsed planet-position data near nakshatra boundaries.
  const [yogaResult, navResult] = await Promise.all([
    prokeralaGet('yoga', baseParams).catch((e) => { if (__DEV__) console.warn('[Prokerala] yoga failed:', e?.message); return null; }),
    prokeralaGet('kundli', { ...baseParams, chart_type: 'navamsa' }).catch((e) => { if (__DEV__) console.warn('[Prokerala] navamsa failed:', e?.message); return null; }),
  ]);

  const dashas = buildFallbackDashas(planets, birthData);

  if (__DEV__) {
    prokeralaGet('dasha-periods', baseParams)
      .then(dashaResult => {
        if (!dashaResult) return;
        const apiDashas = parseDashas(dashaResult.dasha_periods ?? dashaResult.mahadasha ?? []);
        if (apiDashas[0]?.planet !== dashas[0]?.planet) {
          console.warn(`[Prokerala] dasha starting-lord mismatch: API says ${apiDashas[0]?.planet}, local says ${dashas[0]?.planet}`);
        }
      })
      .catch(() => {});
  }

  const yogas = yogaResult
    ? (yogaResult.yoga_list ?? [])
        .slice(0, 8)
        .map((y: any) => {
          if (typeof y === 'string') return y;
          if (typeof y?.name === 'string') return y.name;
          if (typeof y?.title === 'string') return y.title;
          return null;
        })
        .filter((s: string | null): s is string => typeof s === 'string' && s.length > 0)
    : detectBasicYogas(planets);

  const navIdx = navResult ? (navResult.ascendant?.rasi?.id ?? lagnaSignIndex + 1) - 1 : lagnaSignIndex;
  const navamshaLagna = SIGNS[navIdx] ?? lagna;

  return { lagna, lagnaSign: lagnaSignIndex, planets, dashas, yogas, navamshaLagna, isApproximate: rawPlanets.length === 0 };
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
    // English full names
    'sun': 'Sun', 'moon': 'Moon', 'mars': 'Mars', 'mercury': 'Mercury',
    'jupiter': 'Jupiter', 'venus': 'Venus', 'saturn': 'Saturn',
    'rahu': 'Rahu', 'ketu': 'Ketu',
    // Prokerala abbreviations
    'su': 'Sun', 'mo': 'Moon', 'ma': 'Mars', 'me': 'Mercury',
    'ju': 'Jupiter', 've': 'Venus', 'sa': 'Saturn', 'ra': 'Rahu', 'ke': 'Ketu',
    // Sanskrit full names (returned by some Prokerala API versions)
    'surya': 'Sun', 'chandra': 'Moon', 'mangala': 'Mars', 'mangal': 'Mars',
    'budha': 'Mercury', 'guru': 'Jupiter', 'brihaspati': 'Jupiter',
    'shukra': 'Venus', 'shani': 'Saturn', 'shanaischar': 'Saturn',
    // Node aliases
    'north node': 'Rahu', 'south node': 'Ketu',
    'ascending node': 'Rahu', 'descending node': 'Ketu',
    "dragon's head": 'Rahu', "dragon's tail": 'Ketu',
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

// Static UTC offsets for birth-time → UTC conversion in the fallback path.
// DST is not handled (this is already a simplified fallback).
const FALLBACK_TZ_OFFSETS: Record<string, number> = {
  'Asia/Kolkata': 5.5, 'Asia/Colombo': 5.5, 'Asia/Karachi': 5, 'Asia/Kathmandu': 5.75,
  'Asia/Dhaka': 6, 'Asia/Dubai': 4, 'Asia/Singapore': 8, 'Asia/Tokyo': 9,
  'America/New_York': -5, 'America/Chicago': -6, 'America/Denver': -7,
  'America/Los_Angeles': -8, 'America/Phoenix': -7, 'America/Toronto': -5,
  'Europe/London': 0, 'Europe/Paris': 1, 'Australia/Sydney': 10,
};

function buildFallbackPlanets(lagnaSignIndex: number, birthData: BirthData): PlanetPosition[] {
  const year = new Date(birthData.dateOfBirth).getUTCFullYear();
  const month = new Date(birthData.dateOfBirth).getUTCMonth();
  const day = new Date(birthData.dateOfBirth).getUTCDate();

  // Include birth time so Moon (moves ~0.5°/hr) lands in the correct nakshatra.
  // Without this, the JD is for UTC midnight and Moon can be off by a full nakshatra.
  const [hStr, mStr] = (birthData.timeOfBirth || '12:00').split(':');
  const localHour = parseInt(hStr ?? '12', 10) + parseInt(mStr ?? '0', 10) / 60;
  const tzOffset = FALLBACK_TZ_OFFSETS[birthData.timezone] ?? 5.5;
  const utcHour = ((localHour - tzOffset) % 24 + 24) % 24;
  const dayFraction = utcHour / 24;

  const julianDay = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) + Math.floor(275 * (month + 1) / 9) + day + dayFraction + 1721013.5;

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
