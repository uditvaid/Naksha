import {
  applyReaction,
  isDisengaging,
  shouldSendToday,
  getUserFacingProfile,
  DEFAULT_PROFILE,
} from '@lib/daily/engagementProfile';
import type { EngagementProfile, DailyEngagementReaction } from '@lib/daily/engagementProfile';

const today = new Date().toISOString().split('T')[0]!;

const skipReaction: DailyEngagementReaction = {
  date: today,
  tone: 'reflective',
  reaction: 'skipped',
  opened: false,
  expanded: false,
};

const resonatedReaction: DailyEngagementReaction = {
  date: today,
  tone: 'direct' as any, // tone types vary; use reflective as fallback
  reaction: 'resonated',
  opened: true,
  expanded: true,
  investmentPath: 'reflect',
};

const positiveReaction: DailyEngagementReaction = {
  date: today,
  tone: 'reflective',
  reaction: 'resonated',
  opened: true,
  expanded: false,
};

const negativeReaction: DailyEngagementReaction = {
  date: today,
  tone: 'philosophical',
  reaction: 'didnt_land',
  opened: true,
  expanded: false,
};

describe('applyReaction', () => {
  it('increments consecutiveSkips on skip', () => {
    const result = applyReaction(DEFAULT_PROFILE, skipReaction);
    expect(result.consecutiveSkips).toBe(1);
  });

  it('resets consecutiveSkips on resonated reaction', () => {
    const profile: EngagementProfile = { ...DEFAULT_PROFILE, consecutiveSkips: 3 };
    const result = applyReaction(profile, positiveReaction);
    expect(result.consecutiveSkips).toBe(0);
  });

  it('increases tone score for resonated reaction', () => {
    const result = applyReaction(DEFAULT_PROFILE, positiveReaction);
    expect(result.toneScores.reflective).toBeGreaterThan(DEFAULT_PROFILE.toneScores.reflective);
  });

  it('decreases tone score for didnt_land reaction', () => {
    const result = applyReaction(DEFAULT_PROFILE, negativeReaction);
    expect(result.toneScores.philosophical).toBeLessThan(DEFAULT_PROFILE.toneScores.philosophical);
  });

  it('records open time when opened=true', () => {
    const result = applyReaction(DEFAULT_PROFILE, positiveReaction);
    expect(result.observedOpenTimes).toHaveLength(1);
  });

  it('does not record open time when opened=false', () => {
    const result = applyReaction(DEFAULT_PROFILE, skipReaction);
    expect(result.observedOpenTimes).toHaveLength(0);
  });

  it('updates investment path when investmentPath provided', () => {
    // After 20 reflect reactions, preferredInvestmentPath should update
    let profile = DEFAULT_PROFILE;
    for (let i = 0; i < 20; i++) {
      profile = applyReaction(profile, resonatedReaction);
    }
    expect(profile.preferredInvestmentPath).toBe('reflect');
  });
});

describe('isDisengaging', () => {
  it('returns true when consecutiveSkips >= 3', () => {
    expect(isDisengaging({ ...DEFAULT_PROFILE, consecutiveSkips: 3 })).toBe(true);
    expect(isDisengaging({ ...DEFAULT_PROFILE, consecutiveSkips: 5 })).toBe(true);
  });

  it('returns false when consecutiveSkips < 3', () => {
    expect(isDisengaging({ ...DEFAULT_PROFILE, consecutiveSkips: 2 })).toBe(false);
    expect(isDisengaging(DEFAULT_PROFILE)).toBe(false);
  });
});

describe('shouldSendToday', () => {
  it('always returns true for daily cadence', () => {
    expect(shouldSendToday({ ...DEFAULT_PROFILE, preferredCadence: 'daily' })).toBe(true);
  });

  it('returns true for every_other_day when no prior open', () => {
    expect(shouldSendToday({ ...DEFAULT_PROFILE, preferredCadence: 'every_other_day', lastOpenDate: null })).toBe(true);
  });
});

describe('getUserFacingProfile', () => {
  it('returns an object with key transparency fields', () => {
    const profile = getUserFacingProfile(DEFAULT_PROFILE);
    expect(typeof profile).toBe('object');
    expect(profile).not.toBeNull();
    // Should have at least a few keys
    expect(Object.keys(profile).length).toBeGreaterThan(0);
  });
});
