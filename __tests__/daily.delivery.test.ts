import {
  computeDeliveryHour,
  computeDeliveryDecision,
  recordOpenHour,
  REENGAGEMENT_NOTIFICATION,
} from '@lib/daily/delivery';
import { DEFAULT_PROFILE } from '@lib/daily/engagementProfile';
import type { DeliveryState } from '@lib/daily/delivery';

const today = '2025-06-15';
const defaultState: DeliveryState = {
  lastDeliveryDate: null,
  isPaused: false,
  reengagementSentDate: null,
  pausedSinceDate: null,
};

describe('computeDeliveryHour', () => {
  it('returns DEFAULT_HOUR before 14 observations', () => {
    const hour = computeDeliveryHour({ ...DEFAULT_PROFILE, observedOpenTimes: [7, 8, 9] });
    expect(hour).toBe(8);
  });

  it('uses median after 14+ observations', () => {
    const times = Array.from({ length: 15 }, () => 9); // all 9am
    const hour = computeDeliveryHour({ ...DEFAULT_PROFILE, observedOpenTimes: times });
    expect(hour).toBe(9);
  });

  it('clamps to 6-22 range', () => {
    const times = Array.from({ length: 15 }, () => 3); // 3am
    const hour = computeDeliveryHour({ ...DEFAULT_PROFILE, observedOpenTimes: times });
    expect(hour).toBeGreaterThanOrEqual(6);
  });
});

describe('computeDeliveryDecision', () => {
  it('skips when already delivered today', () => {
    const result = computeDeliveryDecision(DEFAULT_PROFILE, { ...defaultState, lastDeliveryDate: today }, today);
    expect(result.action).toBe('skip');
  });

  it('delivers on a fresh day', () => {
    const result = computeDeliveryDecision(DEFAULT_PROFILE, defaultState, today);
    expect(result.action).toBe('deliver');
    if (result.action === 'deliver') {
      expect(result.isReengagement).toBe(false);
    }
  });

  it('pauses when 3+ consecutive skips', () => {
    const result = computeDeliveryDecision(
      { ...DEFAULT_PROFILE, consecutiveSkips: 3 },
      defaultState,
      today
    );
    expect(result.action).toBe('pause');
  });

  it('sends reengagement when paused and not yet sent', () => {
    const result = computeDeliveryDecision(
      DEFAULT_PROFILE,
      { ...defaultState, isPaused: true, reengagementSentDate: null },
      today
    );
    expect(result.action).toBe('deliver');
    if (result.action === 'deliver') {
      expect(result.isReengagement).toBe(true);
    }
  });

  it('stays silent when paused and reengagement already sent', () => {
    const result = computeDeliveryDecision(
      DEFAULT_PROFILE,
      { ...defaultState, isPaused: true, reengagementSentDate: '2025-06-10' },
      today
    );
    expect(result.action).toBe('skip');
  });
});

describe('recordOpenHour', () => {
  it('appends hour to list', () => {
    const result = recordOpenHour([7, 8], 9);
    expect(result).toContain(9);
  });

  it('keeps last 30 observations', () => {
    const initial = Array.from({ length: 30 }, (_, i) => i % 24);
    const result = recordOpenHour(initial, 10);
    expect(result).toHaveLength(30);
    expect(result[result.length - 1]).toBe(10);
  });
});

describe('REENGAGEMENT_NOTIFICATION', () => {
  it('is a non-empty string', () => {
    expect(typeof REENGAGEMENT_NOTIFICATION).toBe('string');
    expect(REENGAGEMENT_NOTIFICATION.length).toBeGreaterThan(10);
  });
});
