/**
 * Daily Layer 11 — Lunar Cycle Reflection (replaces streaks)
 *
 * Shows the user their engagement pattern across the current lunar cycle
 * (new moon to new moon). Framed as rhythm observation, not performance.
 * Never produces a number that goes up or down. No streak mechanics.
 */

import { computeLunarPhase, LunarPhase } from './signals';
import { DailyRecord } from '@store/dailyContinuityStore';

export interface LunarCycleReflection {
  currentPhase: LunarPhase;
  cycleStartDate: string;
  engagementPattern: string; // qualitative description
  phaseObservation: string;  // observation about when they engage most
  rhythmNote: string;        // one-sentence observation about their rhythm
}

const PHASE_QUALITIES: Record<LunarPhase, string> = {
  new_moon: 'inward and still',
  waxing_crescent: 'tentative and beginning',
  first_quarter: 'active and decisive',
  waxing_gibbous: 'refining and building',
  full_moon: 'heightened and illuminated',
  waning_gibbous: 'integrating and sharing',
  last_quarter: 'releasing and clarifying',
  waning_crescent: 'resting and preparing',
};

// Find the most recent new moon before today
function findCycleStart(today: Date): Date {
  const KNOWN_NEW_MOON = new Date('2021-01-13T05:00:00Z');
  const LUNAR_CYCLE_MS = 29.53059 * 24 * 60 * 60 * 1000;
  const elapsed = today.getTime() - KNOWN_NEW_MOON.getTime();
  const cyclesCompleted = Math.floor(elapsed / LUNAR_CYCLE_MS);
  return new Date(KNOWN_NEW_MOON.getTime() + cyclesCompleted * LUNAR_CYCLE_MS);
}

export function buildLunarCycleReflection(
  dailyRecords: DailyRecord[],
  today: Date = new Date(),
): LunarCycleReflection {
  const currentPhase = computeLunarPhase(today);
  const cycleStart = findCycleStart(today);
  const cycleStartStr = cycleStart.toISOString().split('T')[0]!;

  // Filter records within this lunar cycle
  const cycleRecords = dailyRecords.filter(r => r.date >= cycleStartStr);

  // Find which lunar phases had the most engagement
  const phaseEngagement: Partial<Record<LunarPhase, number>> = {};
  for (const record of cycleRecords) {
    const phase = record.lunarPhase as LunarPhase;
    phaseEngagement[phase] = (phaseEngagement[phase] ?? 0) + 1;
  }

  const topPhaseEntry = Object.entries(phaseEngagement)
    .sort((a, b) => b[1] - a[1])[0];

  const topPhase = topPhaseEntry?.[0] as LunarPhase | undefined;

  const engagementPattern = cycleRecords.length === 0
    ? 'This cycle is just beginning.'
    : `You\'ve been present for ${cycleRecords.length} day${cycleRecords.length !== 1 ? 's' : ''} of this lunar cycle.`;

  const phaseObservation = topPhase
    ? `You tend to show up most when the energy is ${PHASE_QUALITIES[topPhase]} — ${topPhase.replace(/_/g, ' ')} periods.`
    : 'Your pattern across this cycle is still emerging.';

  const rhythmNote = buildRhythmNote(cycleRecords, currentPhase);

  return {
    currentPhase,
    cycleStartDate: cycleStartStr,
    engagementPattern,
    phaseObservation,
    rhythmNote,
  };
}

function buildRhythmNote(records: DailyRecord[], currentPhase: LunarPhase): string {
  const recentDays = records.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86_400_000 <= 7;
  }).length;

  if (recentDays === 0) return `The ${currentPhase.replace(/_/g, ' ')} phase is here — a natural time to re-engage if you\'re called to.`;
  if (recentDays >= 5) return `A consistent presence this week. The ${currentPhase.replace(/_/g, ' ')} energy is landing well.`;
  if (recentDays >= 3) return `You\'ve been checking in regularly. That has its own kind of rhythm.`;
  return `Occasional presence, which suits some people and some phases. Follow your own rhythm.`;
}
