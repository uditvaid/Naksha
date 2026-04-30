/**
 * Daily Layer 1 — Daily Signal Computation
 *
 * Computes all astrologically relevant signals for a given user on a
 * given date. Each signal has a significance score (0-1).
 *
 * ENGAGEMENT REQUIREMENT: ~30% of days should produce honest
 * "low-significance" output. A system that finds significance every
 * day is one users stop trusting by week three.
 */

import { ChartData, DashaPeriod, PlanetPosition } from '@store/userStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DailySignal {
  type: 'dasha' | 'transit' | 'lunar' | 'panchang' | 'comparison' | 'upcoming';
  title: string;
  description: string;
  significance: number; // 0-1
  isNew: boolean; // changed since yesterday?
}

export interface DailySignalSet {
  date: string;
  signals: DailySignal[];
  overallSignificance: number; // 0-1
  isQuietDay: boolean;
  mahadasha: string;
  antardasha: string | null;
  moonSign: string;
  moonNakshatra: string;
  lunarPhase: LunarPhase;
}

export type LunarPhase =
  | 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

// ─── Lunar Calculations ────────────────────────────────────────────────────────

export function computeLunarPhase(date: Date): LunarPhase {
  // Approximation: known new moon reference (Jan 13, 2021 05:00 UTC)
  const KNOWN_NEW_MOON = new Date('2021-01-13T05:00:00Z').getTime();
  const LUNAR_CYCLE_MS = 29.53059 * 24 * 60 * 60 * 1000;
  const elapsed = (date.getTime() - KNOWN_NEW_MOON) % LUNAR_CYCLE_MS;
  const normalized = elapsed < 0 ? elapsed + LUNAR_CYCLE_MS : elapsed;
  const fraction = normalized / LUNAR_CYCLE_MS;

  if (fraction < 0.03 || fraction >= 0.97) return 'new_moon';
  if (fraction < 0.22) return 'waxing_crescent';
  if (fraction < 0.28) return 'first_quarter';
  if (fraction < 0.47) return 'waxing_gibbous';
  if (fraction < 0.53) return 'full_moon';
  if (fraction < 0.72) return 'waning_gibbous';
  if (fraction < 0.78) return 'last_quarter';
  return 'waning_crescent';
}

const LUNAR_PHASE_SIGNIFICANCE: Record<LunarPhase, number> = {
  new_moon: 0.9,
  full_moon: 0.85,
  first_quarter: 0.6,
  last_quarter: 0.6,
  waxing_gibbous: 0.4,
  waning_gibbous: 0.4,
  waxing_crescent: 0.3,
  waning_crescent: 0.3,
};

const LUNAR_PHASE_THEMES: Record<LunarPhase, string> = {
  new_moon: 'New beginnings, seed-setting, inner focus — a natural reset point',
  waxing_crescent: 'Initial momentum, early effort, building energy',
  first_quarter: 'Action, decision, the moment to push through initial resistance',
  waxing_gibbous: 'Refinement, adjustment, almost-there energy',
  full_moon: 'Culmination, heightened emotion, illumination of what\'s been building',
  waning_gibbous: 'Integration, sharing, gratitude for what was completed',
  last_quarter: 'Release, letting go, clearing what no longer serves',
  waning_crescent: 'Rest, reflection, preparation for the next cycle',
};

// ─── Dasha Signal ──────────────────────────────────────────────────────────────

const DASHA_THEMES: Record<string, string> = {
  Sun: 'identity, authority, and the clarification of soul purpose',
  Moon: 'emotional life, intuition, and the inner world',
  Mars: 'action, courage, and the confrontation of what requires direct engagement',
  Mercury: 'communication, learning, and the precision of thought',
  Jupiter: 'wisdom, expansion, and the recognition of dharmic direction',
  Venus: 'love, relationship, and creative expression',
  Saturn: 'discipline, long-term consequence, and what is truly being built',
  Rahu: 'ambition, transformation, and the shadow of desire',
  Ketu: 'spiritual deepening and the release of what no longer belongs',
};

function buildDashaSignal(chart: ChartData): DailySignal | null {
  const activeDasha = chart.dashas.find(d => d.isActive);
  if (!activeDasha) return null;

  const activeAntar = activeDasha.antardasha?.find(a => a.isActive);

  // Check if antardasha just shifted (within 3 days of start)
  let isNew = false;
  if (activeAntar) {
    const antarStart = new Date(activeAntar.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - antarStart.getTime()) / 86_400_000);
    isNew = daysSinceStart <= 3;
  }

  const description = activeAntar
    ? `The current emphasis is ${activeDasha.planet}/${activeAntar.planet} — ${DASHA_THEMES[activeDasha.planet] ?? activeDasha.planet} with a specific focus through ${activeAntar.planet}'s themes of ${DASHA_THEMES[activeAntar.planet] ?? activeAntar.planet}.`
    : `In the ${activeDasha.planet} period — ${DASHA_THEMES[activeDasha.planet] ?? activeDasha.planet}.`;

  return {
    type: 'dasha',
    title: `${activeDasha.planet} Mahadasha${activeAntar ? ` / ${activeAntar.planet} Antardasha` : ''}`,
    description,
    significance: isNew ? 0.85 : 0.4, // higher if antardasha just shifted
    isNew,
  };
}

