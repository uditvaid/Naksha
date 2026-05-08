/**
 * Daily Engagement Profile Store — Layer 2
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EngagementProfile,
  DEFAULT_PROFILE,
  DailyEngagementReaction,
  applyReaction,
  getUserFacingProfile,
  isDisengaging,
  shouldSendToday,
} from '@lib/daily/engagementProfile';

interface EngagementActions {
  recordReaction: (reaction: DailyEngagementReaction) => void;
  addTopicInterest: (topic: string) => void;
  isDisengaging: () => boolean;
  shouldSendToday: () => boolean;
  getUserFacingProfile: () => Record<string, unknown>;
  reset: () => void;
}

export type DailyEngagementState = EngagementProfile & EngagementActions;

export const useDailyEngagementStore = create<DailyEngagementState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PROFILE,

      recordReaction: (reaction) => {
        set(state => applyReaction(state, reaction));
      },

      addTopicInterest: (topic) => {
        set(state => ({
          topicInterests: state.topicInterests.includes(topic)
            ? state.topicInterests
            : [topic, ...state.topicInterests].slice(0, 10),
        }));
      },

      isDisengaging: () => isDisengaging(get()),
      shouldSendToday: () => shouldSendToday(get()),
      getUserFacingProfile: () => getUserFacingProfile(get()),
      reset: () => set(DEFAULT_PROFILE),
    }),
    {
      name: 'naksha-daily-engagement',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// Clear delivery profile on user reset.
import { onAppReset } from './appReset';
onAppReset(() => useDailyEngagementStore.getState().reset());
