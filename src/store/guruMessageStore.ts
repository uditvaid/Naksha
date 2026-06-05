/**
 * Guru chat message store — split from `userStore` for write-hotspot
 * reasons.
 *
 * Background
 * ----------
 * Originally the Guru transcript lived inside `userStore`'s persisted
 * blob alongside the user profile, chart (up to several KB of planet +
 * dasha data), and saved readings (each up to ~1 KB). zustand persist
 * triggers a full `JSON.stringify` + AsyncStorage write on EVERY state
 * change of that store. With the transcript co-located, sending a
 * single Guru message rewrites all of:
 *
 *     - chart.planets (9 entries with nakshatra, house, dignity, etc.)
 *     - chart.dashas (full mahadasha + antardasha tree)
 *     - chart.yogas
 *     - savedReadings (rolling 7-day window)
 *     - guruMessages (capped at 50)
 *     - all user preferences
 *
 * Typical write was ~50–100 KB serialized — for incrementing a question
 * counter. Over a 30-message Guru session that's several megabytes of
 * AsyncStorage churn the user pays for in battery and (on low-end
 * Android) noticeable jank between bubbles.
 *
 * This store owns ONLY the message list. Adding a message rewrites a
 * ~25 KB blob (50 messages × ~500 bytes), independent of how chunky
 * the user store gets.
 *
 * Migration
 * ---------
 * Pre-existing TestFlight users have messages persisted under the
 * old `nakshatra-storage` key. `migrateLegacyGuruMessages` (in
 * `_layout.tsx`) handles the one-shot copy. `migrationCompleted`
 * makes the migration idempotent across launches.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAppReset } from './appReset';
import type { GuruMessage } from './userStore';

/** Same cap the legacy `partialize` enforced. Tunable. */
const MESSAGE_CAP = 50;

interface GuruMessageState {
  messages: GuruMessage[];
  /** True after the persisted state finished loading from AsyncStorage.
   *  Used by the migration runner to wait until this store is ready
   *  before copying legacy messages in. Mirrors the pattern in
   *  `userStore._hasHydrated`. */
  _hasHydrated: boolean;
  /** True after the one-shot legacy migration has been performed for
   *  this device. Persisted so subsequent launches skip the work. */
  migrationCompleted: boolean;
}

interface GuruMessageActions {
  /** Append a single message. Caps the list at MESSAGE_CAP, oldest first
   *  (which matches the legacy behaviour where the chronological tail
   *  was preserved). */
  addMessage: (msg: GuruMessage) => void;
  /** Replace the entire transcript. Used by the migration runner to
   *  bulk-import the legacy list. */
  setMessages: (msgs: GuruMessage[]) => void;
  /** Wipe all messages — used by the in-app "Clear conversation"
   *  control and by `onAppReset`. */
  clearMessages: () => void;
  /** Marks the migration as done so the runner doesn't re-fire on
   *  subsequent launches. */
  markMigrationCompleted: () => void;
  _setHasHydrated: (v: boolean) => void;
  reset: () => void;
}

const INITIAL: GuruMessageState = {
  messages: [],
  _hasHydrated: false,
  migrationCompleted: false,
};

export const useGuruMessageStore = create<GuruMessageState & GuruMessageActions>()(
  persist(
    (set, _get) => ({
      ...INITIAL,

      addMessage: (msg) => set((state) => {
        const next = [...state.messages, msg];
        // Slice keeps the latest MESSAGE_CAP, matching the legacy
        // `slice(-50)` behaviour in userStore's partialize.
        return { messages: next.length > MESSAGE_CAP ? next.slice(-MESSAGE_CAP) : next };
      }),

      setMessages: (msgs) => set({
        messages: msgs.length > MESSAGE_CAP ? msgs.slice(-MESSAGE_CAP) : msgs,
      }),

      clearMessages: () => set({ messages: [] }),

      markMigrationCompleted: () => set({ migrationCompleted: true }),

      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      reset: () => set({ ...INITIAL, _hasHydrated: true, migrationCompleted: true }),
    }),
    {
      name: 'naksha-guru-messages',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Persist everything except the hydration flag — it's a runtime
      // signal set by onRehydrateStorage below.
      partialize: (state) => ({
        messages: state.messages,
        migrationCompleted: state.migrationCompleted,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);

// On user reset / sign-out, wipe the transcript AND re-mark migration
// as completed so a re-onboarding user doesn't see the previous user's
// messages get migrated back in.
onAppReset(() => useGuruMessageStore.getState().reset());
