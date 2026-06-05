/**
 * App-open streak.
 *
 * Tracks consecutive calendar days the user has opened the app. Used to:
 *   1. Surface a visible "✦ 14 day streak" badge on the home header
 *   2. Trigger milestone celebration modals at 7 / 14 / 30 / 60 / 100 days
 *   3. Drive a small Guru bonus (extra free question per day at higher streaks)
 *
 * Mirrors the pattern of `tarotStreakStore` but is broader — any tab focus
 * on home should count, not just a tarot pull. No punishment for missed
 * days; the streak just resets and the user starts again.
 *
 * Persisted via zustand's persist middleware. Cleared on app reset.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAppReset } from './appReset';

/** Days at which we surface a celebration modal. Tunable — keep early
 *  milestones close so new users see momentum, space later ones so
 *  there's something to climb toward over months. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365] as const;
export type StreakMilestone = typeof STREAK_MILESTONES[number];

interface AppOpenStreakState {
  /** ISO YYYY-MM-DD of the most recent qualifying open. Null if never. */
  lastOpenDate: string | null;
  /** Current consecutive-days streak. 0 if never opened or just reset. */
  currentStreak: number;
  /** Personal best ever recorded for this user. */
  longestStreak: number;
  /** Total qualifying opens, all time. */
  totalOpens: number;
  /** Milestones for which the celebration modal has already been shown.
   *  Prevents re-showing the same modal on subsequent days at the same
   *  streak value, or on app reload. */
  milestonesAcknowledged: number[];
}

interface AppOpenStreakActions {
  /** Mark today's open. Idempotent — calling multiple times the same day
   *  doesn't double-count. Returns the milestone reached today (if any),
   *  so the caller can decide whether to show the celebration modal. */
  recordOpen: () => { newMilestone: StreakMilestone | null };
  /** Mark a milestone as having been shown to the user. */
  acknowledgeMilestone: (milestone: number) => void;
  reset: () => void;
}

const INITIAL: AppOpenStreakState = {
  lastOpenDate: null,
  currentStreak: 0,
  longestStreak: 0,
  totalOpens: 0,
  milestonesAcknowledged: [],
};

function isYesterday(today: string, last: string): boolean {
  const td = new Date(today);
  const ld = new Date(last);
  const diffDays = Math.round((td.getTime() - ld.getTime()) / 86400000);
  return diffDays === 1;
}

/**
 * Public helper — exported so UI surfaces that show "X questions left"
 * can render the bonus consistently with what canAskGuru actually
 * grants. Returns the number of additional free Guru questions earned
 * by the current streak.
 *
 * Schedule:
 *   ≥ 100 days  → +3 bonus questions
 *   ≥ 30 days   → +2 bonus questions
 *   ≥ 7 days    → +1 bonus question
 */
export function guruBonusForStreak(streak: number): number {
  if (streak >= 100) return 3;
  if (streak >= 30) return 2;
  if (streak >= 7) return 1;
  return 0;
}

export const useAppOpenStreakStore = create<AppOpenStreakState & AppOpenStreakActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      recordOpen: () => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();

        // Same-day re-open: idempotent — no state change, no milestone fire.
        if (state.lastOpenDate === today) {
          return { newMilestone: null };
        }

        const newStreak = state.lastOpenDate && isYesterday(today, state.lastOpenDate)
          ? state.currentStreak + 1
          : 1;

        // Determine whether we crossed a fresh milestone today. We surface
        // each milestone exactly once per user — the acknowledged list
        // prevents re-showing after a reset-and-climb-back-up unless the
        // user clears the app. `?? []` guards against a future schema
        // migration leaving the field undefined in an already-persisted
        // blob; without it we'd throw on `.includes` and silently lose
        // the streak update.
        const reachedMilestone = STREAK_MILESTONES.find(m => m === newStreak) ?? null;
        const acknowledged = state.milestonesAcknowledged ?? [];
        const isFreshMilestone = reachedMilestone !== null
          && !acknowledged.includes(reachedMilestone);

        set({
          lastOpenDate: today,
          currentStreak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          totalOpens: state.totalOpens + 1,
        });

        return { newMilestone: isFreshMilestone ? reachedMilestone : null };
      },

      acknowledgeMilestone: (milestone) => {
        set(state => {
          const acknowledged = state.milestonesAcknowledged ?? [];
          return acknowledged.includes(milestone)
            ? state
            : { milestonesAcknowledged: [...acknowledged, milestone] };
        });
      },

      reset: () => set(INITIAL),
    }),
    {
      name: 'naksha-app-open-streak',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

onAppReset(() => useAppOpenStreakStore.getState().reset());
