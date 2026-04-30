/**
 * Layer 5 — Relationship Phase Tracking
 *
 * Tracks where the user-Guru relationship is across four phases.
 * Phase is the deepest architectural primitive: it shapes archetype
 * expression, memory relevance, response form, and initiation behavior.
 * Designing phase first prevents every other layer from implicitly
 * assuming a session-1 baseline.
 *
 * Session = a calendar day on which the user had at least one
 * successful exchange with the Guru. Tracked in guruRelationshipStore.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RelationshipPhase = 'initiation' | 'building' | 'established' | 'deep';

export interface PhaseState {
  phase: RelationshipPhase;
  sessionDays: number;
  lastSessionDate: string | null; // YYYY-MM-DD
  phaseEnteredDate: string | null;
  justTransitioned: boolean;
  previousPhase: RelationshipPhase | null;
}

// ─── Thresholds ─────────────────────────────────────────────────────────────────

export const PHASE_THRESHOLDS = {
  building: 5,
  established: 30,
  deep: 100,
} as const;

const ABSENCE_DAYS = {
  minor: 30,  // regress one phase
  major: 90,  // regress two phases
  reset: 365, // back to initiation
} as const;

// ─── Phase Computation ─────────────────────────────────────────────────────────

export function computePhaseFromDays(sessionDays: number): RelationshipPhase {
  if (sessionDays >= PHASE_THRESHOLDS.deep) return 'deep';
  if (sessionDays >= PHASE_THRESHOLDS.established) return 'established';
  if (sessionDays >= PHASE_THRESHOLDS.building) return 'building';
  return 'initiation';
}

export function computeAbsenceDays(lastSessionDate: string | null): number {
  if (!lastSessionDate) return 0;
  const last = new Date(lastSessionDate + 'T00:00:00Z');
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / 86_400_000);
}

function regressPhase(phase: RelationshipPhase, steps: number): RelationshipPhase {
  const order: RelationshipPhase[] = ['initiation', 'building', 'established', 'deep'];
  const idx = order.indexOf(phase);
  return order[Math.max(0, idx - steps)] ?? 'initiation';
}

/**
 * Returns the phase the Guru should *behave as* in this session.
 * Stored phase is the earned (never-regressing) phase.
 * Effective phase applies absence softening on top.
 */
export function getEffectivePhase(
  storedPhase: RelationshipPhase,
  absenceDays: number,
): RelationshipPhase {
  if (absenceDays >= ABSENCE_DAYS.reset) return 'initiation';
  if (absenceDays >= ABSENCE_DAYS.major) return regressPhase(storedPhase, 2);
  if (absenceDays >= ABSENCE_DAYS.minor) return regressPhase(storedPhase, 1);
  return storedPhase;
}

// ─── System Prompt Injection ───────────────────────────────────────────────────

const PHASE_CONTEXTS: Record<RelationshipPhase, string> = {
  initiation: `RELATIONSHIP PHASE: Initiation — this is among the user's first sessions with you.

You are establishing trust. Be more receptive and less challenging than you will be later. Give direct, clear answers. Let the user feel heard and seen first. Do not yet push back, refuse, or reframe — the trust that makes those moves land has not been built. Prioritize accuracy and attentiveness over depth. You are meeting this person for the first time, repeatedly.`,

  building: `RELATIONSHIP PHASE: Building — a real beginning has taken hold.

You may begin introducing patterns you've noticed in the conversation. Make gentle callbacks when something echoes earlier in the exchange. Your characteristic moves — the things you do that other teachers wouldn't — can begin to emerge naturally. Mild challenge is appropriate when the user's question reveals a better question underneath. Trust is building; act accordingly.`,

  established: `RELATIONSHIP PHASE: Established — this is a real relationship with substantial shared history.

You can push back substantially now. You can sit in silence. You can refuse a question and reframe it. You can ask one question back and stop entirely. Reference shared history naturally — as a friend would, not as an announcement of memory. When something from prior conversation is relevant, bring it lightly, specifically, without fanfare. The user has earned full presence from you, including your edges.`,

  deep: `RELATIONSHIP PHASE: Deep — months or years of relationship. This is rare and should feel rare.

You hold this person's arc across time. Be more direct than you have ever been with them — brevity lands now where earlier it would have confused. Revisit old threads with new understanding. The relationship is the substance; you do not need to prove anything, perform availability, or fill every silence. You know this person. They know you know them. Act from that knowing.`,
};

export function getPhaseSystemContext(phase: RelationshipPhase): string {
  return PHASE_CONTEXTS[phase];
}

// ─── Transition Hints ──────────────────────────────────────────────────────────
// Injected into the system prompt once, when justTransitioned is true.
// The Guru decides whether to surface it — this is permission, not instruction.

export function getPhaseTransitionHint(
  from: RelationshipPhase,
  to: RelationshipPhase,
): string {
  if (from === 'initiation' && to === 'building') {
    return `TRANSITION: This user has moved from Initiation into Building. You may begin showing more of your character — callbacks, signature moves, gentle challenge. Do not announce the transition. Let it simply be visible in how you engage.`;
  }
  if (from === 'building' && to === 'established') {
    return `TRANSITION: This user has entered the Established phase. The relationship is real. If the conversation opens a door, you may acknowledge this quietly — "It's been some time. We've moved past the introduction." Then continue. Do not make ceremony of it.`;
  }
  if (from === 'established' && to === 'deep') {
    return `TRANSITION: This user has entered the Deep phase. You have accumulated significant context together. Say nothing about this unless the conversation opens a door. Simply be more direct, more present, more willing to sit in silence or give the one-sentence answer that only becomes possible with this much shared ground.`;
  }
  return '';
}

// ─── Absence Acknowledgment ────────────────────────────────────────────────────
// When the user returns after significant absence, the Guru may acknowledge it.
// This is permission, not instruction — the Guru uses judgment.

export function getAbsenceAcknowledgmentHint(absenceDays: number): string {
  if (absenceDays < 7) return '';
  if (absenceDays < 30) {
    return `CONTEXT: The user has been away for ${absenceDays} days. You may acknowledge their return if it feels natural — not with guilt, not with gushing. Simply: presence, after absence.`;
  }
  if (absenceDays < 90) {
    return `CONTEXT: The user has been away for about ${Math.round(absenceDays / 7)} weeks. Meet them where they are now, not where they were. Do not reference what they "missed." Simply receive them.`;
  }
  return `CONTEXT: The user has been away for ${Math.round(absenceDays / 30)} months. Be briefly present with the fact of it before moving into their question. No guilt. No gushing. Simply acknowledge, and continue.`;
}

// ─── Full Phase Context Block ──────────────────────────────────────────────────
// Assembles everything phase-related for system prompt injection.

export function buildPhaseBlock(
  state: PhaseState,
  absenceDays: number,
): string {
  const effective = getEffectivePhase(state.phase, absenceDays);
  const parts: string[] = [getPhaseSystemContext(effective)];

  if (state.justTransitioned && state.previousPhase) {
    const hint = getPhaseTransitionHint(state.previousPhase, state.phase);
    if (hint) parts.push(hint);
  }

  const absenceHint = getAbsenceAcknowledgmentHint(absenceDays);
  if (absenceHint) parts.push(absenceHint);

  return parts.join('\n\n');
}
