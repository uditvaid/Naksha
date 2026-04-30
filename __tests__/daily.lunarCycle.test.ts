import { buildLunarCycleReflection } from '@lib/daily/lunarCycle';
import type { DailyRecord } from '@store/dailyContinuityStore';

const makeRecord = (date: string, lunarPhase = 'full_moon'): DailyRecord => ({
  id: Math.random().toString(36),
  date,
  notification: 'test',
  card: 'test card',
  expanded: 'expanded',
  tone: 'reflective',
  lunarPhase,
  mahadasha: 'Saturn',
  antardasha: null,
  isQuietDay: false,
  isDeepDay: false,
  hasCallback: false,
});

describe('buildLunarCycleReflection', () => {
  const today = new Date('2025-06-15T12:00:00Z');

  it('returns required fields', () => {
    const result = buildLunarCycleReflection([], today);
    expect(result).toHaveProperty('currentPhase');
    expect(result).toHaveProperty('cycleStartDate');
    expect(result).toHaveProperty('engagementPattern');
    expect(result).toHaveProperty('phaseObservation');
    expect(result).toHaveProperty('rhythmNote');
  });

  it('produces beginning message for empty records', () => {
    const result = buildLunarCycleReflection([], today);
    expect(result.engagementPattern.toLowerCase()).toContain('beginning');
  });

  it('counts days correctly', () => {
    // Add records within the current cycle
    const cycleStart = new Date(today);
    cycleStart.setDate(cycleStart.getDate() - 5);
    const records = [
      makeRecord(cycleStart.toISOString().split('T')[0]!),
      makeRecord(today.toISOString().split('T')[0]!),
    ];
    const result = buildLunarCycleReflection(records, today);
    expect(result.engagementPattern).toMatch(/\d+ day/);
  });

  it('does not contain numeric streak language', () => {
    const records = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return makeRecord(d.toISOString().split('T')[0]!);
    });
    const result = buildLunarCycleReflection(records, today);
    // Should not reference "streak" anywhere
    expect(result.rhythmNote.toLowerCase()).not.toContain('streak');
    expect(result.engagementPattern.toLowerCase()).not.toContain('streak');
  });

  it('cycleStartDate is a valid YYYY-MM-DD string', () => {
    const result = buildLunarCycleReflection([], today);
    expect(result.cycleStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
