/**
 * Chandra Bala (Moon-strength) — internal input for the daily synthesis.
 *
 * Prokerala's /chandra-bala endpoint returns the rasis where today's Moon
 * transit is classically favorable for the user (computed from natal Moon
 * position). There's no user-facing surface for this data — it's too
 * rasi-jargon-heavy. Instead we pass a brief summary into Claude's daily
 * reading prompt as additional context, so the reading can be coloured by
 * "today's Moon is/isn't in a favorable transit for this person" without
 * exposing the rasi names directly.
 */

import { getChandraBala, type ChandraBalaData } from '@services/prokerala';
import type { BirthData } from '@store/userStore';

// Map Sanskrit rasi names from Prokerala to common English names so the
// downstream prompt is more legible to Claude (and doesn't rely on Claude
// recognising "Vrishabha" as Taurus etc.).
const RASI_TO_ENGLISH: Record<string, string> = {
  Mesha:     'Aries',
  Vrishabha: 'Taurus',
  Vrishaba:  'Taurus',
  Mithuna:   'Gemini',
  Karka:     'Cancer',
  Kataka:    'Cancer',
  Simha:     'Leo',
  Kanya:     'Virgo',
  Tula:      'Libra',
  Vrischika: 'Scorpio',
  Vrishchika:'Scorpio',
  Dhanu:     'Sagittarius',
  Makara:    'Capricorn',
  Kumbha:    'Aquarius',
  Meena:     'Pisces',
};

function toEnglish(rasi: string): string {
  return RASI_TO_ENGLISH[rasi] ?? rasi;
}

/**
 * Build a short prompt-line summary of today's Chandra Bala for the user.
 * Returns null if the data is empty or unfetchable. Format:
 *   "Moon-transit favorable rasis for this person today: Gemini, Cancer, Libra, Sagittarius, Aquarius, Pisces."
 *
 * Claude can cross-reference this with the panchang line ("Moon in Uttara
 * Ashadha") to determine whether today is a favorable Moon-transit day.
 */
export function chandraBalaPromptLine(data: ChandraBalaData | null): string | null {
  if (!data || data.windows.length === 0) return null;
  // Collapse all windows' favorable rasis into a single deduped list.
  // The Prokerala response usually returns one big window covering the
  // whole day, but we handle multiple windows defensively.
  const all = new Set<string>();
  for (const w of data.windows) {
    for (const r of w.favorableRasis) all.add(toEnglish(r));
  }
  if (all.size === 0) return null;
  const list = Array.from(all);
  return `Moon-transit favorable rasis for this person today: ${list.join(', ')}. Cross-reference with where the Moon currently sits — if today's Moon rasi is in this list, today is a favorable Moon-transit day for them.`;
}

/**
 * Fetch + summarise Chandra Bala for the user. Returns null on any error
 * (network, missing fields). Caller appends to prompt only when present —
 * the daily reading must work without this.
 */
export async function getChandraBalaPromptLine(
  birthData: BirthData,
  date: Date = new Date(),
): Promise<string | null> {
  try {
    const data = await getChandraBala(birthData, date);
    return chandraBalaPromptLine(data);
  } catch {
    return null;
  }
}
