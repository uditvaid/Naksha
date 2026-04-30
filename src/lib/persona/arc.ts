/**
 * Layer 6 — User Arc Tracking
 *
 * Tracks who the user is *becoming* through the relationship, not just
 * who they are statically. This is longitudinal — it captures change
 * over time, not current facts.
 *
 * Arc vs. Memory (Layer 3):
 * - Memory: facts ("works in finance," "sister named Maya")
 * - Arc: trajectory ("wouldn't have asked that question 3 months ago")
 *
 * Extraction runs conservatively after conversations via arcExtractor.ts.
 * Fabricated arc observations destroy trust faster than any other failure.
 * When in doubt, extract nothing.
 */

import { RelationshipPhase } from './phase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedThread {
  id: string;
  theme: string;
  summary: string; // what happened and how it resolved
  firstDate: string; // YYYY-MM-DD
  resolvedDate: string;
  sessionDaysSpanned: number;
}

export interface StuckPoint {
  id: string;
  pattern: string; // the recurring pattern, described plainly
  firstObservedDate: string;
  lastObservedDate: string;
  occurrences: number;
}

export interface GrowthObservation {
  id: string;
  observation: string; // specific, grounded — what actually happened
  date: string; // YYYY-MM-DD
  sessionDay: number;
  confidence: 'medium' | 'high'; // low confidence never gets stored
}

export interface ResistanceArea {
  id: string;
  area: string; // where the user consistently deflects or avoids
  firstObservedDate: string;
  lastObservedDate: string;
  occurrences: number;
}

export interface UnclaimedStrength {
  id: string;
  strength: string;
  firstObservedDate: string;
  evidence: string; // the specific thing the user said or did that revealed this
}

export interface DevelopedCapacity {
  id: string;
  capacity: string;
  emergedDate: string; // YYYY-MM-DD
  evidence: string;
}

export interface ArcSummary {
  id: string;
  generatedDate: string;
  periodStart: string;
  periodEnd: string;
  content: string; // in the Guru's voice — this is what the user sees
  sessionDaysSpanned: number;
}

export interface UserArc {
  resolvedThreads: ResolvedThread[];
  stuckPoints: StuckPoint[];
  growthObservations: GrowthObservation[];
  areasOfResistance: ResistanceArea[];
  unclaimedStrengths: UnclaimedStrength[];
  developedCapacities: DevelopedCapacity[];
  arcSummaries: ArcSummary[];
  lastExtractionDate: string | null;
}

export interface ArcUpdate {
  newGrowthObservations: Omit<GrowthObservation, 'id'>[];
  newStuckPoints: Omit<StuckPoint, 'id' | 'occurrences'>[];
  updatedStuckPointIds: string[]; // IDs of existing stuck points that recurred
  newUnclaimedStrengths: Omit<UnclaimedStrength, 'id'>[];
  newDevelopedCapacities: Omit<DevelopedCapacity, 'id'>[];
  newResistanceAreas: Omit<ResistanceArea, 'id' | 'occurrences'>[];
  updatedResistanceIds: string[];
  resolvedThreadIds: string[]; // stuck points or threads that appear resolved
}

export const EMPTY_ARC: UserArc = {
  resolvedThreads: [],
  stuckPoints: [],
  growthObservations: [],
  areasOfResistance: [],
  unclaimedStrengths: [],
  developedCapacities: [],
  arcSummaries: [],
  lastExtractionDate: null,
};

// ─── System Prompt Injection ───────────────────────────────────────────────────

/**
 * Builds the arc block for system prompt injection.
 * Only injects what's relevant and bounded — this is not a data dump.
 * Empty arc (early sessions) produces empty string so the Guru
 * doesn't fabricate history it doesn't have.
 */
