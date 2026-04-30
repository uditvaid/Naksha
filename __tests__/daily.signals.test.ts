import { computeLunarPhase, computeDailySignals } from '@lib/daily/signals';
import type { ChartData } from '@store/userStore';

const baseChart: ChartData = {
  lagna: 'Libra',
  lagnaSign: 6,
  navamshaLagna: 'Libra',
  planets: [],
  dashas: [
    {
      planet: 'Saturn',
      startDate: '2020-01-01',
      endDate: '2039-01-01',
      years: 19,
      isActive: true,
      antardasha: [],
    }
  ],
  yogas: [],
};

describe('computeLunarPhase', () => {
  it('returns a valid phase string', () => {
    const phase = computeLunarPhase(new Date());
    const validPhases = [
      'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent',
    ];
    expect(validPhases).toContain(phase);
  });

  it('is deterministic for same input', () => {
    const d = new Date('2025-01-15T12:00:00Z');
    expect(computeLunarPhase(d)).toBe(computeLunarPhase(d));
  });

  it('changes over 15 days', () => {
    const d1 = new Date('2025-01-01');
    const d2 = new Date('2025-01-15');
    const p1 = computeLunarPhase(d1);
    const p2 = computeLunarPhase(d2);
    expect(p1).not.toBe(p2);
  });
});

describe('computeDailySignals', () => {
  it('returns a signal set with required fields', () => {
    const signals = computeDailySignals(baseChart, new Date());
    expect(signals).toHaveProperty('mahadasha');
    expect(signals).toHaveProperty('lunarPhase');
    expect(signals).toHaveProperty('overallSignificance');
    expect(signals).toHaveProperty('isQuietDay');
    expect(signals).toHaveProperty('signals');
    expect(Array.isArray(signals.signals)).toBe(true);
  });

  it('identifies active dasha correctly', () => {
    const signals = computeDailySignals(baseChart, new Date());
    expect(signals.mahadasha).toBe('Saturn');
  });

  it('isQuietDay is boolean', () => {
    const signals = computeDailySignals(baseChart, new Date());
    expect(typeof signals.isQuietDay).toBe('boolean');
  });

  it('overallSignificance is between 0 and 1', () => {
    const signals = computeDailySignals(baseChart, new Date());
    expect(signals.overallSignificance).toBeGreaterThanOrEqual(0);
    expect(signals.overallSignificance).toBeLessThanOrEqual(1);
  });
});
