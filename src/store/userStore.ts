import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import { FREE_GURU_QUESTIONS_PER_DAY } from '../constants/astrology';

type ResetListener = () => void;
const resetListeners: Set<ResetListener> = new Set();

export function onAppReset(listener: ResetListener): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export interface BirthData {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
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
  isActive: boolean;
  antardasha?: AntarDasha[];
}

export interface AntarDasha {
  planet: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
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
        const today = new Date().toDateString();
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
        const today = new Date().toDateString();
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
        set((state) => ({
          user: {
            ...state.user,
            // Keep last 50 readings max
            savedReadings: [newReading, ...state.user.savedReadings].slice(0, 50),
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
        resetListeners.forEach(fn => {
          try { fn(); } catch { /* swallow listener errors */ }
        });
      },
    }),
    {
      name: 'nakshatra-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
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
