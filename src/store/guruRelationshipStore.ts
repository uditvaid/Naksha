/**
 * Guru Relationship Store — Layer 5
 *
 * Persists relationship phase state. All relationship layers (memory,
 * arc, initiation triggers) extend from this base.
 *
 * A "session day" = a calendar date on which the user had at least one
 * successful Guru exchange. Called from claude.ts after each response.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RelationshipPhase,
  PhaseState,
  computePhaseFromDays,
  computeAbsenceDays,
  getEffectivePhase,
  buildPhaseBlock,
} from '@lib/persona/phase';

interface GuruRelationshipActions {
  recordSession: () => void;
  clearTransitionFlag: () => void;
  reset: () => void;
  getEffectivePhase: () => RelationshipPhase;
  getAbsenceDays: () => number;
  buildPhaseBlock: () => string;
}

export type GuruRelationshipState = PhaseState & GuruRelationshipActions;

const INITIAL_PHASE_STATE: PhaseState = {
  phase: 'initiation',
  sessionDays: 0,
  lastSessionDate: null,
  phaseEnteredDate: null,
  justTransitioned: false,
  previousPhase: null,
};

export const useGuruRelationshipStore = create<GuruRelationshipState>()(
  persist(
    (set, get) => ({
      ...INITIAL_PHASE_STATE,

      recordSession: () => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();

        // Already recorded today — idempotent
        if (state.lastSessionDate === today) return;

        const newSessionDays = state.sessionDays + 1;
        const newPhase = computePhaseFromDays(newSessionDays);
        const didTransition = newPhase !== state.phase;

        set({
          sessionDays: newSessionDays,
          lastSessionDate: today,
          phase: newPhase,
          phaseEnteredDate: didTransition ? today : state.phaseEnteredDate,
          justTransitioned: didTransition,
          previousPhase: didTransition ? state.phase : state.previousPhase,
        });
      },

      // Call this after the system prompt is built for a session so the
      // transition note is shown exactly once.
      clearTransitionFlag: () => set({ justTransitioned: false }),

      // Wipe phase tracking back to phase 1 — used by the app-reset flow.
      reset: () => set(INITIAL_PHASE_STATE),

      getEffectivePhase: () => {
        const s = get();
        return getEffectivePhase(s.phase, computeAbsenceDays(s.lastSessionDate));
      },

      getAbsenceDays: () => computeAbsenceDays(get().lastSessionDate),

      buildPhaseBlock: () => {
        const s = get();
        const absence = computeAbsenceDays(s.lastSessionDate);
        return buildPhaseBlock(s, absence);
      },
    }),
    {
      name: 'naksha-guru-relationship',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        phase: state.phase,
        sessionDays: state.sessionDays,
        lastSessionDate: state.lastSessionDate,
        phaseEnteredDate: state.phaseEnteredDate,
        justTransitioned: state.justTransitioned,
        previousPhase: state.previousPhase,
      }),
    }
  )
);

// Reset phase tracking on user sign-out / data reset.
import { onAppReset } from './appReset';
onAppReset(() => useGuruRelationshipStore.getState().reset());
