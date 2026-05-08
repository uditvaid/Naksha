/**
 * Daily Layer 12 — Daily Engagement Telemetry Store
 *
 * Records per-day delivery and engagement events for product analytics
 * and adaptive behavior. All data is local-only; never transmitted.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DailyEventType =
  | 'delivered'
  | 'opened'         // user saw the card
  | 'expanded'       // user tapped "read more"
  | 'reflected'      // tapped Reflect
  | 'discussed'      // tapped Discuss with Guru
  | 'reacted'        // tapped emoji reaction
  | 'shared'         // triggered share flow
  | 'skipped'        // notification dismissed without open
  | 'reengagement_sent';

export interface DailyTelemetryEvent {
  date: string;            // YYYY-MM-DD
  type: DailyEventType;
  metadata?: {
    tone?: string;
    isQuietDay?: boolean;
    isDeepDay?: boolean;
    openHour?: number;     // 0-23, present on 'opened' events
    reaction?: string;     // emoji, present on 'reacted' events
  };
}

export interface DailyTelemetryState {
  events: DailyTelemetryEvent[];
  deliveryState: {
    lastDeliveryDate: string | null;
    isPaused: boolean;
    reengagementSentDate: string | null;
    pausedSinceDate: string | null;
  };
}

interface DailyTelemetryActions {
  recordEvent: (type: DailyEventType, metadata?: DailyTelemetryEvent['metadata']) => void;
  setDeliveryPaused: (paused: boolean) => void;
  setReengagementSent: () => void;
  markDelivered: () => void;
  resetPause: () => void;
  getEventsForDate: (date: string) => DailyTelemetryEvent[];
  getOpenRate: (days: number) => number;
  reset: () => void;
}

const INITIAL: DailyTelemetryState = {
  events: [],
  deliveryState: {
    lastDeliveryDate: null,
    isPaused: false,
    reengagementSentDate: null,
    pausedSinceDate: null,
  },
};

export const useDailyTelemetryStore = create<DailyTelemetryState & DailyTelemetryActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      recordEvent: (type, metadata) => {
        const today = new Date().toISOString().split('T')[0]!;
        const event: DailyTelemetryEvent = { date: today, type, metadata };
        set(state => ({
          events: [event, ...state.events].slice(0, 1000), // keep last 1000 events
        }));
      },

      setDeliveryPaused: (paused) => {
        const today = new Date().toISOString().split('T')[0]!;
        set(state => ({
          deliveryState: {
            ...state.deliveryState,
            isPaused: paused,
            pausedSinceDate: paused ? today : null,
            reengagementSentDate: paused ? null : state.deliveryState.reengagementSentDate,
          },
        }));
      },

      setReengagementSent: () => {
        const today = new Date().toISOString().split('T')[0]!;
        set(state => ({
          deliveryState: { ...state.deliveryState, reengagementSentDate: today },
        }));
      },

      markDelivered: () => {
        const today = new Date().toISOString().split('T')[0]!;
        set(state => ({
          deliveryState: { ...state.deliveryState, lastDeliveryDate: today },
        }));
      },

      resetPause: () => {
        set(state => ({
          deliveryState: {
            ...state.deliveryState,
            isPaused: false,
            reengagementSentDate: null,
            pausedSinceDate: null,
          },
        }));
      },

      getEventsForDate: (date) => {
        return get().events.filter(e => e.date === date);
      },

      getOpenRate: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0]!;

        const deliveries = get().events.filter(e => e.type === 'delivered' && e.date >= cutoffStr);
        const opens = get().events.filter(e => e.type === 'opened' && e.date >= cutoffStr);

        if (deliveries.length === 0) return 0;
        return opens.length / deliveries.length;
      },

      reset: () => set(INITIAL),
    }),
    {
      name: 'naksha-daily-telemetry',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// Clear telemetry on user reset.
import { onAppReset } from './appReset';
onAppReset(() => useDailyTelemetryStore.getState().reset());
