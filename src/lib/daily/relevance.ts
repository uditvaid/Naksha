/**
 * Daily Layer 3 — Signal Relevance Filtering
 *
 * Given the full signal set, ranks what actually matters today for
 * this specific user. Relevance depends on: signals affecting key
 * chart points, changing vs. continuing signals, user's topic interests,
 * and recent life events from memory.
 */

import { DailySignal, DailySignalSet } from './signals';
import { EngagementProfile } from './engagementProfile';
import { UserMemory } from '@lib/persona/memory';

export interface FilteredSignals {
  primary: DailySignal[];   // 1-3 signals driving today's narrative
  context: DailySignal[];   // supporting signals
  narrativeSeed: string;    // one sentence describing what today is about
  suggestedTone: string;    // tone for synthesis
}

const TOPIC_SIGNAL_MAP: Record<string, string[]> = {
  career: ['dasha', 'upcoming'],
  relationship: ['lunar', 'transit'],
  health: ['lunar', 'panchang'],
  spiritual: ['dasha', 'lunar'],
  family: ['lunar', 'dasha'],
  purpose: ['dasha', 'upcoming'],
};

export function filterSignals(
  signalSet: DailySignalSet,
  profile: EngagementProfile,
  memory: UserMemory,
): FilteredSignals {
  const { signals } = signalSet;

  // Start with significance-sorted signals
  const sorted = [...signals].sort((a, b) => b.significance - a.significance);

  // Upweight signals relevant to user's topic interests
  const userTopics = profile.topicInterests.slice(0, 3);
  const relevantTypes = new Set(
    userTopics.flatMap(t => TOPIC_SIGNAL_MAP[t] ?? [])
  );

  const scored = sorted.map(s => ({
    signal: s,
    score: s.significance + (relevantTypes.has(s.type) ? 0.15 : 0) + (s.isNew ? 0.1 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Upweight if an active memory thread overlaps
  const activeThreadTopics = memory.threads
    .filter(t => t.status === 'active')
    .map(t => t.title.toLowerCase());

  const finalScored = scored.map(({ signal, score }) => {
    const threadBoost = activeThreadTopics.some(t =>
      signal.description.toLowerCase().includes(t) ||
      t.split(' ').some(w => w.length > 4 && signal.description.toLowerCase().includes(w))
    ) ? 0.1 : 0;
    return { signal, score: score + threadBoost };
  });

  finalScored.sort((a, b) => b.score - a.score);

  const primary = finalScored.slice(0, Math.min(3, finalScored.length)).map(s => s.signal);
  const context = finalScored.slice(3).map(s => s.signal);

  const narrativeSeed = buildNarrativeSeed(signalSet, primary);
  const suggestedTone = suggestTone(signalSet, profile);

  return { primary, context, narrativeSeed, suggestedTone };
}

function buildNarrativeSeed(set: DailySignalSet, primary: DailySignal[]): string {
  if (set.isQuietDay) {
    return `A quiet day — good for stillness and inner listening rather than outer movement.`;
  }

  const topSignal = primary[0];
  if (!topSignal) return `Today carries the ${set.mahadasha} Mahadasha energy.`;

  if (topSignal.type === 'dasha' && topSignal.isNew) {
    return `A shift has just arrived — the ${set.antardasha ?? set.mahadasha} sub-period is new.`;
  }
  if (topSignal.type === 'lunar') {
    return `The ${set.lunarPhase.replace(/_/g, ' ')} moon shapes today's quality.`;
  }
  if (topSignal.type === 'upcoming') {
    return `Something is approaching — a shift in emphasis within days.`;
  }

  return `Today the ${set.mahadasha} current is ${set.antardasha ? `moving through ${set.antardasha}` : 'at full expression'}.`;
}

function suggestTone(set: DailySignalSet, profile: EngagementProfile): string {
  // Match user's responsive tone if known, otherwise derive from signals
  if (profile.toneSignalCount >= 5) {
    const entries = Object.entries(profile.toneScores) as [string, number][];
    const top = entries.sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0.6) return top[0];
  }

  // Derive from signal content
  if (set.lunarPhase === 'new_moon') return 'reflective';
  if (set.lunarPhase === 'full_moon') return 'celebratory';
  if (set.isQuietDay) return 'reflective';
  if (set.signals.some(s => s.isNew && s.significance > 0.7)) return 'practical';
  return 'philosophical';
}
