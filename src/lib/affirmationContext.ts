/**
 * Deterministic "why this affirmation lands today" composer.
 *
 * The daily affirmation rotates by day-of-year — it's not personalised in
 * the strict sense. But the *day itself* has a specific shape we can
 * surface: the weekday's ruling planet, the nakshatra the Moon currently
 * occupies, whether the moon is waxing or waning, and the user's active
 * mahadasha period. Combining those into a short paragraph turns the
 * card from "here's a quote" into "here's how today wants you to hear it."
 *
 * No Claude call — every line composed from lookup tables. Free, fast,
 * stable across renders for the same date + chart.
 */

import { weekdayRuler, pakshaPlain } from './panchang';
import type { PanchangData } from '@services/prokerala';

// ─── Day-ruler themes ────────────────────────────────────────────────────────

const DAY_RULER_THEME: Record<string, string> = {
  Sun:     "vitality, recognition, and stepping into your own light",
  Moon:    "softness, intuition, and emotional honesty",
  Mars:    "courage, decisive action, and protecting what matters",
  Mercury: "clear thinking, communication, and tying loose ends",
  Jupiter: "expansion, generosity, and trusting the bigger picture",
  Venus:   "beauty, connection, and choosing what feels alive",
  Saturn:  "discipline, slow building, and honouring what's earned",
};

// ─── Nakshatra one-line themes (different angle from panchang.ts's
// NAKSHATRA_MEANING — those are character sketches, these are
// today-focused energy descriptors) ──────────────────────────────────────────

const NAKSHATRA_TODAY: Record<string, string> = {
  Ashwini:           "starting something fresh and moving fast",
  Bharani:           "carrying weight and transforming through it",
  Krittika:          "cutting through what's no longer needed",
  Rohini:            "growing what you've planted, savouring beauty",
  Mrigashira:        "exploring with curiosity, asking better questions",
  Mrigashirsha:      "exploring with curiosity, asking better questions",
  Ardra:             "letting emotions surface and clear",
  Punarvasu:         "returning to centre, second chances",
  Pushya:            "deep care, generous nourishment, reliable support",
  Ashlesha:          "magnetic intensity, hidden currents",
  Magha:             "ancestral power, dignity, leadership",
  'Purva Phalguni':  "pleasure, creativity, and the art of leisure",
  'Uttara Phalguni': "settled partnership, generous service",
  Hasta:             "skillful work with your own hands",
  Chitra:            "designing and creating what's beautifully made",
  Swati:             "independence, balance, and gentle strength",
  Vishakha:          "focused ambition, disciplined goals",
  Anuradha:          "loyalty, friendship, success through bonds",
  Jyeshtha:          "quiet authority, protecting what's elder and earned",
  Mula:              "digging to the root, unflinching truth",
  'Purva Ashadha':   "courage and conviction in early stages",
  'Uttara Ashadha':  "lasting victories, principled wins",
  Shravana:          "deep listening and learning by ear",
  Dhanishta:         "abundance, rhythm, and the music of success",
  Dhanishtha:        "abundance, rhythm, and the music of success",
  Shatabhisha:       "healing through solitude and secret knowledge",
  'Purva Bhadrapada':"intensity, sacrifice, fierce transformation",
  'Uttara Bhadrapada':"depth, restraint, and wise endings",
  Revati:            "gentleness, completion, and safe arrival",
};

// ─── Paksha (waxing/waning) flavour ──────────────────────────────────────────

const PAKSHA_FLAVOUR = {
  waxing: "The moon is growing, so the day favours building and adding.",
  waning: "The moon is releasing, so the day favours editing and letting go.",
};

// ─── Mahadasha themes ────────────────────────────────────────────────────────

const DASHA_THEME: Record<string, string> = {
  Sun:     "a chapter about identity, recognition, and stepping into authority",
  Moon:    "a chapter about emotional life, family, and what nourishes you",
  Mars:    "a chapter about action, drive, and what you're willing to fight for",
  Mercury: "a chapter about learning, communication, and clever work",
  Jupiter: "a chapter about expansion, teaching, and trusting the bigger arc",
  Venus:   "a chapter about love, beauty, and what makes life feel sweet",
  Saturn:  "a chapter about discipline, mastery, and what time is asking of you",
  Rahu:    "a chapter about ambition, the unconventional, and chasing what feels new",
  Ketu:    "a chapter about release, inner work, and unfinished karma settling",
};

// ─── Composition ─────────────────────────────────────────────────────────────

export interface AffirmationContext {
  /** Lead paragraph: weekday ruler + paksha + nakshatra. */
  whyToday: string;
  /** Optional: active mahadasha framing. Null if no chart yet. */
  currentChapter: string | null;
}

/**
 * Compose the "why this lands today" paragraphs. Falls back gracefully:
 * if panchang hasn't loaded, we can still produce a weekday-only line.
 */
export function buildAffirmationContext(
  panchang: PanchangData | null,
  activeDashaLord: string | undefined,
  nowMs: number,
): AffirmationContext {
  const parts: string[] = [];

  // 1. Day-of-week ruler line
  const vaara = panchang?.vaara
    ?? new Date(nowMs).toLocaleDateString('en-US', { weekday: 'long' });
  const ruler = weekdayRuler(vaara);
  if (ruler) {
    const theme = DAY_RULER_THEME[ruler];
    if (theme) parts.push(`${vaara} is ruled by ${ruler}, the planet of ${theme}.`);
  }

  // 2. Active nakshatra line — uses today's-focused theme, not the
  // character-sketch from panchang.ts. Look up the nakshatra that's
  // currently transiting (first entry in the array — the API returns
  // current first, then next).
  const inWindow = (s: string, e: string) => {
    const ss = new Date(s).getTime();
    const ee = new Date(e).getTime();
    return ss <= nowMs && nowMs < ee;
  };
  const activeNak = panchang?.nakshatra.find(n => inWindow(n.start, n.end))
    ?? panchang?.nakshatra[0];
  if (activeNak?.name) {
    const today = NAKSHATRA_TODAY[activeNak.name];
    if (today) parts.push(`The Moon is in ${activeNak.name}, an energy of ${today}.`);
  }

  // 3. Paksha (waxing/waning) line
  const activeTithi = panchang?.tithi.find(t => inWindow(t.start, t.end))
    ?? panchang?.tithi[0];
  const phase = activeTithi ? pakshaPlain(activeTithi.paksha) : null;
  if (phase) parts.push(PAKSHA_FLAVOUR[phase]);

  const whyToday = parts.length
    ? parts.join(' ')
    : "Each day in the Vedic almanac has a specific shape — today's affirmation is here to land on the version of you that shows up under that shape.";

  // 4. Active mahadasha line
  let currentChapter: string | null = null;
  if (activeDashaLord) {
    const theme = DASHA_THEME[activeDashaLord];
    if (theme) {
      currentChapter = `You're currently in your ${activeDashaLord} mahadasha — ${theme}. Today's affirmation lands inside that frame.`;
    }
  }

  return { whyToday, currentChapter };
}
