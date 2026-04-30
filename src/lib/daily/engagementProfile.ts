/**
 * Daily Layer 2 — Per-User Engagement Profile
 *
 * Tracks what each user actually responds to. Updated continuously
 * from behavior signals. Feeds into synthesis (Layer 4) and delivery
 * (Layer 6). Visible to the user (transparency screen).
 *
 * Designed first per spec — engagement profile shapes signal relevance
 * and synthesis form, preventing the rest of the system from implicitly
 * assuming a uniform user.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type MessageLength = 'short' | 'medium' | 'long';
export type ToneType = 'practical' | 'philosophical' | 'warning' | 'encouraging' | 'reflective' | 'celebratory';
export type InvestmentLevel = 'low' | 'mid' | 'high';
export type PreferredCadence = 'daily' | 'every_other_day' | 'weekly';

export interface DailyEngagementReaction {
  date: string;
  tone: ToneType;
  reaction: 'resonated' | 'didnt_land' | 'want_more' | 'skipped';
  opened: boolean;
  expanded: boolean;
  investmentPath?: 'reflect' | 'discuss' | 'react';
}

export interface EngagementProfile {
  // Length preference — learned from which depth-levels they expand
  preferredLength: MessageLength;
  lengthSignalCount: number; // how many samples this is based on

  // Tone responsiveness — learned from reactions
  toneScores: Record<ToneType, number>; // 0-1, higher = more responsive
  toneSignalCount: number;

  // Topic interests — which threads they take into Guru chat
  topicInterests: string[]; // ordered by engagement

  // Optimal cadence — learned from open patterns
  preferredCadence: PreferredCadence;
  cadenceSignalCount: number;

  // Investment level
  investmentLevel: InvestmentLevel;
  investmentSignalCount: number;

  // Preferred CTA — which investment path they use most
  preferredInvestmentPath: 'reflect' | 'discuss' | 'react' | null;

  // Reading time — actual observed open time
  observedOpenTimes: number[]; // hour of day (0-23), last 14 entries
  adaptedDeliveryHour: number | null; // null = use user-selected time

  // History for adaptation
  reactionHistory: DailyEngagementReaction[]; // last 30 days
  consecutiveSkips: number; // for disengagement detection
  lastOpenDate: string | null;
}

export const DEFAULT_PROFILE: EngagementProfile = {
  preferredLength: 'medium',
  lengthSignalCount: 0,
  toneScores: {
    practical: 0.5,
    philosophical: 0.5,
    warning: 0.5,
    encouraging: 0.5,
    reflective: 0.5,
    celebratory: 0.5,
  },
  toneSignalCount: 0,
  topicInterests: [],
  preferredCadence: 'daily',
  cadenceSignalCount: 0,
  investmentLevel: 'low',
  investmentSignalCount: 0,
  preferredInvestmentPath: null,
  observedOpenTimes: [],
  adaptedDeliveryHour: null,
  reactionHistory: [],
  consecutiveSkips: 0,
  lastOpenDate: null,
};

// ─── Profile Updates ───────────────────────────────────────────────────────────

export function applyReaction(
  profile: EngagementProfile,
  reaction: DailyEngagementReaction,
): EngagementProfile {
  // Update tone scores
  const toneScores = { ...profile.toneScores };
  const toneWeight = reaction.reaction === 'resonated' || reaction.reaction === 'want_more' ? 0.1 : -0.05;
  toneScores[reaction.tone] = Math.max(0, Math.min(1,
    (toneScores[reaction.tone] ?? 0.5) + toneWeight
  ));

  // Update length preference
  let preferredLength = profile.preferredLength;
  if (reaction.expanded && reaction.investmentPath) {
    // User expanded AND invested — they wanted more
    preferredLength = profile.preferredLength === 'short' ? 'medium' : 'long';
  } else if (!reaction.expanded && profile.preferredLength === 'long') {
    preferredLength = 'medium';
  }

  // Investment level
  let investmentLevel = profile.investmentLevel;
  if (reaction.investmentPath) {
    const level: InvestmentLevel = reaction.investmentPath === 'reflect' ? 'high'
      : reaction.investmentPath === 'discuss' ? 'mid' : 'low';
    investmentLevel = level;
  }

  // Consecutive skips
  const consecutiveSkips = reaction.reaction === 'skipped'
    ? profile.consecutiveSkips + 1
    : 0;

  // Cadence adaptation
  let preferredCadence = profile.preferredCadence;
  if (consecutiveSkips >= 5) preferredCadence = 'every_other_day';
  if (consecutiveSkips >= 10) preferredCadence = 'weekly';
  if (consecutiveSkips === 0 && profile.cadenceSignalCount > 5) preferredCadence = 'daily';

  // Investment path preference
  const pathCounts = profile.reactionHistory
    .slice(0, 20)
    .reduce((acc, r) => {
      if (r.investmentPath) acc[r.investmentPath] = (acc[r.investmentPath] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0];
  const preferredInvestmentPath = topPath ? (topPath[0] as 'reflect' | 'discuss' | 'react') : null;

  // Observed open times
  const openHour = new Date().getHours();
  const observedOpenTimes = reaction.opened
    ? [openHour, ...profile.observedOpenTimes].slice(0, 14)
    : profile.observedOpenTimes;

  // Adapted delivery hour (after 14 samples)
  let adaptedDeliveryHour = profile.adaptedDeliveryHour;
  if (observedOpenTimes.length >= 14) {
    const avgHour = Math.round(observedOpenTimes.reduce((a, b) => a + b, 0) / observedOpenTimes.length);
    adaptedDeliveryHour = avgHour;
  }

  return {
    ...profile,
    preferredLength,
    lengthSignalCount: profile.lengthSignalCount + 1,
    toneScores,
    toneSignalCount: profile.toneSignalCount + 1,
    investmentLevel,
    investmentSignalCount: profile.investmentSignalCount + 1,
    preferredCadence,
    cadenceSignalCount: profile.cadenceSignalCount + 1,
    preferredInvestmentPath,
    observedOpenTimes,
    adaptedDeliveryHour,
    reactionHistory: [reaction, ...profile.reactionHistory].slice(0, 30),
    consecutiveSkips,
    lastOpenDate: reaction.opened ? new Date().toISOString().split('T')[0]! : profile.lastOpenDate,
  };
}

// ─── Profile Queries ───────────────────────────────────────────────────────────

export function getPreferredTone(profile: EngagementProfile): ToneType {
  const entries = Object.entries(profile.toneScores) as [ToneType, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'reflective';
}

export function isDisengaging(profile: EngagementProfile): boolean {
  return profile.consecutiveSkips >= 3;
}

export function shouldSendToday(profile: EngagementProfile): boolean {
  if (profile.preferredCadence === 'daily') return true;
  if (profile.preferredCadence === 'weekly') {
    if (!profile.lastOpenDate) return true;
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.lastOpenDate).getTime()) / 86_400_000
    );
    return daysSince >= 7;
  }
  // every_other_day
  if (!profile.lastOpenDate) return true;
  const daysSince = Math.floor(
    (Date.now() - new Date(profile.lastOpenDate).getTime()) / 86_400_000
  );
  return daysSince >= 2;
}

// ─── User-Facing Profile Summary ───────────────────────────────────────────────

export function getUserFacingProfile(profile: EngagementProfile): Record<string, unknown> {
  const topTone = getPreferredTone(profile);
  return {
    preferredLength: profile.preferredLength,
    topicsOfInterest: profile.topicInterests.slice(0, 5),
    cadence: profile.preferredCadence,
    investmentStyle: profile.investmentLevel,
    topTone,
    adaptedDeliveryHour: profile.adaptedDeliveryHour,
    signalStrength: {
      length: profile.lengthSignalCount,
      tone: profile.toneSignalCount,
      cadence: profile.cadenceSignalCount,
    },
  };
}
