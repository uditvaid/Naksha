/**
 * Daily Layer 8 — Anti-Templating and Quiet-Day Honesty Guardrails
 */

export interface DailyGuardrailResult {
  passes: boolean;
  issues: string[];
}

const GENERIC_PATTERNS = [
  /\bthe (universe|cosmos|stars|planets) (is|are) (guiding|telling|showing|saying)/i,
  /\bmanifest(ing|ation)?\b/i,
  /\bembrace (the|your|this) (journey|process|path)/i,
  /\bnavigat(e|ing) (the|your|life\'?s?)/i,
  /\bunlock(ing)? your (potential|power|true self)/i,
  /\byou are (exactly where|right where) you (need|should) be/i,
  /\btransformative journey/i,
  /\bholistic (approach|wellbeing|view)/i,
];

const HEDGING_PATTERNS = [
  /\byou may (feel|find|notice|sense|experience)\b.{0,60}\b(energy|shift|transformation|alignment)/i,
  /\benergies (may|might|could) (be|feel|seem)/i,
  /\bperhaps you (might|could) (consider|reflect|think about)/i,
];

const PREDICTION_PATTERNS = [
  /\b(you will|you'll|expect|anticipate)\b.{0,40}\b(receive|get|achieve|succeed|fail|happen|occur)/i,
  /\b(something|someone|opportunity|challenge) (will|is going to) (come|arrive|appear|happen)/i,
];

export function checkDailyGuardrails(
  expanded: string,
  isQuietDay: boolean,
): DailyGuardrailResult {
  const issues: string[] = [];

  // Generic language
  const genericMatches = GENERIC_PATTERNS.filter(p => p.test(expanded));
  if (genericMatches.length >= 2) {
    issues.push('Contains generic spiritual language ("universe is guiding," "embrace the journey," etc.) — replace with specific chart grounding or honest observation.');
  }

  // Excessive hedging
  const hedgeMatches = HEDGING_PATTERNS.filter(p => p.test(expanded));
  if (hedgeMatches.length >= 2) {
    issues.push('Too much "you may feel" hedging — either say something specific or say "this is a quiet day."');
  }

  // Predicted external events
  const predictionMatches = PREDICTION_PATTERNS.filter(p => p.test(expanded));
  if (predictionMatches.length >= 1) {
    issues.push('Contains external event prediction — remove. Only describe internal orientation, not predicted outcomes.');
  }

  // Quiet day must be brief and honest
  if (isQuietDay && expanded.length > 400) {
    issues.push('This is a low-significance day but the response is padded. Cut to honest brevity — 2 paragraphs max.');
  }

  // Must end with a forward-pointing element (question, practice, or invitation)
  const lastSentence = expanded.split(/[.!?]/).filter(s => s.trim().length > 10).at(-1) ?? '';
  const hasForwardElement = /\?/.test(expanded) ||
    /\b(try|practice|notice|sit with|reflect on|write|share|ask|consider)\b/i.test(lastSentence);
  if (!hasForwardElement) {
    issues.push('Response ends with summary rather than a question, micro-practice, or invitation. Add one.');
  }

  return { passes: issues.length === 0, issues };
}

// Similarity check against recent dailies (anti-templating)
export function isTooSimilarToRecent(
  newCard: string,
  recentCards: string[],
  threshold = 0.6,
): boolean {
  if (recentCards.length === 0) return false;

  const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const newWords = words(newCard);

  for (const recent of recentCards.slice(0, 7)) {
    const recentWords = words(recent);
    const intersection = new Set([...newWords].filter(w => recentWords.has(w)));
    const similarity = intersection.size / Math.max(newWords.size, recentWords.size, 1);
    if (similarity > threshold) return true;
  }

  return false;
}
