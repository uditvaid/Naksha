/**
 * Daily Layer 6 — Adaptive Delivery
 *
 * Determines when and whether to deliver today's daily.
 * Adapts delivery hour after 14 days of observed open times.
 * Handles disengagement: pauses after 3 consecutive skips,
 * sends one "tap to resume" message, waits for explicit opt-back-in.
 */

import { EngagementProfile } from './engagementProfile';

export type DeliveryDecision =
  | { action: 'deliver'; scheduledHour: number; isReengagement: boolean }
  | { action: 'pause'; reason: 'disengaging' }
  | { action: 'skip'; reason: 'already_sent' | 'cadence' | 'paused' };

export interface DeliveryState {
  lastDeliveryDate: string | null;   // YYYY-MM-DD
  isPaused: boolean;
  reengagementSentDate: string | null;
  pausedSinceDate: string | null;
}

const DEFAULT_HOUR = 8; // 8am local
const MIN_OBSERVATION_DAYS = 14;

/**
 * Compute the delivery hour to use.
 * After MIN_OBSERVATION_DAYS, use the median observed open time.
 * Otherwise fall back to DEFAULT_HOUR.
 */
export function computeDeliveryHour(profile: EngagementProfile): number {
  const observed = profile.observedOpenTimes;
  if (observed.length < MIN_OBSERVATION_DAYS) return DEFAULT_HOUR;

  const sorted = [...observed].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;

  // Clamp to reasonable notification window (6am–10pm)
  return Math.max(6, Math.min(22, median));
}

/**
 * Decide what to do for today's delivery.
 */
export function computeDeliveryDecision(
  profile: EngagementProfile,
  state: DeliveryState,
  today: string, // YYYY-MM-DD
): DeliveryDecision {
  // Already delivered today
  if (state.lastDeliveryDate === today) {
    return { action: 'skip', reason: 'already_sent' };
  }

  // Cadence check
  if (!shouldDeliverToday(profile, today)) {
    return { action: 'skip', reason: 'cadence' };
  }

  // Paused due to disengagement
  if (state.isPaused) {
    // Reengagement message was already sent — stay silent until user acts
    if (state.reengagementSentDate !== null) {
      return { action: 'skip', reason: 'paused' };
    }
    // Haven't sent reengagement yet — trigger it
    return { action: 'deliver', scheduledHour: computeDeliveryHour(profile), isReengagement: true };
  }

  // Disengagement detection → transition to paused
  if (profile.consecutiveSkips >= 3) {
    return { action: 'pause', reason: 'disengaging' };
  }

  return {
    action: 'deliver',
    scheduledHour: computeDeliveryHour(profile),
    isReengagement: false,
  };
}

/**
 * Simple cadence check based on profile.preferredCadence.
 */
function shouldDeliverToday(profile: EngagementProfile, today: string): boolean {
  if (profile.preferredCadence === 'daily') return true;

  const d = new Date(today);
  const dayOfWeek = d.getDay(); // 0 = Sunday

  if (profile.preferredCadence === 'every_other_day') {
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
    return dayOfYear % 2 === 0;
  }
  if (profile.preferredCadence === 'weekly') {
    return dayOfWeek === 1; // Mondays
  }

  return true;
}

/**
 * The reengagement notification text — sent once, then silence until user opts back in.
 */
export const REENGAGEMENT_NOTIFICATION =
  "Your daily is still here when you're ready. No pressure — tap to see today's.";

/**
 * Record that an open event happened at a given hour (for adaptive timing).
 */
export function recordOpenHour(
  observedOpenTimes: number[],
  hour: number,
): number[] {
  return [...observedOpenTimes, hour].slice(-30); // keep last 30 observations
}
