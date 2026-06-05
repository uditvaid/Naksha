/**
 * Push notification voice library.
 *
 * The 8am push used to ship with a fixed branded title ("Your Daily Cosmic
 * Insight") and a body that was just the affirmation plus three focus
 * lines. That works once. It does not survive a week of daily delivery —
 * users tune out the predictable wrapper and stop opening.
 *
 * This module composes the push body with one of five rotating voices,
 * keyed on the calendar day. Each voice references the actual signals
 * we've already computed (active dasha, lunar phase, weekday ruler) so
 * the push has a specific reason to exist that day — not a generic
 * "your daily reminder."
 *
 * The five voices are intentionally distinct in tone so the user can't
 * predict which they'll get tomorrow: Co-Star-style observational,
 * mystic, practical, warm-friend, and reflective-question. Rotation is
 * by day-of-year so the same voice never lands two days in a row.
 */

import type { ChartData } from '@store/userStore';
import { computeDailySignals, computeLunarPhase, type LunarPhase } from './signals';
import { findActiveDasha } from '@utils/vedic';
import { todaysAffirmation, todaysFocus } from '@lib/dailyAffirmation';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
}

export type PushVoice =
  | 'observational'
  | 'mystic'
  | 'practical'
  | 'warm'
  | 'reflective';

// ─── Lookup tables ─────────────────────────────────────────────────────────────

const WEEKDAY_PLANET: Record<number, string> = {
  0: 'Sun', 1: 'Moon', 2: 'Mars', 3: 'Mercury',
  4: 'Jupiter', 5: 'Venus', 6: 'Saturn',
};

/** Short, lowercase phase label suitable for prose. */
const PHASE_PROSE: Record<LunarPhase, string> = {
  new_moon: 'new moon',
  waxing_crescent: 'waxing crescent',
  first_quarter: 'first quarter',
  waxing_gibbous: 'waxing gibbous',
  full_moon: 'full moon',
  waning_gibbous: 'waning gibbous',
  last_quarter: 'last quarter',
  waning_crescent: 'waning crescent',
};

/** Title-cased version for short standalone use as a title fragment. */
const PHASE_TITLE: Record<LunarPhase, string> = {
  new_moon: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full_moon: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
};

const PLANET_VERB: Record<string, string> = {
  Sun: 'wants you visible',
  Moon: 'wants softness from you',
  Mars: 'asks for one decisive move',
  Mercury: 'wants the sharper message',
  Jupiter: 'asks who you are growing toward',
  Venus: 'wants you to choose beauty',
  Saturn: 'wants you to do the slow work',
};

