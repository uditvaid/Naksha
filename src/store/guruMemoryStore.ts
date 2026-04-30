/**
 * Guru Memory Store — Layer 3
 *
 * Persists the user's relational memory. Separate from arc (Layer 6)
 * which tracks trajectory. Memory tracks facts, threads, and state.
 * User can view and edit this memory from the transparency screen.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import {
  UserMemory,
  MemoryUpdate,
  EMPTY_MEMORY,
  buildMemoryBlock,
  pruneMemory,
  getUserFacingMemory,
} from '@lib/persona/memory';

interface GuruMemoryActions {
  applyMemoryUpdate: (update: MemoryUpdate) => void;
  deleteFact: (id: string) => void;
  deleteThread: (id: string) => void;
  addUserNote: (category: UserMemory['facts'][number]['category'], content: string) => void;
  buildMemoryBlock: () => string;
  getUserFacingMemory: () => Record<string, unknown>;
  resetMemory: () => void;
}

export type GuruMemoryState = UserMemory & GuruMemoryActions;

export const useGuruMemoryStore = create<GuruMemoryState>()(
  persist(
    (set, get) => ({
      ...EMPTY_MEMORY,

      applyMemoryUpdate: (update: MemoryUpdate) => {
        const today = new Date().toISOString().split('T')[0]!;
        const state = get();

        // New facts
        const newFacts = update.newFacts.map((f) => ({
          ...f,
          id: ExpoCrypto.randomUUID(),
        }));

        // Refresh lastConfirmedDate on mentioned facts
        const updatedFacts = state.facts.map((f) =>
          update.updatedFactIds.includes(f.id)
            ? { ...f, lastConfirmedDate: today }
            : f,
        );

        // New threads
        const newThreads = update.newThreads.map((t) => ({
          ...t,
          id: ExpoCrypto.randomUUID(),
        }));

        // Update existing threads
        const updatedThreads = state.threads.map((t) => {
          if (update.updatedThreadIds.includes(t.id)) {
            return { ...t, lastDate: today, status: 'active' as const };
          }
          if (update.resolvedThreadIds.includes(t.id)) {
            return { ...t, status: 'resolved' as const, lastDate: today };
          }
          return t;
        });

        // New breakthroughs
        const newBreakthroughs = update.newBreakthroughs.map((b) => ({
          ...b,
          id: ExpoCrypto.randomUUID(),
        }));

        // New open questions
        const newOpenQuestions = update.newOpenQuestions.map((q) => ({
          ...q,
          id: ExpoCrypto.randomUUID(),
        }));

        // Mark answered questions
        const updatedQuestions = state.openQuestions.map((q) =>
          update.answeredQuestionIds.includes(q.id)
            ? { ...q, status: 'partially-answered' as const }
            : q,
        );

        // New noticed-but-unspoken
        const newNoticed = update.newNoticedUnspoken.map((n) => ({
          ...n,
          id: ExpoCrypto.randomUUID(),
          occurrences: 1,
        }));

        // Increment existing noticed
        const updatedNoticed = state.noticedButUnspoken.map((n) => {
          if (update.updatedNoticedIds.includes(n.id)) {
            const newCount = n.occurrences + 1;
            return { ...n, occurrences: newCount, readyToSurface: newCount >= 3 };
          }
          return n;
        });

        // Emotional weather
        const weatherEntry = update.emotionalWeatherEntry
          ? { ...update.emotionalWeatherEntry, date: today }
          : null;

        const updated = pruneMemory({
          facts: [...updatedFacts, ...newFacts],
          threads: [...updatedThreads, ...newThreads],
          breakthroughs: [...state.breakthroughs, ...newBreakthroughs],
          preferences: state.preferences,
          openQuestions: [...updatedQuestions, ...newOpenQuestions],
          noticedButUnspoken: [...updatedNoticed, ...newNoticed],
          recentEmotionalWeather: weatherEntry
            ? [weatherEntry, ...state.recentEmotionalWeather]
            : state.recentEmotionalWeather,
          lastExtractionDate: today,
        });

        set(updated);
      },

      deleteFact: (id) =>
        set((state) => ({ facts: state.facts.filter((f) => f.id !== id) })),

      deleteThread: (id) =>
        set((state) => ({ threads: state.threads.filter((t) => t.id !== id) })),

      addUserNote: (category, content) => {
        const today = new Date().toISOString().split('T')[0]!;
        const fact = {
          id: ExpoCrypto.randomUUID(),
          category,
          content,
          firstMentionedDate: today,
          lastConfirmedDate: today,
        };
        set((state) => ({ facts: [...state.facts, fact] }));
      },

      buildMemoryBlock: () => buildMemoryBlock(get()),

      getUserFacingMemory: () => getUserFacingMemory(get()),

      resetMemory: () => set(EMPTY_MEMORY),
    }),
    {
      name: 'naksha-guru-memory',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
