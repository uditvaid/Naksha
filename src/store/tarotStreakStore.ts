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
  /** Mark today's pull. Idempotent — pulling twice on the same day
   *  doesn't double-count. */
  recordPull: () => void;
  reset: () => void;
}

const INITIAL = { lastPullDate: null, currentStreak: 0, longestStreak: 0, totalPulls: 0 };

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
