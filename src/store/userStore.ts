import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_GURU_QUESTIONS_PER_DAY } from '../constants/astrology';

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
  type: 'guru' | 'daily' | 'palm' | 'numerology' | 'chinese' | 'lalkitab' | 'compatibility';
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
  notificationsEnabled: boolean;
  preferredSystem: 'vedic' | 'western';
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
  notificationsEnabled: false,
  preferredSystem: 'vedic',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: defaultUser,
      guruMessages: [],
      isLoading: false,

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
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
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

      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => set({ user: defaultUser, guruMessages: [] }),
    }),
    {
      name: 'nakshatra-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        guruMessages: state.guruMessages.slice(-50),
      }),
    }
  )
);
