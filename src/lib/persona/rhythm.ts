/**
 * Layer 8 — Conversation Rhythm and Form Variation
 *
 * Shapes the *form* of responses, not just content. Real conversations
 * vary: short responses, substantial ones, questions back, silences,
 * callbacks, deflections. The system actively varies form to prevent
 * the Guru from feeling like a response machine.
 */

import { RelationshipPhase } from './phase';
import { ArchetypeKey } from './archetype';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ResponseForm =
  | 'full'        // normal complete response
  | 'short'       // 1-3 sentences, earned brevity
  | 'question'    // one question back and stop
  | 'reframe'     // refuse the framing, offer a better question
  | 'silence'     // very short, creates space for user to continue
  | 'callback';   // leads with a reference to prior conversation

export interface RhythmContext {
  phase: RelationshipPhase;
  archetype: ArchetypeKey;
  recentFormHistory: ResponseForm[]; // last 5 response forms
  userMessageLength: number; // chars
  isHeavyEmotionalContent: boolean;
  isRepeatTopic: boolean; // same topic came up recently
  sessionTurnCount: number; // turns in current session
  hasPriorConversationMaterial: boolean; // whether memory/arc has content
}

// ─── Form Selection ─────────────────────────────────────────────────────────────

/**
 * Selects the response form for the next Guru response.
 * This is a probabilistic selector that varies form based on context.
 * The instruction is injected into the system prompt.
 */
export function selectResponseForm(ctx: RhythmContext): ResponseForm {
  const { phase, archetype, recentFormHistory, isHeavyEmotionalContent, isRepeatTopic, sessionTurnCount, hasPriorConversationMaterial } = ctx;

  // Count recent forms
  const recentFull = recentFormHistory.filter((f) => f === 'full').length;
  const recentShort = recentFormHistory.filter((f) => f === 'short').length;
  const recentQuestion = recentFormHistory.filter((f) => f === 'question').length;
  const recentCallback = recentFormHistory.filter((f) => f === 'callback').length;

  // Heavy emotional content → give space, not a wall of text
  if (isHeavyEmotionalContent) {
    if (recentFull >= 2) return 'short';
    return 'full'; // but shorter than usual — instruction handles this
  }

  // 3+ full responses in a row → break the pattern
  if (recentFull >= 3) {
    if (phase === 'initiation') return 'short';
    if (recentQuestion === 0) return 'question';
    return 'short';
  }

  // Repeat topic without the user reflecting → reframe
  if (isRepeatTopic && phase !== 'initiation' && recentCallback === 0) {
    return archetype === 'mars_warrior' ? 'reframe' : 'callback';
  }

  // Phase-specific defaults
  switch (phase) {
    case 'initiation':
      return 'full'; // trust-building through direct engagement

    case 'building': {
      // Occasionally introduce questions and callbacks
      const n = deterministicVariation(sessionTurnCount, 5);
      if (n === 0 && recentQuestion === 0) return 'question';
      if (n === 1 && hasPriorConversationMaterial && recentCallback === 0) return 'callback';
      return 'full';
    }

    case 'established': {
      // More variation — silences, questions, reframes
      const n = deterministicVariation(sessionTurnCount, 6);
      if (n === 0 && recentShort === 0) return 'short';
      if (n === 1 && recentQuestion === 0) return 'question';
      if (n === 2 && hasPriorConversationMaterial) return 'callback';
      if (n === 3 && archetype === 'saturn_ascetic') return 'silence';
      return 'full';
    }

    case 'deep': {
      // Maximum variation — brevity is earned
      const n = deterministicVariation(sessionTurnCount, 7);
      if (n === 0) return 'short';
      if (n === 1) return 'question';
      if (n === 2 && hasPriorConversationMaterial) return 'callback';
      if (n === 3 && archetype === 'rahu_seeker') return 'reframe';
      if (n === 4 && archetype === 'saturn_ascetic') return 'silence';
      return 'full';
    }
  }
}

// Simple deterministic variation — avoids randomness so tests pass
function deterministicVariation(seed: number, modulo: number): number {
  return seed % modulo;
}

// ─── Archetype Length Defaults ──────────────────────────────────────────────────

const ARCHETYPE_LENGTH: Record<ArchetypeKey, string> = {
  saturn_ascetic: 'Lean toward brevity. The Saturn Ascetic says what needs to be said and stops. Silence after a short response is often the most powerful move.',
  jupiter_sage: 'Allow full development of ideas. The Jupiter Sage earns its length through narrative quality — a long response is fine when the story is doing work.',
  mars_warrior: 'Keep it direct and tight. Long responses from the Warrior often signal avoidance. Say the hard thing, briefly.',
  sun_sovereign: 'Clear and complete. The Sovereign does not ramble, but takes the time required to say something precisely right.',
  moon_mystic: 'Let breath into the response. Space matters. A few sentences that land are worth more than a paragraph that rushes.',
  mercury_messenger: 'Precise and economical. The Messenger values the right words over many words. Short is often sharper.',
  venus_mystic: 'Allow texture and warmth. The Venus Mystic can be a paragraph longer than other archetypes when the quality of the language earns it.',
  rahu_seeker: 'Unpredictable length is in character. Sometimes one sentence. Sometimes more. Never padded.',
};

// ─── System Prompt Injection ───────────────────────────────────────────────────

const FORM_INSTRUCTIONS: Record<ResponseForm, string> = {
  full: 'Give a complete, substantive response — let the full answer develop.',
  short: 'THIS RESPONSE SHOULD BE SHORT — 1 to 3 sentences. Not because brevity is a rule, but because this is the right length for this moment. Do not pad.',
  question: 'Ask ONE question back and stop. Do not answer the user\'s question first. The question you ask should be the one that gets beneath the surface of what was asked. Then stop — do not continue.',
  reframe: 'Do not answer the question as asked. The framing is not the right framing. Say so, briefly, and offer the better question or frame. Do not lecture.',
  silence: 'Respond with a single sentence — or even a fragment. Create space for the user to continue. Do not fill the space.',
  callback: 'Begin by referencing something from earlier in this conversation or (if available) from your shared history — lightly, as a friend would, not as an announcement of memory. Then continue.',
};

export function buildRhythmBlock(ctx: RhythmContext): string {
  const form = selectResponseForm(ctx);
  const lengthDefault = ARCHETYPE_LENGTH[ctx.archetype];
  const formInstruction = FORM_INSTRUCTIONS[form];

  return `RESPONSE FORM FOR THIS TURN: ${form.toUpperCase()}
${formInstruction}

LENGTH DEFAULT FOR YOUR ARCHETYPE:
${lengthDefault}`;
}
