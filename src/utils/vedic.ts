import { BirthData, ChartData, PlanetPosition, DashaPeriod, AntarDasha } from '@store/userStore';
import { NAKSHATRAS, MAHADASHA_YEARS } from '@constants/astrology';

// Resolve the currently-active mahadasha from a stored dasha list, ignoring the
// persisted `isActive` field which is computed at chart-generation time and
// goes stale after the user crosses a period boundary without regenerating.
export function findActiveDasha(
  dashas: DashaPeriod[] | undefined,
  now: Date = new Date(),
): DashaPeriod | undefined {
  if (!dashas?.length) return undefined;
  const t = now.getTime();
  return dashas.find(
    (d) => new Date(d.startDate).getTime() <= t && t < new Date(d.endDate).getTime(),
  );
}

export function findActiveAntardasha(
  antardashas: AntarDasha[] | undefined,
  now: Date = new Date(),
): AntarDasha | undefined {
  if (!antardashas?.length) return undefined;
  const t = now.getTime();
  return antardashas.find(
    (a) => new Date(a.startDate).getTime() <= t && t < new Date(a.endDate).getTime(),
  );
}

// Lahiri Ayanamsha (approximate)
const LAHIRI_AYANAMSHA_2000 = 23.853;
const AYANAMSHA_RATE = 0.01396; // degrees per year

export function getAyanamsha(year: number): number {
  return LAHIRI_AYANAMSHA_2000 + (year - 2000) * AYANAMSHA_RATE;
}

export function tropicalToSidereal(tropicalDeg: number, year: number): number {
  const ayanamsha = getAyanamsha(year);
  const sidereal = tropicalDeg - ayanamsha;
  return ((sidereal % 360) + 360) % 360;
}

export function degreeToSign(degree: number): { sign: string; signIndex: number; degreeInSign: number } {
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const signIndex = Math.floor(degree / 30);
  return {
    sign: SIGNS[signIndex] ?? 'Aries',
    signIndex,
    degreeInSign: degree % 30,
  };
}

export function degreeToNakshatra(degree: number): { nakshatra: string; pada: number } {
  const nakshatraIndex = Math.floor(((degree % 360) + 360) % 360 / (360 / 27));
  const nakshatra = NAKSHATRAS[nakshatraIndex] ?? NAKSHATRAS[0];
  const positionInNakshatra = degree % (360 / 27);
  const pada = Math.floor(positionInNakshatra / (360 / 108)) + 1;
  return { nakshatra: nakshatra.name, pada: Math.min(pada, 4) };
}

// Vimshottari Dasha calculation
export const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

export function calculateVimshottariDasha(moonDegree: number, birthDate: Date): DashaPeriod[] {
  const { nakshatra } = degreeToNakshatra(moonDegree);
  const nakshatraData = NAKSHATRAS.find(n => n.name === nakshatra);

  if (!nakshatraData) return [];

  // Determine starting planet
  const rulerMap: Record<string, string> = {
    Ketu: 'Ketu', Venus: 'Venus', Sun: 'Sun', Moon: 'Moon',
    Mars: 'Mars', Rahu: 'Rahu', Jupiter: 'Jupiter', Saturn: 'Saturn', Mercury: 'Mercury',
  };
  const startPlanet = rulerMap[nakshatraData.ruler] ?? 'Ketu';
  const startIndex = DASHA_ORDER.indexOf(startPlanet);

  // Calculate elapsed portion. Clamp to [0, 1] — the stored `start` values in
  // NAKSHATRAS are rounded (e.g. 13.333 vs exact 13.333̄), so floating-point
  // arithmetic can produce elapsed slightly outside [0, 1] at nakshatra boundaries.
  const nakshatraStart = nakshatraData.start;
  const nakshatraSpan = 360 / 27;
  const elapsed = Math.max(0, Math.min(1, (moonDegree - nakshatraStart) / nakshatraSpan));
  const totalYears = MAHADASHA_YEARS[startPlanet] ?? 7;
  const elapsedYears = elapsed * totalYears;

  const dashas: DashaPeriod[] = [];
  // Use milliseconds for the initial offset so fractional years are handled correctly.
  // setFullYear(n - 2.6) silently truncates to setFullYear(n - 2), placing the start
  // date months too late. Multiplying by MS_PER_YEAR gives the right calendar date.
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  let currentDate = new Date(birthDate.getTime() - elapsedYears * MS_PER_YEAR);

  for (let i = 0; i < 9; i++) {
    const planetIndex = (startIndex + i) % 9;
    const planet = DASHA_ORDER[planetIndex] ?? 'Ketu';
    const years = MAHADASHA_YEARS[planet] ?? 7;
    const endDate = new Date(currentDate.getTime() + years * MS_PER_YEAR);

    dashas.push({
      planet,
      startDate: currentDate.toISOString(),
      endDate: endDate.toISOString(),
      years,
      antardasha: computeAntardashas(planet, currentDate, years, MS_PER_YEAR),
    });

    currentDate = new Date(endDate);
  }

  return dashas;
}

