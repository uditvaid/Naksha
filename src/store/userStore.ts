import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import { FREE_GURU_QUESTIONS_PER_DAY } from '../constants/astrology';
import { READINGS_RETENTION_DAYS } from './dailyContinuityStore';
import { fireAppReset } from './appReset';

// Re-export onAppReset from the dependency-free registry so existing
// callers (`import { onAppReset } from '@store/userStore'`) keep working.
export { onAppReset } from './appReset';

export interface BirthData {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** True when timeOfBirth is a midpoint approximation (user picked a
   *  window like "morning 5-9 AM" rather than an exact time). The chart
   *  will surface this as an "approximate" badge and degrade Lagna
   *  confidence accordingly. Optional for backwards-compat with users
   *  who entered an exact time before this field existed. */
  isTimeApproximate?: boolean;
}

export interface ChartData {
  lagna: string;
  lagnaSign: number;
  planets: PlanetPosition[];
  dashas: DashaPeriod[];
  yogas: string[];
  navamshaLagna: string;
  isApproximate?: boolean;
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  signIndex: number;
  degree: number;
  house: number;
  nakshatra: string;
  pada: number;
  isRetrograde: boolean;
  isExalted: boolean;
  isDebilitated: boolean;
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  years: number;
  antardasha?: AntarDasha[];
}

export interface AntarDasha {
  planet: string;
  startDate: string;
  endDate: string;
}

export interface SavedChart {
  id: string;
  name: string;
  relation: string;
  birthData: BirthData;
  chart: ChartData | null;
  createdAt: string;
}

export interface SavedReading {
  id: string;
  type: 'guru' | 'daily' | 'palm' | 'numerology' | 'chinese' | 'lalkitab' | 'compatibility' | 'tarot';
  title: string;
  preview: string;       // First ~100 chars for list display
  content: string;       // Full reading content
  question?: string;     // For guru readings
  createdAt: string;
  /** For tarot readings: the cards drawn, with positions + orientations.
   *  Lets the saved-readings detail re-render the spread visually rather
   *  than just showing the prose. Optional for backwards-compat with
   *  pre-existing saved readings. */
  cards?: { name: string; symbol: string; reversed: boolean; position: string }[];
  /** For tarot readings: which spread was used (single / three /
   *  decision / relationship / celticCross). */
  spreadType?: string;
}

export interface UserProfile {
  id: string;
  birthData: BirthData | null;
  chart: ChartData | null;
  savedCharts: SavedChart[];
  savedReadings: SavedReading[];
  isPremium: boolean;
  premiumExpiry: string | null;
  guruQuestionsToday: number;
  lastGuruDate: string | null;
  onboardingComplete: boolean;
  preferredSystem: 'vedic' | 'western';
  aiDisclosureAcknowledged: boolean;
  guruConsentGiven: boolean;
  /** User-controlled in-app font scale (1.0 = default, 1.15 = large,
   *  1.3 = extra large). Compounds with iOS Dynamic Type — a user with
   *  iOS at 1.3x and in-app at 1.15x sees ~1.5x scale (capped at 1.5x
   *  by Text.defaultProps.maxFontSizeMultiplier to keep layouts intact). */
  fontScale: number;
  /** True when the user has explicitly chosen a scale via the picker
   *  (vs. it being the schema default). Future migrations should only
   *  force-upgrade users where this is undefined/false — explicit
   *  choices must be respected. */
  fontScaleExplicit?: boolean;
  /** Hour-of-day (0-23) at which the daily affirmation push notification
   *  fires in the user's local timezone. Default 8 (8:00 AM). */
  notificationHour: number;
  /** Minute-of-hour (0-59). Default 0. */
  notificationMinute: number;
}

export interface GuruMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feature?: string;
}

interface AppState {
  user: UserProfile;
  guruMessages: GuruMessage[];
  isLoading: boolean;
  pendingGuruContext: string | null;
  setUser: (user: Partial<UserProfile>) => void;
  setBirthData: (data: BirthData) => void;
  setChart: (chart: ChartData) => void;
  setPremium: (isPremium: boolean, expiry?: string) => void;
  addGuruMessage: (msg: GuruMessage) => void;
  clearGuruMessages: () => void;
  incrementGuruQuestions: () => void;
  canAskGuru: () => boolean;
  addSavedChart: (chart: SavedChart) => void;
  removeSavedChart: (id: string) => void;
  saveReading: (reading: Omit<SavedReading, 'id' | 'createdAt'>) => void;
  deleteSavedReading: (id: string) => void;
  setOnboardingComplete: () => void;
  setLoading: (loading: boolean) => void;
  acknowledgeAIDisclosure: () => void;
  giveGuruConsent: () => void;
  setPendingGuruContext: (context: string | null) => void;
  reset: () => void;
}

