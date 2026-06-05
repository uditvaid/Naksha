/**
 * Daily Layer 10 — Shareable Moment Architecture
 *
 * Extracts the most resonant sentence from a daily reading and formats
 * it as a beautiful text card ready for native share sheet.
 *
 * No image capture required — the format is designed to read well as
 * plain text while carrying the full astrological context.
 */

import type { LunarPhase } from './signals';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ShareCardContext {
  lunarPhase: LunarPhase;
  mahadasha: string;
  date?: Date;
}

export interface ShareMoment {
  quote: string;       // The extracted sentence(s)
  contextLine: string; // "Jupiter Mahadasha · Waxing Gibbous Moon"
  dateLabel: string;   // "Thursday, April 30"
  attribution: string; // "— naksha · vedic astrology"
  fullText: string;    // Combined, ready for Share.share()
}

// ─── Lunar Phase Labels ─────────────────────────────────────────────────────────

const PHASE_LABELS: Record<LunarPhase, string> = {
  new_moon:        'New Moon',
  waxing_crescent: 'Waxing Crescent Moon',
  first_quarter:   'First Quarter Moon',
  waxing_gibbous:  'Waxing Gibbous Moon',
  full_moon:       'Full Moon',
  waning_gibbous:  'Waning Gibbous Moon',
  last_quarter:    'Last Quarter Moon',
  waning_crescent: 'Waning Crescent Moon',
};

export function formatLunarPhase(phase: LunarPhase): string {
  return PHASE_LABELS[phase];
}

// ─── Quote Extraction ───────────────────────────────────────────────────────────

const MIN_QUOTE_LEN = 60;
const MAX_QUOTE_LEN = 240;

/**
 * Finds the most shareable sentence from a daily reading.
 * Prefers sentences that are substantive (60–240 chars) and don't start
 * with structural phrases that only make sense in context.
 */
export function extractShareQuote(reading: string): string {
  if (!reading.trim()) return '';

  // Split on sentence boundaries (period/em-dash/ellipsis followed by space or end)
  const sentences = reading
    .split(/(?<=[.!?…—])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  // Prefer sentences in the ideal length window that aren't list items or headers
  const SKIP_STARTS = /^(and |but |so |yet |then |also |note:|—)/i;

  for (const s of sentences) {
    if (s.length >= MIN_QUOTE_LEN && s.length <= MAX_QUOTE_LEN && !SKIP_STARTS.test(s)) {
      return s;
    }
  }

  // Fallback: first sentence, truncated
  const first = sentences[0] ?? reading.trim();
  if (first.length <= MAX_QUOTE_LEN) return first;
  const truncated = first.slice(0, MAX_QUOTE_LEN);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace > 40 ? lastSpace : MAX_QUOTE_LEN) + '…';
}

// ─── Share Card Builder ─────────────────────────────────────────────────────────

export function buildShareMoment(reading: string, ctx: ShareCardContext): ShareMoment {
  const date = ctx.date ?? new Date();

  const quote = extractShareQuote(reading);
  const contextLine = `${ctx.mahadasha} Mahadasha · ${formatLunarPhase(ctx.lunarPhase)}`;
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  // Two-line attribution: brand line + AI-generated disclosure. Apple's
  // newer AI-content guidance asks that AI-assisted content surfaced for
  // sharing be identifiable as such. The disclosure is small but present.
  const attribution = '— naksha · vedic astrology\nAI-assisted reading';

  const fullText = [
    `"${quote}"`,
    '',
    `✦ ${contextLine}`,
    dateLabel,
    '',
    attribution,
  ].join('\n');

  return { quote, contextLine, dateLabel, attribution, fullText };
}
