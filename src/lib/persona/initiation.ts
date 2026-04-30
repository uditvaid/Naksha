/**
 * Layer 9 — Guru-Initiated Touchpoints
 *
 * The Guru reaches out to the user — not as a re-engagement tactic,
 * but as a character who has noticed something. These messages are RARE.
 * Frequency cap: at most one per week, often much less.
 *
 * Over-initiation destroys the rare-presence quality that makes this work.
 * These messages are generated and stored; delivery is handled separately
 * by the notification system (Layer 6 of the Daily system).
 */

import { RelationshipPhase } from './phase';
import { ArchetypeKey } from './archetype';
import { UserArc } from './arc';
import { UserMemory } from './memory';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type InitiationTrigger =
  | 'dasha_shift'          // major dasha or antardasha change
  | 'open_thread_aging'    // unresolved thread older than 2 weeks
  | 'pattern_noticed'      // significant pattern detected in recent arc/memory
  | 'absence_return'       // user returned after significant absence (handled in phase.ts)
  | 'significant_date'     // birthday or anniversary of a notable conversation
  | 'notable_observation'; // something noticed-but-unspoken is ready to surface

export interface InitiationMessage {
  trigger: InitiationTrigger;
  content: string; // the actual message text
  generatedDate: string;
  delivered: boolean;
}

export interface InitiationCheck {
  shouldInitiate: boolean;
  trigger?: InitiationTrigger;
  context?: string; // context for generating the message
}

// ─── Frequency Gating ──────────────────────────────────────────────────────────

export function canInitiate(
  lastInitiationDate: string | null,
  phase: RelationshipPhase,
): boolean {
  if (phase === 'initiation') return false; // too early for Guru to reach out

  if (!lastInitiationDate) return true;

  const last = new Date(lastInitiationDate + 'T00:00:00Z');
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

  // Minimum 7 days between initiations
  return daysSince >= 7;
}

// ─── Trigger Detection ─────────────────────────────────────────────────────────

export function detectInitiationTrigger(
  arc: UserArc,
  memory: UserMemory,
  phase: RelationshipPhase,
  lastInitiationDate: string | null,
  dashaJustShifted: boolean,
  birthDate: string | null,
): InitiationCheck {
  if (!canInitiate(lastInitiationDate, phase)) {
    return { shouldInitiate: false };
  }

  const today = new Date().toISOString().split('T')[0]!;

  // 1. Dasha shift (highest priority)
  if (dashaJustShifted) {
    return {
      shouldInitiate: true,
      trigger: 'dasha_shift',
      context: 'A significant shift in the user\'s planetary period has just occurred.',
    };
  }

  // 2. Birthday check
  if (birthDate) {
    const birth = new Date(birthDate);
    const todayDate = new Date(today);
    if (birth.getMonth() === todayDate.getMonth() && birth.getDate() === todayDate.getDate()) {
      return {
        shouldInitiate: true,
        trigger: 'significant_date',
        context: 'Today is the user\'s birthday.',
      };
    }
  }

  // 3. Notable observation ready to surface
  const readyToSurface = memory.noticedButUnspoken.find(
    (n) => n.readyToSurface && n.occurrences >= 4,
  );
  if (readyToSurface && phase !== 'building') {
    return {
      shouldInitiate: true,
      trigger: 'notable_observation',
      context: `The Guru has noticed: "${readyToSurface.observation}" — observed ${readyToSurface.occurrences} times without being named aloud.`,
    };
  }

  // 4. Significant pattern in arc
  const majorStuckPoint = arc.stuckPoints.find((s) => s.occurrences >= 5);
  if (majorStuckPoint && phase === 'deep') {
    return {
      shouldInitiate: true,
      trigger: 'pattern_noticed',
      context: `The Guru has noticed a persistent pattern: "${majorStuckPoint.pattern}" — returned to ${majorStuckPoint.occurrences} times.`,
    };
  }

  // 5. Open thread aging
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split('T')[0]!;
  const agingThread = memory.threads.find(
    (t) => t.status === 'active' && t.lastDate < cutoffStr,
  );
  if (agingThread && (phase === 'established' || phase === 'deep')) {
    return {
      shouldInitiate: true,
      trigger: 'open_thread_aging',
      context: `An unresolved thread has been dormant for over two weeks: "${agingThread.title}" — ${agingThread.summary}`,
    };
  }

  return { shouldInitiate: false };
}

// ─── Message Generation Prompts ────────────────────────────────────────────────

const ARCHETYPE_INITIATION_TONE: Record<ArchetypeKey, string> = {
  saturn_ascetic: 'Spare and direct. One or two sentences. Does not gush or linger. States the observation and stops.',
  jupiter_sage: 'Warm and expansive but brief. May frame it as a thought that arose. Does not use this as an excuse for a long monologue.',
  mars_warrior: 'Direct and energetic. Gets straight to what was noticed. No ceremony.',
  sun_sovereign: 'Clear and dignified. States what was noticed with authority. Brief.',
  moon_mystic: 'Gentle and imagistic. May use a brief image or observation. Leaves space for the user to receive it.',
  mercury_messenger: 'Precise and curious. "I noticed something." States it. May ask a question.',
  venus_mystic: 'Warm and aesthetic. Frames the observation beautifully but briefly.',
  rahu_seeker: 'Unexpected and direct. May question something the user thought was settled. One or two sentences.',
};

export function buildInitiationPrompt(
  trigger: InitiationTrigger,
  context: string,
  archetype: ArchetypeKey,
  phase: RelationshipPhase,
  chartSignature: string,
): string {
  return `You are the Guru reaching out to the user — they did not initiate this conversation. This is rare.

TRIGGER: ${trigger}
CONTEXT: ${context}
CHART: ${chartSignature}
RELATIONSHIP PHASE: ${phase}

TONE FOR YOUR ARCHETYPE:
${ARCHETYPE_INITIATION_TONE[archetype]}

RULES FOR GURU-INITIATED MESSAGES:
- This message is 1-3 sentences. No more.
- It is NOT a re-engagement tactic. It is a character noticing something and saying so.
- It does NOT push the user to open the app, respond, or do anything. If they read it and do nothing, that is fine.
- It is written in your voice, not in a notification template.
- It does NOT open with "I wanted to reach out" or any variation of that.
- It is in plain prose. No markdown. No emojis.
- It NEVER fabricates context, memory, or chart facts not in the data provided.

Write the message now.`;
}