// Vimshottari antardasha (sub-periods). Each mahadasha contains 9 antardashas
// in the standard cycle order, starting from the mahadasha lord itself. Each
// antardasha's length is `mahadasha.years * antardasha_lord.years / 120`.
function computeAntardashas(
  mahadashaPlanet: string,
  mahadashaStart: Date,
  mahadashaYears: number,
  msPerYear: number,
): AntarDasha[] {
  const startIdx = DASHA_ORDER.indexOf(mahadashaPlanet);
  if (startIdx < 0) return [];

  const antardashas: AntarDasha[] = [];
  let cursor = mahadashaStart.getTime();

  for (let i = 0; i < 9; i++) {
    const planet = DASHA_ORDER[(startIdx + i) % 9] ?? 'Ketu';
    const subYears = (mahadashaYears * (MAHADASHA_YEARS[planet] ?? 7)) / 120;
    const endMs = cursor + subYears * msPerYear;
    antardashas.push({
      planet,
      startDate: new Date(cursor).toISOString(),
      endDate: new Date(endMs).toISOString(),
    });
    cursor = endMs;
  }

  return antardashas;
}

// Calculate life path number for numerology
export function calculateLifePathNumber(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

// Chaldean numerology for names
export function calculateDestinyNumber(name: string): number {
  const CHALDEAN: Record<string, number> = {
    a:1,b:2,c:3,d:4,e:5,f:8,g:3,h:5,i:1,j:1,k:2,l:3,m:4,
    n:5,o:7,p:8,q:1,r:2,s:3,t:4,u:6,v:6,w:6,x:5,y:1,z:7,
  };
  const digits = name.toLowerCase().replace(/[^a-z]/g, '')
    .split('').map(c => CHALDEAN[c] ?? 0);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

export function calculateSoulUrge(name: string): number {
  const VOWELS = 'aeiou';
  const PYTHAGOREAN: Record<string, number> = {
    a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:1,k:2,l:3,m:4,
    n:5,o:6,p:7,q:8,r:9,s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
  };
  const digits = name.toLowerCase().replace(/[^a-z]/g, '')
    .split('').filter(c => VOWELS.includes(c)).map(c => PYTHAGOREAN[c] ?? 0);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

// Personality number from consonants (Pythagorean)
export function calculatePersonalityNumber(name: string): number {
  const VOWELS = 'aeiou';
  const PYTHAGOREAN: Record<string, number> = {
    a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:1,k:2,l:3,m:4,
    n:5,o:6,p:7,q:8,r:9,s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
  };
  const digits = name.toLowerCase().replace(/[^a-z]/g, '')
    .split('').filter(c => !VOWELS.includes(c)).map(c => PYTHAGOREAN[c] ?? 0);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

// Chinese zodiac
export function getChineseZodiac(year: number): { animal: string; element: string } {
  const ANIMALS = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
  const ELEMENTS = ['Metal','Water','Wood','Fire','Earth'];
  const STEMS = ['Yang Metal','Yin Metal','Yang Water','Yin Water','Yang Wood','Yin Wood','Yang Fire','Yin Fire','Yang Earth','Yin Earth'];

  const animalIndex = (year - 4) % 12;
  const stemIndex = (year - 4) % 10;

  return {
    animal: ANIMALS[((animalIndex % 12) + 12) % 12] ?? 'Rat',
    element: STEMS[((stemIndex % 10) + 10) % 10] ?? 'Yang Metal',
  };
}

// House determination using Whole Sign system
export function getWholeSignHouse(planetSignIndex: number, lagnaSignIndex: number): number {
  let house = planetSignIndex - lagnaSignIndex + 1;
  if (house <= 0) house += 12;
  return house;
}

// Format degree for display
export function formatDegree(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${m}'`;
}

// Get planet dignity
export function getPlanetDignity(planet: string, signIndex: number): 'exalted' | 'debilitated' | 'own' | 'neutral' {
  const EXALTATION: Record<string, number> = {
    Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
  };
  const DEBILITATION: Record<string, number> = {
    Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
  };
  const OWN_SIGNS: Record<string, number[]> = {
    Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
  };

  if (EXALTATION[planet] === signIndex) return 'exalted';
  if (DEBILITATION[planet] === signIndex) return 'debilitated';
  if (OWN_SIGNS[planet]?.includes(signIndex)) return 'own';
  return 'neutral';
}