const PLANET_THEME: Record<string, string> = {
  Sun: 'identity and visibility',
  Moon: 'feeling and care',
  Mars: 'direct action',
  Mercury: 'clear thought',
  Jupiter: 'expansion and meaning',
  Venus: 'beauty and connection',
  Saturn: 'discipline and patience',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function lowerFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function stripTrailingPunct(s: string): string {
  return s.replace(/[.!?]+$/, '');
}

const VOICE_ORDER: PushVoice[] = ['observational', 'mystic', 'practical', 'warm', 'reflective'];

/**
 * Pick today's push voice. Pure function of the date — same date returns
 * the same voice, so a push that's already been queued and the home
 * screen agree on the framing.
 *
 * Note: rotation also folds in the year so the Dec 31 → Jan 1 boundary
 * does not silently repeat the same voice across the year-flip in leap
 * years. (Day-of-year 366 % 5 = 1, day 1 % 5 = 1 would otherwise both
 * produce 'mystic'; XOR-ing the year breaks the collision.)
 */
export function pickPushVoice(date: Date): PushVoice {
  const idx = (dayOfYear(date) + date.getFullYear()) % VOICE_ORDER.length;
  return VOICE_ORDER[idx]!;
}

// ─── Voice composers ───────────────────────────────────────────────────────────

interface ComposerContext {
  date: Date;
  chart: ChartData | null;
  dashaLord: string | undefined;
  firstName: string | undefined;
  affirmation: string;
  focus: [string, string, string];
  phase: LunarPhase;
  dayPlanet: string;
  moonNakshatra: string | null;
}

function composeObservational(ctx: ComposerContext): PushPayload {
  // Co-Star-style: two short fragment-sentences, no explanation. The
  // voice notices something cosmic and trusts the user to make meaning.
  const phase = PHASE_TITLE[ctx.phase];
  const planet = ctx.dayPlanet;
  return {
    title: `${phase}. ${planet}'s day.`,
    body: `${ctx.affirmation}`,
  };
}

function composeMystic(ctx: ComposerContext): PushPayload {
  // Cosmic-poetic. Names the nakshatra when we have it, otherwise leans
  // on the phase. Body is the affirmation — already lyrical by design.
  const title = ctx.moonNakshatra
    ? `The Moon is in ${ctx.moonNakshatra}.`
    : `${PHASE_TITLE[ctx.phase]} tonight.`;
  return {
    title,
    body: ctx.affirmation,
  };
}

function composePractical(ctx: ComposerContext): PushPayload {
  // Direct and short. The title states what the day is for; the body is
  // a single concrete focus item. No prose padding.
  const verb = PLANET_VERB[ctx.dayPlanet] ?? `wants something specific`;
  return {
    title: `${ctx.dayPlanet} ${verb}.`,
    body: `${stripTrailingPunct(ctx.focus[0])}.`,
  };
}

function composeWarm(ctx: ComposerContext): PushPayload {
  // Friendly, conversational. Uses the first name if we have it, falls
  // back to a generic open. Body weaves affirmation + one focus item.
  const greet = ctx.firstName ? `Hey ${ctx.firstName} —` : 'Hey —';
  const focusLine = lowerFirst(stripTrailingPunct(ctx.focus[0]));
  return {
    title: `${greet} a thought for today.`,
    body: `${ctx.affirmation}\n\nIf you remember nothing else: ${focusLine}.`,
  };
}

function composeReflective(ctx: ComposerContext): PushPayload {
  // Question-based. Title is the question; body answers with the focus
  // line so the user gets a frame, not just an open loop.
  const theme = ctx.dashaLord ? PLANET_THEME[ctx.dashaLord] : undefined;
  const title = theme
    ? `What is today asking about ${theme}?`
    : `What is today asking of you?`;
  return {
    title,
    body: `${stripTrailingPunct(ctx.focus[0])}.`,
  };
}

const COMPOSERS: Record<PushVoice, (ctx: ComposerContext) => PushPayload> = {
  observational: composeObservational,
  mystic: composeMystic,
  practical: composePractical,
  warm: composeWarm,
  reflective: composeReflective,
};

// ─── Main entrypoint ───────────────────────────────────────────────────────────

/**
 * Compose a notification payload for the given date. Pure function — same
 * inputs return the same payload, so callers can pre-schedule a week of
 * pushes without worrying about clock drift between schedule and fire.
 */
/** Max characters of firstName we'll inject into a push title. iOS lock-
 * screen titles are tight (~30-40 chars), and a long firstName combined
 * with the rest of the title can render oddly or truncate mid-word. */
const FIRST_NAME_MAX = 20;

export function buildPushPayload(
  date: Date,
  chart: ChartData | null,
  dashaLord: string | undefined,
  firstName?: string,
): PushPayload {
  const phase = computeLunarPhase(date);
  const dayPlanet = WEEKDAY_PLANET[date.getDay()] ?? 'Sun';
  const affirmation = todaysAffirmation(date);
  // Defensively trim firstName to a sane length and drop trailing spaces.
  const trimmedFirstName = firstName?.trim().slice(0, FIRST_NAME_MAX) || undefined;

  // Re-derive dasha at the target date in case the user is days away
  // from a mahadasha shift — the push that fires after the shift should
  // reflect the new lord, not the lord we knew at schedule time. We
  // compute this BEFORE picking the focus pool so the focus content,
  // the title's dasha theme, and any other dasha-keyed copy all agree
  // on the same lord. Earlier this was inconsistent: focus came from
  // the schedule-time lord while the title used the at-date lord.
  const activeDashaAtDate = chart ? findActiveDasha(chart.dashas, date)?.planet : undefined;
  const effectiveDasha = activeDashaAtDate ?? dashaLord;
  const focus = todaysFocus(effectiveDasha, date);

  // If we have a chart, prefer the chart's natal Moon nakshatra (a stable,
  // personal anchor). If we don't, leave it null and the mystic voice
  // falls back to the phase-only title.
  let moonNakshatra: string | null = null;
  if (chart) {
    const moon = chart.planets.find(p => p.planet === 'Moon');
    moonNakshatra = moon?.nakshatra ?? null;
  }

  const ctx: ComposerContext = {
    date, chart, dashaLord: effectiveDasha, firstName: trimmedFirstName,
    affirmation, focus, phase, dayPlanet, moonNakshatra,
  };

  const voice = pickPushVoice(date);
  return COMPOSERS[voice](ctx);
}

// Re-export for tests / debug surfaces. The signals computation isn't
// used inside this module right now but exposing it lets a future voice
// (e.g. "antardasha shifting tomorrow") reach for it without rewiring.
export { computeDailySignals };