const defaultUser: UserProfile = {
  id: '',
  birthData: null,
  chart: null,
  savedCharts: [],
  savedReadings: [],
  isPremium: false,
  premiumExpiry: null,
  guruQuestionsToday: 0,
  lastGuruDate: null,
  onboardingComplete: false,
  preferredSystem: 'vedic',
  aiDisclosureAcknowledged: false,
  guruConsentGiven: false,
  // Default to Large (1.15) — fresh installs get the more readable size
  // out of the box. Users who prefer smaller text can drop to Default
  // (1.0) in Profile → Display.
  fontScale: 1.15,
  notificationHour: 8,
  notificationMinute: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: defaultUser,
      guruMessages: [],
      isLoading: false,
      pendingGuruContext: null,

      setUser: (update) =>
        set((state) => ({ user: { ...state.user, ...update } })),

      setBirthData: (data) =>
        set((state) => ({ user: { ...state.user, birthData: data } })),

      setChart: (chart) =>
        set((state) => ({ user: { ...state.user, chart } })),

      setPremium: (isPremium, expiry) =>
        set((state) => ({
          user: { ...state.user, isPremium, premiumExpiry: expiry ?? null },
        })),

      addGuruMessage: (msg) =>
        set((state) => ({ guruMessages: [...state.guruMessages, msg] })),

      clearGuruMessages: () => set({ guruMessages: [] }),

      incrementGuruQuestions: () => {
        // ISO YYYY-MM-DD — toDateString() is locale-sensitive and resets the
        // counter when the user changes device language or DST shifts.
        const today = new Date().toISOString().split('T')[0]!;
        set((state) => ({
          user: {
            ...state.user,
            guruQuestionsToday:
              state.user.lastGuruDate === today
                ? state.user.guruQuestionsToday + 1
                : 1,
            lastGuruDate: today,
          },
        }));
      },

      canAskGuru: () => {
        const { user } = get();
        if (user.isPremium) return true;
        const today = new Date().toISOString().split('T')[0]!;
        if (user.lastGuruDate !== today) return true;
        return user.guruQuestionsToday < FREE_GURU_QUESTIONS_PER_DAY;
      },

      addSavedChart: (chart) =>
        set((state) => ({
          user: {
            ...state.user,
            savedCharts: [...state.user.savedCharts, chart],
          },
        })),

      removeSavedChart: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            savedCharts: state.user.savedCharts.filter((c) => c.id !== id),
          },
        })),

      saveReading: (reading) => {
        const newReading: SavedReading = {
          ...reading,
          id: ExpoCrypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        // Date-based retention matching dailyRecords: keep only readings
        // from the last READINGS_RETENTION_DAYS days. Pruned on every
        // write so the saved-readings list stays a rolling window
        // regardless of how many readings the user generated in that span.
        const cutoff = Date.now() - READINGS_RETENTION_DAYS * 86400000;
        set((state) => ({
          user: {
            ...state.user,
            savedReadings: [newReading, ...state.user.savedReadings]
              .filter((r) => new Date(r.createdAt).getTime() >= cutoff),
          },
        }));
      },

      deleteSavedReading: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            savedReadings: state.user.savedReadings.filter((r) => r.id !== id),
          },
        })),

      setOnboardingComplete: () =>
        set((state) => ({ user: { ...state.user, onboardingComplete: true } })),

      acknowledgeAIDisclosure: () =>
        set((state) => ({ user: { ...state.user, aiDisclosureAcknowledged: true } })),

      giveGuruConsent: () =>
        set((state) => ({ user: { ...state.user, guruConsentGiven: true } })),

      setPendingGuruContext: (context) => set({ pendingGuruContext: context }),

      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => {
        set({ user: defaultUser, guruMessages: [] });
        fireAppReset();
      },
    }),
    {
      name: 'nakshatra-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        if (version < 2 && state?.user && 'notificationsEnabled' in state.user) {
          const { notificationsEnabled: _dropped, ...rest } = state.user;
          state = { ...state, user: rest };
        }
        if (version < 3 && state?.user) {
          state = {
            ...state,
            user: {
              ...state.user,
              aiDisclosureAcknowledged: state.user.aiDisclosureAcknowledged ?? false,
              guruConsentGiven: state.user.guruConsentGiven ?? false,
            },
          };
        }
        // v4: drop the dead `isActive` field from persisted dasha/antardasha.
        // No consumer reads it any more — the active period is derived at
        // read time via findActiveDasha/findActiveAntardasha.
        if (version < 4 && state?.user?.chart?.dashas) {
          const stripped = state.user.chart.dashas.map((d: any) => {
            const { isActive: _d, antardasha, ...rest } = d;
            return {
              ...rest,
              ...(antardasha
                ? { antardasha: antardasha.map((a: any) => {
                    const { isActive: _a, ...arest } = a;
                    return arest;
                  }) }
                : {}),
            };
          });
          state = { ...state, user: { ...state.user, chart: { ...state.user.chart, dashas: stripped } } };
        }
        // v5: add fontScale field (default 1 = no in-app override).
        if (version < 5 && state?.user) {
          state = {
            ...state,
            user: { ...state.user, fontScale: state.user.fontScale ?? 1 },
          };
        }
        // v6: add notificationHour/notificationMinute (default 8:00 AM
        // local) so users can override the daily affirmation time.
        if (version < 6 && state?.user) {
          state = {
            ...state,
            user: {
              ...state.user,
              notificationHour: state.user.notificationHour ?? 8,
              notificationMinute: state.user.notificationMinute ?? 0,
            },
          };
        }
        // v7: bump default font scale to 1.15 (Large). Only auto-upgrade
        // users still on the v6 default of 1.0 — anyone who explicitly
        // chose a non-default value (Large=1.15 or Extra Large=1.3) keeps
        // their preference. The check `=== 1` is sufficient because
        // Large/XL are 1.15/1.3.
        if (version < 7 && state?.user && state.user.fontScale === 1) {
          state = { ...state, user: { ...state.user, fontScale: 1.15 } };
        }
        return state;
      },
      partialize: (state) => ({
        user: state.user,
        guruMessages: state.guruMessages.slice(-50),
        // pendingGuruContext is intentionally excluded — session-only
      }),
    }
  )
);
