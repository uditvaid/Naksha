/**
 * Guru Arc Store — Layer 6
 *
 * Persists the user's longitudinal relationship arc.
 * Separate from guruRelationshipStore (which handles phase)
 * and from the memory store (which handles facts).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import { onAppReset } from './appReset';
import {
  UserArc,
  ArcUpdate,
  ArcSummary,
  EMPTY_ARC,
  buildArcBlock,
  pruneArc,
} from '@lib/persona/arc';

interface GuruArcActions {
  applyArcUpdate: (update: ArcUpdate) => void;
  addArcSummary: (summary: Omit<ArcSummary, 'id'>) => void;
  buildArcBlock: (sessionDay: number) => string;
  resetArc: () => void;
}

export type GuruArcState = UserArc & GuruArcActions;

export const useGuruArcStore = create<GuruArcState>()(
  persist(
    (set, get) => ({
      ...EMPTY_ARC,

      applyArcUpdate: (update: ArcUpdate) => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();

        // Growth observations — only high/medium confidence
        const newGrowthIds = update.newGrowthObservations.map((g) => ({
          ...g,
          id: ExpoCrypto.randomUUID(),
        }));

        // New stuck points
        const newStuckIds = update.newStuckPoints.map((s) => ({
          ...s,
          id: ExpoCrypto.randomUUID(),
          occurrences: 1,
        }));

        // Increment existing stuck point occurrences
        const updatedStuck = state.stuckPoints.map((s) =>
          update.updatedStuckPointIds.includes(s.id)
            ? { ...s, occurrences: s.occurrences + 1, lastObservedDate: today }
            : s,
        );

        // New unclaimed strengths — deduplicate by similarity is done at extraction
        const newStrengthIds = update.newUnclaimedStrengths.map((s) => ({
          ...s,
          id: ExpoCrypto.randomUUID(),
        }));

        // New developed capacities
        const newCapacityIds = update.newDevelopedCapacities.map((c) => ({
          ...c,
          id: ExpoCrypto.randomUUID(),
        }));

        // New resistance areas
        const newResistanceIds = update.newResistanceAreas.map((r) => ({
          ...r,
          id: ExpoCrypto.randomUUID(),
          occurrences: 1,
        }));

        // Increment existing resistance occurrences
        const updatedResistance = state.areasOfResistance.map((r) =>
          update.updatedResistanceIds.includes(r.id)
            ? { ...r, occurrences: r.occurrences + 1, lastObservedDate: today }
            : r,
        );

        // Move resolved threads from stuck points to resolved
        const resolvedNow = state.stuckPoints
          .filter((s) => update.resolvedThreadIds.includes(s.id))
          .map((s) => ({
            id: s.id,
            theme: s.pattern,
            summary: `Pattern observed ${s.occurrences} time${s.occurrences > 1 ? 's' : ''}, appears resolved.`,
            firstDate: s.firstObservedDate,
            resolvedDate: today,
            sessionDaysSpanned: s.occurrences,
          }));

        const remainingStuck = [
          ...updatedStuck.filter((s) => !update.resolvedThreadIds.includes(s.id)),
          ...newStuckIds,
        ];

        const updatedArc: UserArc = pruneArc({
          resolvedThreads: [...state.resolvedThreads, ...resolvedNow],
          stuckPoints: remainingStuck,
          growthObservations: [...state.growthObservations, ...newGrowthIds],
          areasOfResistance: [
            ...updatedResistance.filter((r) => !update.resolvedThreadIds.includes(r.id)),
            ...newResistanceIds,
          ],
          unclaimedStrengths: [...state.unclaimedStrengths, ...newStrengthIds],
          developedCapacities: [...state.developedCapacities, ...newCapacityIds],
          arcSummaries: state.arcSummaries,
          lastExtractionDate: today,
        });

        set(updatedArc);
      },

      addArcSummary: (summary) => {
        const full: ArcSummary = { ...summary, id: ExpoCrypto.randomUUID() };
        set((state) => ({
          arcSummaries: pruneArc({ ...state, arcSummaries: [full, ...state.arcSummaries] })
            .arcSummaries,
        }));
      },

      buildArcBlock: (sessionDay: number) => buildArcBlock(get(), sessionDay),

      resetArc: () => set(EMPTY_ARC),
    }),
    {
      name: 'naksha-guru-arc',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// Clear arc on user reset so a fresh sign-in starts from phase 1.
onAppReset(() => useGuruArcStore.getState().resetArc());
