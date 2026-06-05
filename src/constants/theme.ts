export const Colors = {
  midnight: '#080B14',
  deepNavy: '#0D1220',
  cosmos: '#111827',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(201,168,76,0.2)',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldDim: 'rgba(201,168,76,0.15)',
  amber: '#E07B39',
  star: '#F5F0E8',
  // Bumped from 0.45 → 0.62 to pass WCAG AA contrast on the midnight
  // background for ≤14pt body copy (statSub, archivePreview, panchang
  // lines, etc.). Previously sat at ~4:1, marginally failing 4.5:1 AA.
  muted: 'rgba(245,240,232,0.62)',
  mutedDark: 'rgba(245,240,232,0.4)',
  ruby: '#C0392B',
  emerald: '#27AE60',
  sapphire: '#2980B9',
  violet: '#8B5CF6',
  rose: '#F43F5E',
  premium: '#C9A84C',
  premiumGradient: ['#C9A84C', '#E8C96A', '#C9A84C'] as string[],
  // Planet colors
  sun: '#F59E0B',
  moon: '#CBD5E1',
  mars: '#EF4444',
  mercury: '#10B981',
  jupiter: '#F59E0B',
  venus: '#EC4899',
  saturn: '#6366F1',
  rahu: '#8B5CF6',
  ketu: '#A78BFA',
};

export const Fonts = {
  cinzel: 'Cinzel_400Regular',
  cinzelBold: 'Cinzel_600SemiBold',
  cormorant: 'CormorantGaramond_400Regular',
  cormorantItalic: 'CormorantGaramond_400Regular_Italic',
  crimson: 'CrimsonPro_400Regular',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  gold: {
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};
