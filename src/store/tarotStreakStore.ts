/**
 * Tracks daily-card pulls for gentle gamification.
 *
 * No punishment for missed days — the streak resets on a 2+ day gap,
 * but the only consequence is the counter starts again. We track this
 * to surface "you've pulled a card 14 days in a row" so the daily
 * ritual has a small visible payoff.
 *
 * Persisted via zustand's persist middleware. Cleared on app reset
 * via the appReset registry.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAppReset } from './appReset';

interface TarotStreakState {
  /** ISO YYYY-MM-DD of the most recent card pull. Null if never. */
  lastPullDate: string | null;
  /** Current consecutive-days streak. 0 if never pulled or just reset. */
  currentStreak: number;
  /** Personal best streak ever recorded for this user. */
  longestStreak: number;
  /** Total cards pulled, all time. */
  totalPulls: number;
  /** Per-day Celtic Cross counter. Resets when the date rolls over.
   *  Used to soft-cap expensive readings — Celtic Cross is 2x token
   *  cost vs a regular spread, so we let users do up to N per day. */
  celticCrossDay: string | null;
  celticCrossCount: number;
  /** Mark today's pull. Idempotent — pulling twice on the same day
   *  doesn't double-count. */
  recordPull: () => void;
  /** Increment the Celtic Cross counter (resets if date rolled over).
   *  Returns the count AFTER incrementing, so callers can compare
   *  against caps. */
  recordCelticCross: () => number;
  /** Reads the current count (with auto-rollover). */
  getCelticCrossCountToday: () => number;
  reset: () => void;
}

const INITIAL = {
  lastPullDate: null, currentStreak: 0, longestStreak: 0, totalPulls: 0,
  celticCrossDay: null, celticCrossCount: 0,
};

/** Soft cap on Celtic Cross readings per calendar day. Exposed so the
 *  caller can show a "you've done X / 5 today" hint as it approaches. */
export const CELTIC_CROSS_DAILY_CAP = 5;

function isYesterday(today: string, last: string): boolean {
  const td = new Date(today);
  const ld = new Date(last);
  const diffDays = Math.round((td.getTime() - ld.getTime()) / 86400000);
  return diffDays === 1;
}

export const useTarotStreakStore = create<TarotStreakState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      recordPull: () => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();
        // Same-day re-pull: idempotent
        if (state.lastPullDate === today) return;
        const newStreak = state.lastPullDate && isYesterday(today, state.lastPullDate)
          ? state.currentStreak + 1
          : 1;
        set({
          lastPullDate: today,
          currentStreak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          totalPulls: state.totalPulls + 1,
        });
      },

      recordCelticCross: () => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();
        const count = state.celticCrossDay === today ? state.celticCrossCount + 1 : 1;
        set({ celticCrossDay: today, celticCrossCount: count });
        return count;
      },

      getCelticCrossCountToday: () => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();
        return state.celticCrossDay === today ? state.celticCrossCount : 0;
      },

      reset: () => set(INITIAL),
    }),
    {
      name: 'naksha-tarot-streak',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

onAppReset(() => useTarotStreakStore.getState().reset());