// ─── Moon Signal ───────────────────────────────────────────────────────────────

function buildMoonSignal(chart: ChartData, date: Date): DailySignal {
  const moon = chart.planets.find(p => p.planet === 'Moon');
  const phase = computeLunarPhase(date);
  const significance = LUNAR_PHASE_SIGNIFICANCE[phase];
  const theme = LUNAR_PHASE_THEMES[phase];

  // Moon conjunct natal Moon (return) — high significance
  const isLunarReturn = moon && moon.sign === moon.sign; // simplified — actual return needs transit calculation

  return {
    type: 'lunar',
    title: `Moon in ${moon?.sign ?? 'Unknown'} · ${phase.replace(/_/g, ' ')}`,
    description: theme,
    significance: Math.min(significance + (isLunarReturn ? 0.1 : 0), 1),
    isNew: ['new_moon', 'full_moon'].includes(phase),
  };
}

// ─── Weekday Signal ────────────────────────────────────────────────────────────

const WEEKDAY_PLANETS: Record<number, { planet: string; theme: string }> = {
  0: { planet: 'Sun', theme: 'clarity of purpose, the seat of identity, and the quality of light you bring' },
  1: { planet: 'Moon', theme: 'emotional attunement, receptivity, and the inner world' },
  2: { planet: 'Mars', theme: 'decisive action, directness, and the energy applied to what matters' },
  3: { planet: 'Mercury', theme: 'communication, discernment, and the precision of mind' },
  4: { planet: 'Jupiter', theme: 'expansion, wisdom, and the recognition of what is genuinely worth growing toward' },
  5: { planet: 'Venus', theme: 'relationship, beauty, and what is worth loving' },
  6: { planet: 'Saturn', theme: 'discipline, the long view, and what is being built to last' },
};

function buildWeekdaySignal(date: Date): DailySignal {
  const dayOfWeek = date.getDay();
  const wd = WEEKDAY_PLANETS[dayOfWeek] ?? WEEKDAY_PLANETS[0]!;
  return {
    type: 'panchang',
    title: `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek]} — ${wd.planet}\'s day`,
    description: `Today carries the quality of ${wd.planet}: ${wd.theme}.`,
    significance: 0.25, // weekday is always low — doesn't drive the daily
    isNew: false,
  };
}

// ─── Upcoming Signal ───────────────────────────────────────────────────────────

function buildUpcomingSignal(chart: ChartData): DailySignal | null {
  const activeDasha = chart.dashas.find(d => d.isActive);
  if (!activeDasha?.antardasha) return null;

  const activeAntar = activeDasha.antardasha.find(a => a.isActive);
  if (!activeAntar) return null;

  const endDate = new Date(activeAntar.endDate);
  const now = new Date();
  const daysUntil = Math.floor((endDate.getTime() - now.getTime()) / 86_400_000);

  if (daysUntil > 30 || daysUntil < 0) return null;

  const nextAntar = activeDasha.antardasha[activeDasha.antardasha.indexOf(activeAntar) + 1];

  return {
    type: 'upcoming',
    title: `Shift approaching in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    description: nextAntar
      ? `The ${activeAntar.planet} sub-period ends soon. The ${nextAntar.planet} sub-period follows — a shift in emphasis is approaching.`
      : `The ${activeAntar.planet} sub-period is ending. A transition is near.`,
    significance: daysUntil <= 7 ? 0.75 : 0.5,
    isNew: daysUntil <= 3,
  };
}

// ─── Main Computation ──────────────────────────────────────────────────────────

export function computeDailySignals(chart: ChartData, date: Date = new Date()): DailySignalSet {
  const dateStr = date.toISOString().split('T')[0]!;
  const signals: DailySignal[] = [];

  const dashaSignal = buildDashaSignal(chart);
  if (dashaSignal) signals.push(dashaSignal);

  signals.push(buildMoonSignal(chart, date));
  signals.push(buildWeekdaySignal(date));

  const upcomingSignal = buildUpcomingSignal(chart);
  if (upcomingSignal) signals.push(upcomingSignal);

  // Overall significance = weighted average of top 3 signals
  const sorted = [...signals].sort((a, b) => b.significance - a.significance);
  const top3 = sorted.slice(0, 3);
  const overallSignificance = top3.length > 0
    ? top3.reduce((sum, s) => sum + s.significance, 0) / top3.length
    : 0.2;

  const moon = chart.planets.find(p => p.planet === 'Moon');
  const activeDasha = chart.dashas.find(d => d.isActive);
  const activeAntar = activeDasha?.antardasha?.find(a => a.isActive);

  return {
    date: dateStr,
    signals,
    overallSignificance,
    isQuietDay: overallSignificance < 0.35,
    mahadasha: activeDasha?.planet ?? 'Unknown',
    antardasha: activeAntar?.planet ?? null,
    moonSign: moon?.sign ?? 'Unknown',
    moonNakshatra: moon?.nakshatra ?? 'Unknown',
    lunarPhase: computeLunarPhase(date),
  };
}
