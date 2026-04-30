import { deriveArchetype } from '@lib/persona/archetype';
import type { ChartData, PlanetPosition } from '@store/userStore';

const baseChart: ChartData = {
  lagna: 'Libra',
  lagnaSign: 6,
  navamshaLagna: 'Libra',
  planets: [],
  dashas: [],
  yogas: [],
};

const saturnPlanet = (overrides: Partial<PlanetPosition> = {}): PlanetPosition => ({
  planet: 'Saturn',
  sign: 'Libra',
  signIndex: 6,
  degree: 15,
  house: 1,
  nakshatra: 'Chitra',
  pada: 3,
  isRetrograde: false,
  isExalted: true,
  isDebilitated: false,
  ...overrides,
});

describe('deriveArchetype', () => {
  it('returns saturn_ascetic when Saturn is exalted in lagna', () => {
    const chart: ChartData = { ...baseChart, planets: [saturnPlanet()] };
    const result = deriveArchetype(chart);
    expect(result.key).toBe('saturn_ascetic');
  });

  it('returns a valid archetype for empty/diffuse chart', () => {
    const result = deriveArchetype(baseChart);
    const validKeys = ['saturn_ascetic','jupiter_sage','mars_warrior','sun_sovereign','moon_mystic','mercury_messenger','venus_mystic','rahu_seeker'];
    expect(validKeys).toContain(result.key);
  });

  it('returns jupiter_sage when Jupiter is strong (exalted in kendra)', () => {
    const chart: ChartData = {
      ...baseChart,
      planets: [{
        planet: 'Jupiter',
        sign: 'Cancer',
        signIndex: 3,
        degree: 10,
        house: 10,
        nakshatra: 'Pushya',
        pada: 2,
        isRetrograde: false,
        isExalted: true,
        isDebilitated: false,
      }],
    };
    const result = deriveArchetype(chart);
    expect(result.key).toBe('jupiter_sage');
  });

  it('result has all required fields', () => {
    const result = deriveArchetype(baseChart);
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('teachingMethod');
    expect(result).toHaveProperty('planet');
    expect(result).toHaveProperty('dominantPlanetStrength');
  });
});

describe('archetype scoring via chart composition', () => {
  it('exalted Saturn chart produces saturn_ascetic', () => {
    const chart: ChartData = { ...baseChart, planets: [saturnPlanet()] };
    const result = deriveArchetype(chart);
    expect(result.key).toBe('saturn_ascetic');
  });

  it('exalted Saturn has higher dominantPlanetStrength than debilitated', () => {
    const exaltedChart: ChartData = { ...baseChart, planets: [saturnPlanet()] };
    const debilitatedChart: ChartData = {
      ...baseChart,
      planets: [saturnPlanet({ sign: 'Aries', signIndex: 0, house: 7, isExalted: false, isDebilitated: true })],
    };
    const r1 = deriveArchetype(exaltedChart);
    const r2 = deriveArchetype(debilitatedChart);
    expect(r1.dominantPlanetStrength).toBeGreaterThan(r2.dominantPlanetStrength);
  });

  it('retrograde planet still scores its archetype', () => {
    const retroChart: ChartData = { ...baseChart, planets: [saturnPlanet({ isRetrograde: true })] };
    const result = deriveArchetype(retroChart);
    expect(result.key).toBe('saturn_ascetic');
  });
});
