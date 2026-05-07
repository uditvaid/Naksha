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

  if (typeof planet.longitude === 'number') {
    // Prokerala v2 planet-position API: longitude is the absolute sidereal
    // longitude (0–360°). Source of truth — derive signIndex from it directly
    // rather than trusting rasi.id, which is 0-indexed in v2 but was
    // 1-indexed in earlier versions and would silently shift every planet
    // by one sign if we got the indexing wrong.
    signIndex = Math.floor(planet.longitude / 30) % 12;
    degree = planet.longitude - signIndex * 30;
  } else if (planet.longitude && typeof planet.longitude === 'object' && 'degrees' in planet.longitude) {
    // Older Prokerala planet-position API shape:
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

// Parse "+05:30" / "-05:00" → numeric hours (DST-aware via computeOffset).
function offsetStrToHours(offsetStr: string): number {
  const sign = offsetStr[0] === '-' ? -1 : 1;
  const parts = offsetStr.slice(1).split(':');
  return sign * (parseInt(parts[0] ?? '0', 10) + parseInt(parts[1] ?? '0', 10) / 60);
}

function computeFallbackLagnaSignIndex(birthData: BirthData): number {
  try {
    const [hStr, mStr] = (birthData.timeOfBirth || '12:00').split(':');
    const localHour = parseInt(hStr ?? '12', 10) + parseInt(mStr ?? '0', 10) / 60;
    const tzOffset = offsetStrToHours(computeOffset(birthData.dateOfBirth, birthData.timeOfBirth || '12:00', birthData.timezone));
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
    // atan2 formula gives the descendant (western horizon); +180° converts to ascendant.
    let ascDeg = (ascRad * 180) / Math.PI + 180;
    ascDeg = ((ascDeg % 360) + 360) % 360;

    const ayanamsa = 23.853 + (year - 2000) * 0.01396;
    const sidereal = ((ascDeg - ayanamsa) % 360 + 360) % 360;
    return Math.floor(sidereal / 30);
  } catch {
    return 6; // Libra last-resort
  }
}

// ─── Panchang (daily Vedic almanac) ──────────────────────────────────────────

export interface PanchangPeriod {
  name: string;
  start: string;
  end: string;
}
export interface PanchangNakshatra extends PanchangPeriod {
  id: number;
  lord: string;
}
export interface PanchangData {
  vaara: string;            // Day of the week ("Thursday")
  nakshatra: PanchangNakshatra[];  // Up to 2 entries — current + next if it changes today
  tithi: { name: string; paksha: string; start: string; end: string }[];
  yoga: PanchangPeriod[];
  karana: PanchangPeriod[];
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  date: string;             // ISO YYYY-MM-DD this represents
}

// Panchang is location- and date-specific; we cache by both. Daily readings
// only need to fetch once per day per location, so a tiny in-memory cache
// (lat/lon rounded + ISO date) avoids redundant API hits during a session.
// We also dedup concurrent calls onto a single in-flight Promise so a
// double-mount / focus rerender doesn't fire two parallel API calls.
let _panchangCache: { key: string; data: PanchangData } | null = null;
let _panchangInflight: { key: string; promise: Promise<PanchangData> } | null = null;

export async function getPanchang(
  birthData: BirthData,
  date: Date = new Date(),
): Promise<PanchangData> {
  const isoDate = date.toISOString().split('T')[0]!;
  const key = `${isoDate}|${birthData.latitude.toFixed(2)},${birthData.longitude.toFixed(2)}`;
  if (_panchangCache?.key === key) return _panchangCache.data;
  if (_panchangInflight?.key === key) return _panchangInflight.promise;

  // Prokerala's panchang takes a datetime + coordinates. We send local-noon
  // of `date` in the user's birth timezone — that anchors the response to
  // the calendar date the user is asking about, regardless of UTC drift.
  const datetime = formatDateTime(isoDate, '12:00', birthData.timezone);
  const params = {
    datetime,
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1',
    la: 'en',
  };

  const promise = (async () => {
    try {
      if (__DEV__) console.log(`[Panchang] fetching for ${isoDate} @ ${params.coordinates}`);
      const raw = await prokeralaGet('panchang', params);
      if (__DEV__) console.log(`[Panchang] got vaara=${raw?.vaara} nak=${raw?.nakshatra?.[0]?.name} tithi=${raw?.tithi?.[0]?.name}`);
      // Normalize the few fields we care about into a flatter shape; the lord
      // field on nakshatra arrives as { id, name, vedic_name } — collapse to name.
      const data: PanchangData = {
        vaara: raw?.vaara ?? '',
        nakshatra: (raw?.nakshatra ?? []).map((n: any) => ({
          id: n.id,
          name: n.name,
          lord: n.lord?.name ?? '',
          start: n.start,
          end: n.end,
        })),
        tithi: (raw?.tithi ?? []).map((t: any) => ({
          name: t.name,
          paksha: t.paksha,
          start: t.start,
          end: t.end,
        })),
        yoga: (raw?.yoga ?? []).map((y: any) => ({ name: y.name, start: y.start, end: y.end })),
        karana: (raw?.karana ?? []).map((k: any) => ({ name: k.name, start: k.start, end: k.end })),
        sunrise: raw?.sunrise ?? '',
        sunset: raw?.sunset ?? '',
        moonrise: raw?.moonrise ?? '',
        moonset: raw?.moonset ?? '',
        date: isoDate,
      };
      _panchangCache = { key, data };
      return data;
    } finally {
      // Clear the in-flight slot only if it's still ours — a later call for a
      // different key may have replaced it.
      if (_panchangInflight?.key === key) _panchangInflight = null;
    }
  })();
  _panchangInflight = { key, promise };
  return promise;
}

// ─── Auspicious / inauspicious time windows ──────────────────────────────────

export interface MuhuratWindow {
  /** Prokerala id (1-8). Stable per muhurat name across days. */
  id: number;
  /** Sanskrit name as Prokerala returns it, e.g. "Abhijit Muhurat", "Rahu". */
  name: string;
  /** "Auspicious" | "Inauspicious" */
  type: string;
  /** Some muhurats split into multiple windows in a day (e.g. Dur Muhurat). */
  windows: { start: string; end: string }[];
}

export interface AuspiciousPeriodsData {
  auspicious: MuhuratWindow[];
  inauspicious: MuhuratWindow[];
  /** ISO YYYY-MM-DD this represents. */
  date: string;
}

let _periodsCache: { key: string; data: AuspiciousPeriodsData } | null = null;
let _periodsInflight: { key: string; promise: Promise<AuspiciousPeriodsData> } | null = null;

export async function getAuspiciousPeriods(
  birthData: BirthData,
  date: Date = new Date(),
): Promise<AuspiciousPeriodsData> {
  const isoDate = date.toISOString().split('T')[0]!;
  // Cache by date + rounded coords — same as panchang. Times of day shift
  // by location, so coords matter; date matters because they reset daily.
  const key = `${isoDate}|${birthData.latitude.toFixed(2)},${birthData.longitude.toFixed(2)}`;
  if (_periodsCache?.key === key) return _periodsCache.data;
  if (_periodsInflight?.key === key) return _periodsInflight.promise;

  // Local-noon anchors the response to the requested date regardless of UTC drift.
  const datetime = formatDateTime(isoDate, '12:00', birthData.timezone);
  const params = {
    datetime,
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1',
    la: 'en',
  };

  const promise = (async () => {
    try {
      if (__DEV__) console.log(`[Periods] fetching for ${isoDate} @ ${params.coordinates}`);
      // Both endpoints in parallel — they don't share state.
      const [ausRaw, inausRaw] = await Promise.all([
        prokeralaGet('auspicious-period', params).catch((e) => { if (__DEV__) console.warn('[Periods] auspicious failed:', e?.message); return null; }),
        prokeralaGet('inauspicious-period', params).catch((e) => { if (__DEV__) console.warn('[Periods] inauspicious failed:', e?.message); return null; }),
      ]);

      const normalise = (raw: any): MuhuratWindow[] => (raw?.muhurat ?? []).map((m: any) => ({
        id: m.id,
        name: m.name ?? '',
        type: m.type ?? '',
        windows: (m.period ?? []).map((p: any) => ({ start: p.start, end: p.end })),
      }));

      const data: AuspiciousPeriodsData = {
        auspicious: normalise(ausRaw),
        inauspicious: normalise(inausRaw),
        date: isoDate,
      };
      if (__DEV__) console.log(`[Periods] got ${data.auspicious.length} aus + ${data.inauspicious.length} inaus`);
      _periodsCache = { key, data };
      return data;
    } finally {
      if (_periodsInflight?.key === key) _periodsInflight = null;
    }
  })();
  _periodsInflight = { key, promise };
  return promise;
}

// ─── Mangal Dosha (Mars-related challenge for partnerships) ─────────────────

let _mangalCache: { key: string; data: MangalDoshaInfo } | null = null;
let _mangalInflight: { key: string; promise: Promise<MangalDoshaInfo> } | null = null;

export async function getMangalDosha(birthData: BirthData): Promise<MangalDoshaInfo> {
  // Mangal Dosha is a property of the natal chart only — doesn't change
  // by date. Cache for the session keyed on birth datetime + rounded coords.
  const key = `${birthData.dateOfBirth}|${birthData.timeOfBirth}|${birthData.latitude.toFixed(2)},${birthData.longitude.toFixed(2)}`;
  if (_mangalCache?.key === key) return _mangalCache.data;
  if (_mangalInflight?.key === key) return _mangalInflight.promise;

  const params = {
    datetime: formatDateTime(birthData.dateOfBirth, birthData.timeOfBirth, birthData.timezone),
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1',
    la: 'en',
  };

  const promise = (async () => {
    try {
      if (__DEV__) console.log('[MangalDosha] fetching natal');
      const raw = await prokeralaGet('mangal-dosha', params);
      if (__DEV__) console.log(`[MangalDosha] has=${raw?.has_dosha}`);
      const data: MangalDoshaInfo = {
        hasDosha: !!raw?.has_dosha,
        // The standalone endpoint doesn't return has_exception or
        // dosha_type — only kundli-matching/advanced does. Default safely.
        hasException: !!raw?.has_exception,
        doshaType: raw?.dosha_type ?? null,
        description: raw?.description ?? '',
      };
      _mangalCache = { key, data };
      return data;
    } finally {
      if (_mangalInflight?.key === key) _mangalInflight = null;
    }
  })();
  _mangalInflight = { key, promise };
  return promise;
}

// ─── Sade Sati / Saturn challenging transit ──────────────────────────────────

export interface SadeSatiData {
  /** True when the user is currently inside any of Saturn's challenging
   *  Moon-relative transits (Sade Sati phases, Ashtama Sani, Kantaka Sani). */
  isInTransit: boolean;
  /** Raw Prokerala phase label — one of "rising" / "peak" / "setting" /
   *  "Ashtama Sani" / "Kantaka Sani" / "Janma Sani" / null. Translated to
   *  plain English in src/lib/sadeSati.ts. */
  phase: string | null;
  /** Prokerala's clinical description, kept for the "classical perspective"
   *  footnote in the modal. */
  description: string;
}

// Saturn moves ~30 arcmin/day; the answer doesn't shift between morning and
// evening for the same user. One fetch per session is plenty. Cached by the
// rounded coords + ISO date so a chart regenerate (lat/lon change) busts it.
let _sadeSatiCache: { key: string; data: SadeSatiData } | null = null;
let _sadeSatiInflight: { key: string; promise: Promise<SadeSatiData> } | null = null;

export async function getSadeSati(
  birthData: BirthData,
  date: Date = new Date(),
): Promise<SadeSatiData> {
  const isoDate = date.toISOString().split('T')[0]!;
  const key = `${isoDate}|${birthData.latitude.toFixed(2)},${birthData.longitude.toFixed(2)}|${birthData.dateOfBirth}|${birthData.timeOfBirth}`;
  if (_sadeSatiCache?.key === key) return _sadeSatiCache.data;
  if (_sadeSatiInflight?.key === key) return _sadeSatiInflight.promise;

  // Sade Sati needs the user's natal datetime + coords (Moon longitude is
  // computed from those). The query datetime is the moment we're asking
  // about — passing the user's birth datetime gives Prokerala both, since
  // their endpoint resolves Saturn's CURRENT transit and the natal Moon
  // from the same input.
  const natalDatetime = formatDateTime(birthData.dateOfBirth, birthData.timeOfBirth, birthData.timezone);
  const params = {
    datetime: natalDatetime,
    coordinates: `${birthData.latitude},${birthData.longitude}`,
    ayanamsa: '1',
  };

  const promise = (async () => {
    try {
      if (__DEV__) console.log(`[SadeSati] fetching for natal ${natalDatetime}`);
      const raw = await prokeralaGet('sade-sati', params);
      if (__DEV__) console.log(`[SadeSati] in_transit=${raw?.is_in_sade_sati} phase=${raw?.transit_phase}`);
      const data: SadeSatiData = {
        isInTransit: !!raw?.is_in_sade_sati,
        phase: raw?.transit_phase ?? null,
        description: raw?.description ?? '',
      };
      _sadeSatiCache = { key, data };
      return data;
    } finally {
      if (_sadeSatiInflight?.key === key) _sadeSatiInflight = null;
    }
  })();
  _sadeSatiInflight = { key, promise };
  return promise;
}

// ─── Ashta-koota / kundli matching ───────────────────────────────────────────

export interface AshtaKootaArea {
  /** 1-8: Varna, Vasya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi. */
  id: number;
  /** Sanskrit name as Prokerala returns it, e.g. "Varna Koot". */
  name: string;
  /** Categorical bucket each partner falls into (e.g. "Vaishya" / "Shudra"). */
  girlBucket: string;
  boyBucket: string;
  /** Points obtained out of max (rounded as Prokerala returns floats). */
  obtainedPoints: number;
  maximumPoints: number;
  /** Prokerala's classical-style explanation of this koota's match. */
  description: string;
}

export interface MangalDoshaInfo {
  hasDosha: boolean;
  hasException: boolean;
  doshaType: string | null;
  description: string;
}

export interface AshtaKootaData {
  totalPoints: number;
  maximumPoints: number;
  /** Overall verdict text from Prokerala (e.g. "Union is Compatible..."). */
  verdict: string;
  /** "good" | "average" | "bad" — used to colour the badge. */
  verdictType: string;
  areas: AshtaKootaArea[];
  girlMangalDosha: MangalDoshaInfo;
  boyMangalDosha: MangalDoshaInfo;
}

let _ashtaKootaCache: { key: string; data: AshtaKootaData } | null = null;
let _ashtaKootaInflight: { key: string; promise: Promise<AshtaKootaData> } | null = null;

export async function getAshtaKoota(
  girl: BirthData,
  boy: BirthData,
): Promise<AshtaKootaData> {
  // Cache key is birth-data-only — Ashta-koota doesn't change by date, so
  // the same partner-pair always resolves the same answer.
  const key =
    `${girl.dateOfBirth}|${girl.timeOfBirth}|${girl.latitude.toFixed(2)},${girl.longitude.toFixed(2)}` +
    `→${boy.dateOfBirth}|${boy.timeOfBirth}|${boy.latitude.toFixed(2)},${boy.longitude.toFixed(2)}`;
  if (_ashtaKootaCache?.key === key) return _ashtaKootaCache.data;
  if (_ashtaKootaInflight?.key === key) return _ashtaKootaInflight.promise;

  // Prokerala's gender-named params predate modern usage; we keep the
  // `girl_*` / `boy_*` mapping as the API requires it. The classical
  // Ashtakoota rules are gendered in Vedic tradition, so the API doesn't
  // accept symmetric params.
  const params = {
    girl_dob: formatDateTime(girl.dateOfBirth, girl.timeOfBirth, girl.timezone),
    girl_coordinates: `${girl.latitude},${girl.longitude}`,
    boy_dob: formatDateTime(boy.dateOfBirth, boy.timeOfBirth, boy.timezone),
    boy_coordinates: `${boy.latitude},${boy.longitude}`,
    ayanamsa: '1',
    la: 'en',
  };

  const promise = (async () => {
    try {
      if (__DEV__) console.log('[AshtaKoota] fetching for partner pair');
      const raw = await prokeralaGet('kundli-matching/advanced', params);
      if (__DEV__) console.log(`[AshtaKoota] total=${raw?.guna_milan?.total_points}/${raw?.guna_milan?.maximum_points}`);

      const areas: AshtaKootaArea[] = (raw?.guna_milan?.guna ?? []).map((g: any) => ({
        id: g.id,
        name: g.name ?? '',
        girlBucket: g.girl_koot ?? '',
        boyBucket: g.boy_koot ?? '',
        obtainedPoints: Number(g.obtained_points ?? 0),
        maximumPoints: Number(g.maximum_points ?? 0),
        description: g.description ?? '',
      }));

      const data: AshtaKootaData = {
        totalPoints: Number(raw?.guna_milan?.total_points ?? 0),
        maximumPoints: Number(raw?.guna_milan?.maximum_points ?? 36),
        verdict: raw?.message?.description ?? '',
        verdictType: raw?.message?.type ?? '',
        areas,
        girlMangalDosha: {
          hasDosha: !!raw?.girl_mangal_dosha_details?.has_dosha,
          hasException: !!raw?.girl_mangal_dosha_details?.has_exception,
          doshaType: raw?.girl_mangal_dosha_details?.dosha_type ?? null,
          description: raw?.girl_mangal_dosha_details?.description ?? '',
        },
        boyMangalDosha: {
          hasDosha: !!raw?.boy_mangal_dosha_details?.has_dosha,
          hasException: !!raw?.boy_mangal_dosha_details?.has_exception,
          doshaType: raw?.boy_mangal_dosha_details?.dosha_type ?? null,
          description: raw?.boy_mangal_dosha_details?.description ?? '',
        },
      };
      _ashtaKootaCache = { key, data };
      return data;
    } finally {
      if (_ashtaKootaInflight?.key === key) _ashtaKootaInflight = null;
    }
  })();
  _ashtaKootaInflight = { key, promise };
  return promise;
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

  // The v2 planet-position endpoint returns the ascendant alongside the
  // grahas in planet_position[]. Pull it out (it's a more accurate source
  // than computeFallbackLagnaSignIndex), then drop it from the planet list
  // so chart.planets stays at the canonical 9 grahas.
  const allRaw = planetData?.planet_position ?? kundliData?.planet_positions ?? [];
  const rawAscendant = allRaw.find((p: any) =>
    typeof p?.name === 'string' && /^ascendant$/i.test(p.name),
  );
  const rawPlanets = allRaw.filter((p: any) => p !== rawAscendant);

  // Parse lagna — prefer planet-position's Ascendant (v2), then kundli's
  // ascendant block (v1), then a local fallback computation.
  let lagnaSignIndex: number;
  if (rawAscendant && typeof rawAscendant.longitude === 'number') {
    lagnaSignIndex = Math.floor(rawAscendant.longitude / 30) % 12;
  } else if (kundliData?.ascendant?.rasi?.id != null) {
    lagnaSignIndex = kundliData.ascendant.rasi.id - 1;
  } else {
    lagnaSignIndex = computeFallbackLagnaSignIndex(birthData);
  }
  const lagna = SIGNS[lagnaSignIndex] ?? 'Libra';

  // Parse planets
  let planets: PlanetPosition[] = [];

  if (__DEV__) {
    console.log('[Prokerala] raw planet array:', JSON.stringify(rawPlanets, null, 2));
  }

  if (rawPlanets.length > 0) {
    planets = rawPlanets.map((p: any) => parsePlanetPosition(p, lagnaSignIndex));
    // Older Prokerala APIs (v1 / sandbox) labelled the south node "Rahu" and
    // the north node "Ketu" — inverted from Vedic convention. The v2 / live
    // API returns nodes correctly labelled. Detect by the planet wire shape:
    // v2 uses `longitude: <number>`; v1 uses `longitude: { degrees, ... }`.
    // If the swap runs against v2 data it produces inverted nodes — every
    // interpretation that depends on which house the nodes occupy flips.
    const usesInvertedNodeConvention = rawPlanets.some(
      (p: any) => p.longitude && typeof p.longitude === 'object' && 'degrees' in p.longitude,
    );
    if (usesInvertedNodeConvention) {
      planets = planets.map(p => {
        if (p.planet === 'Rahu') return { ...p, planet: 'Ketu' };
        if (p.planet === 'Ketu') return { ...p, planet: 'Rahu' };
        return p;
      });
    }
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

  return raw.map((d: any) => {
    const start = new Date(d.start ?? d.start_date);
    const end = new Date(d.end ?? d.end_date);
    const planet = normalizePlanetName(d.planet ?? d.graha ?? '');
    return {
      planet,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      years: MAHADASHA_YEARS[planet] ?? 7,
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

// Sidereal longitude for a planet (0-360°). Used so kendra/trine checks are
// robust to small fallback errors that flip a planet across a sign boundary.
const lon = (p: PlanetPosition): number => p.signIndex * 30 + p.degree;

// Two planets are in mutual kendras (1/4/7/10) if their longitudes differ by
// a multiple of 90° within `tolDeg`. Tolerance covers the ±2-3° drift from
// fallback Moon math without admitting unrelated 5th/9th positions.
function inMutualKendra(a: PlanetPosition, b: PlanetPosition, tolDeg = 8): boolean {
  let d = Math.abs(lon(a) - lon(b)) % 360;
  if (d > 180) d = 360 - d;
  // Distances 0, 90, or 180 (the latter covers the 7th-house case).
  return [0, 90, 180].some((target) => Math.abs(d - target) <= tolDeg);
}

// Two planets in the same sign — within tolerance of being conjunct.
function sameSign(a: PlanetPosition, b: PlanetPosition, tolDeg = 12): boolean {
  if (a.signIndex === b.signIndex) return true;
  // Catch borderline conjunctions across a sign boundary
  let d = Math.abs(lon(a) - lon(b)) % 360;
  if (d > 180) d = 360 - d;
  return d <= tolDeg;
}

// Sign rulerships — used for parivartana (mutual exchange) and own-sign yogas.
const SIGN_RULER: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun',   Virgo: 'Mercury', Libra: 'Venus',   Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

function detectBasicYogas(planets: PlanetPosition[]): string[] {
  const yogas: string[] = [];
  const get = (name: string) => planets.find(p => p.planet === name);

  const sun = get('Sun');
  const moon = get('Moon');
  const mars = get('Mars');
  const mercury = get('Mercury');
  const jupiter = get('Jupiter');
  const venus = get('Venus');
  const saturn = get('Saturn');

  // Gajakesari — Moon and Jupiter in mutual kendras. Longitude-based with
  // tolerance so a 1-2° fallback error doesn't break detection at the boundary.
  if (moon && jupiter && inMutualKendra(moon, jupiter)) {
    yogas.push('Gajakesari Yoga');
  }

  // Budhaditya — Sun and Mercury conjunct (within 12°, typical for them).
  if (sun && mercury && sameSign(sun, mercury)) {
    yogas.push('Budhaditya Yoga');
  }

  // Chandra-Mangala — Moon and Mars conjunct or in mutual exchange.
  if (moon && mars && sameSign(moon, mars)) {
    yogas.push('Chandra-Mangala Yoga');
  }

  // Lakshmi — Venus in own sign or kendra (1/4/7/10 from lagna). Venus is
  // a kendra-lord here when in 1/4/7/10 by house.
  if (venus && [1, 4, 7, 10].includes(venus.house)) {
    yogas.push('Lakshmi Yoga');
  }

  // Hamsa (one of the Pancha Mahapurusha): Jupiter in own/exalted sign in a kendra.
  if (jupiter && [1, 4, 7, 10].includes(jupiter.house)
      && (jupiter.isExalted || ['Sagittarius', 'Pisces'].includes(jupiter.sign))) {
    yogas.push('Hamsa Yoga');
  }

  // Malavya: Venus in own/exalted sign in a kendra.
  if (venus && [1, 4, 7, 10].includes(venus.house)
      && (venus.isExalted || ['Taurus', 'Libra'].includes(venus.sign))) {
    yogas.push('Malavya Yoga');
  }

  // Sasha: Saturn in own/exalted sign in a kendra.
  if (saturn && [1, 4, 7, 10].includes(saturn.house)
      && (saturn.isExalted || ['Capricorn', 'Aquarius'].includes(saturn.sign))) {
    yogas.push('Sasha Yoga');
  }

  // Ruchaka: Mars in own/exalted sign in a kendra.
  if (mars && [1, 4, 7, 10].includes(mars.house)
      && (mars.isExalted || ['Aries', 'Scorpio'].includes(mars.sign))) {
    yogas.push('Ruchaka Yoga');
  }

  // Bhadra: Mercury in own/exalted sign in a kendra.
  if (mercury && [1, 4, 7, 10].includes(mercury.house)
      && (mercury.isExalted || ['Gemini', 'Virgo'].includes(mercury.sign))) {
    yogas.push('Bhadra Yoga');
  }

  // Parivartana — any two planets in mutual sign exchange (one occupies the
  // other's sign). Detect at most one to keep the list tight.
  for (let i = 0; i < planets.length && !yogas.some(y => y.startsWith('Parivartana')); i++) {
    const a = planets[i]!;
    if (a.planet === 'Rahu' || a.planet === 'Ketu') continue;
    const aRuler = SIGN_RULER[a.sign];
    if (!aRuler || aRuler === a.planet) continue;
    const b = get(aRuler);
    if (b && SIGN_RULER[b.sign] === a.planet) {
      yogas.push(`Parivartana Yoga (${a.planet}–${b.planet})`);
    }
  }

  // Exalted planets — each one a recognised yoga in its own right.
  planets.filter(p => p.isExalted).forEach(p => yogas.push(`${p.planet} Exaltation Yoga`));

  // Final fallback so we never return an empty list.
  if (yogas.length === 0) yogas.push('Dharma Karmadhipati Yoga');

  return yogas.slice(0, 8);
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
  // Use computeOffset (Intl.DateTimeFormat-backed) for the actual birth date so historical
  // DST rules are respected — e.g. US before 1987, India before 1945.
  const tzOffset = offsetStrToHours(computeOffset(birthData.dateOfBirth, birthData.timeOfBirth || '12:00', birthData.timezone));
  const utcHour = ((localHour - tzOffset) % 24 + 24) % 24;
  const dayFraction = utcHour / 24;

  const julianDay = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) + Math.floor(275 * (month + 1) / 9) + day + dayFraction + 1721013.5;

  const T = (julianDay - 2451545.0) / 36525;

  // Moon's main perturbation corrections (Meeus, Ch. 47).
  // Mean longitude alone can be off by ~5°; these five terms reduce error to <1°,
  // which prevents the dasha balance from shifting by multiple years in approximate mode.
  const moonMean = 218.3165 + 481267.8813 * T;
  const D  = ((297.8502 + 445267.1115 * T) % 360) * Math.PI / 180; // mean elongation
  const Ms = ((357.5291 +  35999.0503 * T) % 360) * Math.PI / 180; // Sun mean anomaly
  const Mp = ((134.9634 + 477198.8676 * T) % 360) * Math.PI / 180; // Moon mean anomaly
  const moonTrue = moonMean
    + 6.289 * Math.sin(Mp)
    - 1.274 * Math.sin(2 * D - Mp)
    + 0.658 * Math.sin(2 * D)
    + 0.214 * Math.sin(2 * Mp)
    - 0.186 * Math.sin(Ms);

  // Sun's mean longitude and equation of center
  const sunGeo = 280.46646 + 36000.76983 * T;
  // Sun equation of center: converts mean → true geocentric longitude (~1° improvement)
  const sunTrue = sunGeo + 1.914 * Math.sin(Ms) + 0.020 * Math.sin(2 * Ms);
  // Earth's true heliocentric longitude = Sun true geocentric + 180°
  const earthHelioTrue = sunTrue + 180;

  // Geocentric longitude from heliocentric: works for ALL planets (inner and outer).
  // r_E = 1 AU; r_planet in AU. Uses Earth's TRUE heliocentric position for accuracy.
  const geoFromHelio = (L_planet: number, r_planet: number): number => {
    const Lp = (L_planet * Math.PI) / 180;
    const Le = (earthHelioTrue * Math.PI) / 180;
    const y = r_planet * Math.sin(Lp) - Math.sin(Le);
    const x = r_planet * Math.cos(Lp) - Math.cos(Le);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  // Equation of center (degrees) for a planet with eccentricity e, mean anomaly M_deg.
  // Two-term approximation; accurate to ~0.01° for solar system planets.
  const eqCenter = (e: number, M_deg: number): number => {
    const M = (M_deg * Math.PI) / 180;
    return (2 * e - Math.pow(e, 3) / 4) * (180 / Math.PI) * Math.sin(M)
      + (5 * Math.pow(e, 2) / 4) * (180 / Math.PI) * Math.sin(2 * M);
  };

  // Outer-planet geocentric: apply equation of center to get true helio longitude, then
  // convert to geocentric via vector subtraction from Earth. Required because mean helio
  // longitude for Mars can be ~18° off from the geocentric value the user sees on screen.
  const outerGeo = (L_mean: number, M_deg: number, e: number, r: number): number =>
    geoFromHelio(L_mean + eqCenter(e, M_deg), r);

  const rawPositions: Record<string, number> = {
    Sun:     sunTrue,
    Moon:    moonTrue % 360,
    Mercury: geoFromHelio(252.2509 + 149472.6746 * T, 0.387),
    Venus:   geoFromHelio(181.9798 +  58517.8156 * T, 0.723),
    // Outer planets need true heliocentric + geocentric vector conversion.
    // Using mean longitude directly (old code) put Mars ~18° off: Cancer instead of Gemini.
    Mars:    outerGeo(355.433 + 19140.2993 * T,  19.373 + 19140.2993 * T, 0.09341, 1.524),
    Jupiter: outerGeo( 34.352 +  3034.9057 * T,  20.020 +  3034.6748 * T, 0.04849, 5.203),
    Saturn:  outerGeo( 50.077 +  1222.1138 * T, 317.020 +  1221.5515 * T, 0.05415, 9.537),
    Rahu:    (125.0445 - 1934.1363 * T) % 360,
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
  }).concat((() => {
    // Derive Ketu exactly opposite Rahu (mean node + 180°)
    const rahuTropical = (125.0445 - 1934.1363 * T) % 360;
    const ketuTropical = rahuTropical + 180;
    const ketuSidereal = ((ketuTropical - ayanamsa) % 360 + 360) % 360;
    const ketuSignIndex = Math.floor(ketuSidereal / 30);
    const nakWidth = 360 / 27;
    const ketuNakIdx = Math.floor(ketuSidereal / nakWidth) % 27;
    const ketuPada = Math.min(Math.floor((ketuSidereal % nakWidth) / (nakWidth / 4)) + 1, 4);
    return [{
      planet: 'Ketu',
      sign: SIGNS[ketuSignIndex] ?? 'Aries',
      signIndex: ketuSignIndex,
      degree: Math.round((ketuSidereal % 30) * 100) / 100,
      house: ((ketuSignIndex - lagnaSignIndex + 12) % 12) + 1,
      nakshatra: NAKSHATRA_NAMES[ketuNakIdx] ?? 'Ashwini',
      pada: ketuPada,
      isRetrograde: true,
      isExalted: false,
      isDebilitated: false,
    }];
  })());
}

function buildFallbackDashas(planets: PlanetPosition[], birthData: BirthData): DashaPeriod[] {
  const moon = planets.find(p => p.planet === 'Moon');
  const moonDeg = moon ? moon.signIndex * 30 + moon.degree : 90;
  return calculateVimshottariDasha(moonDeg, new Date(birthData.dateOfBirth));
}