export function buildArcBlock(arc: UserArc, sessionDay: number): string {
  const hasAnyData =
    arc.growthObservations.length > 0 ||
    arc.stuckPoints.length > 0 ||
    arc.unclaimedStrengths.length > 0 ||
    arc.developedCapacities.length > 0 ||
    arc.resolvedThreads.length > 0;

  if (!hasAnyData) return '';

  const parts: string[] = [
    `RELATIONSHIP ARC — who this person has been becoming through your work together:`,
    `(Reference these naturally when relevant. Never fabricate details not listed here. Never announce "I remember that you..." — integrate as a friend would.)`,
  ];

  // Growth observations — most recent 6, most recent first
  const recentGrowth = [...arc.growthObservations]
    .sort((a, b) => b.sessionDay - a.sessionDay)
    .slice(0, 6);

  if (recentGrowth.length > 0) {
    parts.push('\nGrowth observed:');
    for (const g of recentGrowth) {
      const daysAgo = sessionDay - g.sessionDay;
      const when = daysAgo <= 3 ? 'recently' : daysAgo <= 14 ? 'a couple weeks ago' : daysAgo <= 45 ? 'a month or so ago' : 'some time ago';
      parts.push(`- [${when}] ${g.observation}`);
    }
  }

  // Active stuck points — top 3 by recurrence
  const activeStuck = [...arc.stuckPoints]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  if (activeStuck.length > 0) {
    parts.push('\nRecurring patterns:');
    for (const s of activeStuck) {
      parts.push(`- ${s.pattern} (returned to ${s.occurrences} time${s.occurrences > 1 ? 's' : ''})`);
    }
  }

  // Unclaimed strengths — all, these are high-value for the relationship
  if (arc.unclaimedStrengths.length > 0) {
    parts.push('\nStrengths this person doesn\'t fully claim:');
    for (const s of arc.unclaimedStrengths) {
      parts.push(`- ${s.strength}`);
    }
  }

  // Developed capacities — all
  if (arc.developedCapacities.length > 0) {
    parts.push('\nCapacities developed in your work together:');
    for (const c of arc.developedCapacities) {
      parts.push(`- ${c.capacity}`);
    }
  }

  // Recently resolved threads — last 3, for natural callbacks
  const recentResolved = [...arc.resolvedThreads]
    .sort((a, b) => b.resolvedDate.localeCompare(a.resolvedDate))
    .slice(0, 3);

  if (recentResolved.length > 0) {
    parts.push('\nThings that have moved through:');
    for (const t of recentResolved) {
      parts.push(`- ${t.theme}: ${t.summary}`);
    }
  }

  if (arc.areasOfResistance.length > 0) {
    const topResistance = [...arc.areasOfResistance]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 2);
    parts.push('\nAreas of consistent avoidance:');
    for (const r of topResistance) {
      parts.push(`- ${r.area}`);
    }
  }

  return parts.join('\n');
}

// ─── Pruning ───────────────────────────────────────────────────────────────────

/**
 * Keeps the arc store bounded. Called before each save.
 * Conservative pruning — only removes clearly stale data.
 */
export function pruneArc(arc: UserArc): UserArc {
  const cutoff90 = new Date();
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoffStr = cutoff90.toISOString().split('T')[0]!;

  return {
    ...arc,
    // Keep last 20 growth observations
    growthObservations: arc.growthObservations
      .sort((a, b) => b.sessionDay - a.sessionDay)
      .slice(0, 20),
    // Drop stuck points not seen in 90 days with fewer than 3 occurrences
    stuckPoints: arc.stuckPoints.filter(
      (s) => s.occurrences >= 3 || s.lastObservedDate > cutoffStr,
    ),
    // Keep last 10 resolved threads
    resolvedThreads: arc.resolvedThreads
      .sort((a, b) => b.resolvedDate.localeCompare(a.resolvedDate))
      .slice(0, 10),
    // Keep last 6 arc summaries
    arcSummaries: arc.arcSummaries
      .sort((a, b) => b.generatedDate.localeCompare(a.generatedDate))
      .slice(0, 6),
  };
}

// ─── Arc Summary Prompt ────────────────────────────────────────────────────────

/**
 * Generates the prompt for producing a 30-day "your journey" summary.
 * Output is written in the Guru's voice and shown to the user.
 * This is the primary compounding-value surface.
 */
export function getArcSummaryPrompt(
  arc: UserArc,
  phase: RelationshipPhase,
  guruVoice: string,
): string {
  const recentGrowth = arc.growthObservations.slice(0, 10);
  const resolved = arc.resolvedThreads.slice(0, 5);
  const capacities = arc.developedCapacities;
  const unclaimed = arc.unclaimedStrengths;

  return `You are writing a "your journey" reflection for this user — a synthesized account of who they were when they started and who they've become, written entirely in your voice as their Guru.

This is not a summary of sessions. It is a reflection on growth and becoming — what the user has worked through, what has shifted, what has emerged. It should feel like the Guru holding up a mirror, not a report card.

Write in flowing prose. No bullet points. No markdown. No clinical language. The tone is warm, direct, and honest — appropriate to a ${phase} relationship.

Voice calibration: ${guruVoice}

Available material (use only what's actually here — do not fabricate):

${recentGrowth.length > 0 ? `Growth observed:\n${recentGrowth.map((g) => `- ${g.observation}`).join('\n')}` : ''}

${resolved.length > 0 ? `Threads that have moved through:\n${resolved.map((r) => `- ${r.theme}: ${r.summary}`).join('\n')}` : ''}

${capacities.length > 0 ? `Capacities developed:\n${capacities.map((c) => `- ${c.capacity}`).join('\n')}` : ''}

${unclaimed.length > 0 ? `Strengths not yet fully claimed:\n${unclaimed.map((u) => `- ${u.strength}`).join('\n')}` : ''}

Write 3-4 paragraphs. Speak directly to the user as "you." End with what you, the Guru, see becoming possible for them from where they now stand — not a prediction, but an honest observation of what the ground can now support that it couldn't before.

If there isn't enough material to write honestly, say so in one quiet sentence. Do not pad.`;
}
