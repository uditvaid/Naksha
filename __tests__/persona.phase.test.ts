import {
  computePhaseFromDays,
  computeAbsenceDays,
  getEffectivePhase,
  buildPhaseBlock,
} from '@lib/persona/phase';
import type { PhaseState } from '@lib/persona/phase';

describe('computePhaseFromDays', () => {
  it('returns initiation for 0 days', () => {
    expect(computePhaseFromDays(0)).toBe('initiation');
  });

  it('returns building for 5 days', () => {
    expect(computePhaseFromDays(5)).toBe('building');
  });

  it('returns established for 30 days', () => {
    expect(computePhaseFromDays(30)).toBe('established');
  });

  it('returns deep for 100 days', () => {
    expect(computePhaseFromDays(100)).toBe('deep');
  });

  it('returns building at threshold boundary', () => {
    expect(computePhaseFromDays(4)).toBe('initiation');
    expect(computePhaseFromDays(5)).toBe('building');
  });
});

describe('computeAbsenceDays', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]!;
    expect(computeAbsenceDays(today)).toBe(0);
  });

  it('returns approximately 30 for a month ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const days = computeAbsenceDays(d.toISOString().split('T')[0]!);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('returns 0 for null', () => {
    expect(computeAbsenceDays(null)).toBe(0);
  });
});

describe('getEffectivePhase', () => {
  it('regresses one level after 30 days absence', () => {
    expect(getEffectivePhase('established', 35)).toBe('building');
  });

  it('regresses two levels after 90 days absence', () => {
    expect(getEffectivePhase('deep', 95)).toBe('building');
  });

  it('resets to initiation after 365 days', () => {
    expect(getEffectivePhase('deep', 400)).toBe('initiation');
  });

  it('does not regress below initiation', () => {
    expect(getEffectivePhase('initiation', 50)).toBe('initiation');
  });

  it('does not regress for short absences', () => {
    expect(getEffectivePhase('established', 10)).toBe('established');
  });
});

describe('buildPhaseBlock', () => {
  const baseState: PhaseState = {
    phase: 'established',
    sessionDays: 35,
    lastSessionDate: new Date().toISOString().split('T')[0]!,
    phaseEnteredDate: new Date().toISOString().split('T')[0]!,
    justTransitioned: false,
    previousPhase: null,
  };

  it('returns a non-empty string', () => {
    const block = buildPhaseBlock(baseState, 0);
    expect(block.length).toBeGreaterThan(0);
  });

  it('includes phase name', () => {
    const block = buildPhaseBlock(baseState, 0);
    expect(block.toLowerCase()).toContain('established');
  });

  it('includes absence note when absent 7+ days', () => {
    const block = buildPhaseBlock(baseState, 8);
    expect(block).toMatch(/away|absent|absence|days/i);
  });

  it('includes transition hint when justTransitioned with previousPhase', () => {
    const state: PhaseState = { ...baseState, justTransitioned: true, previousPhase: 'building' };
    const block = buildPhaseBlock(state, 0);
    expect(block).toMatch(/TRANSITION/i);
  });
});
