/**
 * Daily Layer 5 — Narrative Continuity Store
 *
 * Persists last 90 days of daily outputs, open narrative threads,
 * journal entries, and links between dailies and Guru conversations.
 * Powers the Compounding Value surface (Layer 9).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';

// How long any reading-shaped record persists. Per product decision: a
// rolling 7-day window. Used by daily records here and by savedReadings
// in userStore. Centralised so both surfaces can't drift.
export const READINGS_RETENTION_DAYS = 7;

function isoNDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0]!;
}

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  notification: string;  // 1 sentence
  card: string;          // 50-80 words
  expanded: string;      // full content
  tone: string;
  lunarPhase: string;
  mahadasha: string;
  antardasha: string | null;
  isQuietDay: boolean;
  isDeepDay: boolean;    // the 1-in-20 substantial days
  hasCallback: boolean;  // references something from 2-4 weeks ago
}

export interface JournalEntry {
  id: string;
  date: string;
  dailyId: string | null; // linked daily if any
  content: string;
  theme: string; // inferred from content
}

export interface NarrativeThread {
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'resolved' | 'dormant';
  firstDate: string;
  lastDate: string;
}

export interface ContinuityState {
  dailyRecords: DailyRecord[];      // rolling READINGS_RETENTION_DAYS window
  journalEntries: JournalEntry[];   // all entries
  narrativeThreads: NarrativeThread[];
  lastArcSummaryDate: string | null;
  arcSummaries: { date: string; content: string }[];
}

interface ContinuityActions {
  addDaily: (daily: Omit<DailyRecord, 'id'>) => string;
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  addThread: (thread: Omit<NarrativeThread, 'id'>) => void;
  updateThread: (id: string, updates: Partial<NarrativeThread>) => void;
  addArcSummary: (content: string) => void;
  getRecentDailies: (days: number) => DailyRecord[];
  getCallbackCandidate: () => DailyRecord | null;
  reset: () => void;
}

const INITIAL: ContinuityState = {
  dailyRecords: [],
  journalEntries: [],
  narrativeThreads: [],
  lastArcSummaryDate: null,
  arcSummaries: [],
};

export const useDailyContinuityStore = create<ContinuityState & ContinuityActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      addDaily: (daily) => {
        const id = ExpoCrypto.randomUUID();
        // Date-based retention: keep only records from the last
        // READINGS_RETENTION_DAYS days. Older entries are pruned on every
        // write rather than capped at a count, so the archive always
        // reflects the 7-day window even if the user hasn't generated a
        // reading every day.
        const cutoff = isoNDaysAgo(READINGS_RETENTION_DAYS);
        set(state => ({
          dailyRecords: [{ ...daily, id }, ...state.dailyRecords].filter(d => d.date >= cutoff),
        }));
        return id;
      },

      addJournalEntry: (entry) => {
        set(state => ({
          journalEntries: [{ ...entry, id: ExpoCrypto.randomUUID() }, ...state.journalEntries].slice(0, 500),
        }));
      },

      addThread: (thread) => {
        set(state => ({
          narrativeThreads: [{ ...thread, id: ExpoCrypto.randomUUID() }, ...state.narrativeThreads],
        }));
      },

      updateThread: (id, updates) => {
        set(state => ({
          narrativeThreads: state.narrativeThreads.map(t => t.id === id ? { ...t, ...updates } : t),
        }));
      },

      addArcSummary: (content) => {
        const date = new Date().toISOString().split('T')[0]!;
        set(state => ({
          arcSummaries: [{ date, content }, ...state.arcSummaries].slice(0, 12),
          lastArcSummaryDate: date,
        }));
      },

      getRecentDailies: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0]!;
        return get().dailyRecords.filter(d => d.date >= cutoffStr);
      },

      // Find a daily from 14-28 days ago that had high significance
      getCallbackCandidate: () => {
        const now = new Date();
        const from = new Date(now); from.setDate(from.getDate() - 28);
        const to = new Date(now); to.setDate(to.getDate() - 14);
        const fromStr = from.toISOString().split('T')[0]!;
        const toStr = to.toISOString().split('T')[0]!;

        const candidates = get().dailyRecords.filter(
          d => d.date >= fromStr && d.date <= toStr && !d.isQuietDay,
        );
        return candidates[0] ?? null;
      },

      reset: () => set(INITIAL),
    }),
    {
      name: 'naksha-daily-continuity',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// Clear past daily readings on user reset.
import { onAppReset } from './appReset';
onAppReset(() => useDailyContinuityStore.getState().reset());
