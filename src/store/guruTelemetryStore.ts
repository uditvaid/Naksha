/**
 * Guru Telemetry Store — Layer 12
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EngagementTelemetry,
  EMPTY_TELEMETRY,
  recordSession,
  detectTopics,
} from '@lib/persona/telemetry';

interface SessionInput {
  turnCount: number;
  totalChars: number;
  responseFormHistory: string[];
  userMessages: string[];
}

interface TelemetryActions {
  recordSession: (input: SessionInput) => void;
  isDisengaged: () => boolean;
  getPreferredLength: () => EngagementTelemetry['preferredResponseLength'];
}

export type GuruTelemetryState = EngagementTelemetry & TelemetryActions;

export const useGuruTelemetryStore = create<GuruTelemetryState>()(
  persist(
    (set, get) => ({
      ...EMPTY_TELEMETRY,

      recordSession: (input) => {
        const topics = input.userMessages.flatMap(detectTopics);
        const current = get();
        const updated = recordSession(current, {
          turnCount: input.turnCount,
          totalChars: input.totalChars,
          responseFormHistory: input.responseFormHistory,
          topicsRaised: [...new Set(topics)],
        });
        set(updated);
      },

      isDisengaged: () => get().disengagementSignal,

      getPreferredLength: () => get().preferredResponseLength,
    }),
    {
      name: 'naksha-guru-telemetry',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
