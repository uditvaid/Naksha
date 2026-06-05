/**
 * Daily reading composition layer.
 *
 * Surfaces deterministic context around the Claude-generated prose:
 *   • signal chips (provenance receipts shown above the prose)
 *   • provenance footer (one-line origin sentence)
 *   • tomorrow's flavor peek (retention hook)
 *   • journal prompts (two questions derived from dominant signals)
 *   • theme tag (one-word badge for the archive list)
 *
 * Everything composed here is free — no API calls. The Claude prose
 * remains the synthesis layer; this module ensures the user can see
 * *why* the prose lands the way it does.
 */

import type { ChartData } from '@store/userStore';
import { computeDailySignals, computeLunarPhase, type DailySignal, type DailySignalSet, type LunarPhase } from './signals';
import { findActiveDasha } from '@utils/vedic';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SignalChip {
  /** Short label, ~2-4 words. Renders as a pill. */
  label: string;
  /** 0-1, used to rank and to highlight the dominant chip. */
  significance: number;
  /** Marks "new today" — fresh antardasha, new/full moon. */
  isNew: boolean;
}

export interface ReadingComposition {
  chips: SignalChip[];
  /** "Drawn from your Rohini Moon, Venus mahadasha, and Tuesday's Mars energy." */
  provenance: string;
  /** One-line peek at tomorrow's quality. */
  tomorrowPeek: string;
  /** Two reflection prompts derived from dominant signals. */
  journalPrompts: string[];
  /** Short tag for the archive list — falls back to dasha if no signal stands out. */
  themeTag: string;
  /** Underlying signal set, in case the caller wants raw access. */
  signals: DailySignalSet;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY_PLANETS: Record<number, string> = {
  0: 'Sun', 1: 'Moon', 2: 'Mars', 3: 'Mercury',
  4: 'Jupiter', 5: 'Venus', 6: 'Saturn',
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Signal Chips ──────────────────────────────────────────────────────────────

/**
 * Compress a DailySignal into a chip label. The signal titles in signals.ts
 * are sentence-shaped ("Moon in Rohini · waxing crescent"); chip labels need
 * to be 2-4 words so they fit in a horizontal row on a phone.
 */
function chipLabelFor(signal: DailySignal): string {
  switch (signal.type) {
    case 'dasha': {
      // "Venus Mahadasha / Mars Antardasha" → "Venus → Mars"
      const match = signal.title.match(/^(\w+) Mahadasha(?: \/ (\w+) Antardasha)?/);
      if (match) {
        const [, maha, antar] = match;
        return antar ? `${maha} → ${antar}` : `${maha} period`;
      }
      return signal.title;
    }
    case 'lunar': {
      // "Moon in Rohini · waxing_crescent" → "Moon in Rohini"
      const parts = signal.title.split('·').map(s => s.trim());
      return parts[0] ?? signal.title;
    }
    case 'panchang': {
      // "Tuesday — Mars's day" → "Mars day"
      const match = signal.title.match(/—\s*(\w+)/);
      return match?.[1] ? `${match[1]} day` : signal.title;
    }
    case 'upcoming': {
      // "Shift approaching in 5 days" → "Shift in 5 days"
      return signal.title.replace('approaching ', '');
    }
    default:
      return signal.title;
  }
}

function buildChips(signals: DailySignal[]): SignalChip[] {
  // Always include the dasha + lunar chip (the user's two most personal anchors).
  // Add an upcoming chip if one exists. Cap at 3.
  const dasha = signals.find(s => s.type === 'dasha');
  const lunar = signals.find(s => s.type === 'lunar');
  const upcoming = signals.find(s => s.type === 'upcoming');
  const weekday = signals.find(s => s.type === 'panchang');

  const ordered: DailySignal[] = [];
  if (dasha) ordered.push(dasha);
  if (lunar) ordered.push(lunar);
  // Prefer "upcoming" over weekday when significance is meaningful.
  if (upcoming && upcoming.significance >= 0.5) ordered.push(upcoming);
  else if (weekday && ordered.length < 3) ordered.push(weekday);

  return ordered.slice(0, 3).map(s => ({
    label: chipLabelFor(s),
    significance: s.significance,
    isNew: s.isNew,
  }));
}

// ─── Provenance Footer ─────────────────────────────────────────────────────────

function buildProvenance(chart: ChartData | null, date: Date): string {
  if (!chart) return '';
  const moon = chart.planets.find(p => p.planet === 'Moon');
  const activeDasha = findActiveDasha(chart.dashas, date);
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const dayPlanet = WEEKDAY_PLANETS[date.getDay()];

  const parts: string[] = [];
  if (moon?.nakshatra) parts.push(`your ${moon.nakshatra} Moon`);
  if (activeDasha?.planet) parts.push(`${activeDasha.planet} mahadasha`);
  if (weekday && dayPlanet) parts.push(`${weekday}'s ${dayPlanet} energy`);

  if (parts.length === 0) return '';
  if (parts.length === 1) return `Drawn from ${parts[0]}.`;
  if (parts.length === 2) return `Drawn from ${parts[0]} and ${parts[1]}.`;
  return `Drawn from ${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
}

// ─── Tomorrow's Flavor Peek ────────────────────────────────────────────────────

const TOMORROW_WEEKDAY_FLAVOR: Record<string, string> = {
  Sun: "Tomorrow leans into Sun's quality — visibility, clarity, and the seat of identity.",
  Moon: "Tomorrow leans into Moon's quality — receptivity, softness, and emotional honesty.",
  Mars: "Tomorrow leans into Mars's quality — directness, decision, and protecting what matters.",
  Mercury: "Tomorrow leans into Mercury's quality — clear thought, sharp speech, and tying loose ends.",
  Jupiter: "Tomorrow leans into Jupiter's quality — expansion, generosity, and trusting the bigger arc.",
  Venus: "Tomorrow leans into Venus's quality — beauty, connection, and what makes life feel sweet.",
  Saturn: "Tomorrow leans into Saturn's quality — discipline, patience, and what is being built to last.",
};

const TOMORROW_LUNAR_FLAVOR: Partial<Record<LunarPhase, string>> = {
  new_moon: "Tomorrow is the new moon — a natural reset and a clean page to seed something on.",
  full_moon: "Tomorrow brings the full moon — a peak of emotional and creative illumination.",
  first_quarter: "Tomorrow carries first-quarter momentum — the moment to push through early resistance.",
  last_quarter: "Tomorrow carries last-quarter energy — release and clearing what no longer serves.",
};

function buildTomorrowPeek(chart: ChartData | null, today: Date): string {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Prefer dasha shift (highest user-relevance).
  if (chart) {
    const signals = computeDailySignals(chart, tomorrow).signals;
    const upcoming = signals.find(s => s.type === 'upcoming' && s.isNew);
    if (upcoming) return `Tomorrow: ${upcoming.title.toLowerCase()} — a shift in emphasis is near.`;

    const dasha = signals.find(s => s.type === 'dasha');
    if (dasha?.isNew) {
      return `Tomorrow a new sub-period takes hold — ${dasha.title.toLowerCase()}.`;
    }
  }

  // 2. Major lunar event tomorrow.
  const phase = computeLunarPhase(tomorrow);
  const lunarLine = TOMORROW_LUNAR_FLAVOR[phase];
  if (lunarLine) return lunarLine;

  // 3. Fall back to weekday ruler.
  const dayPlanet = WEEKDAY_PLANETS[tomorrow.getDay()];
  if (dayPlanet) return TOMORROW_WEEKDAY_FLAVOR[dayPlanet] ?? '';
  return '';
}

// ─── Journal Prompts ───────────────────────────────────────────────────────────

const DASHA_PROMPTS: Record<string, string> = {
  Sun: 'Where in your life are you being asked to be more visible?',
  Moon: 'What feeling have you been moving past too quickly?',
  Mars: 'What needs decisive action that you keep postponing?',
  Mercury: 'What conversation or message have you been avoiding?',
  Jupiter: 'What in your life is genuinely worth growing toward right now?',
  Venus: 'What is asking to be loved more openly — including by you?',
  Saturn: 'What are you building that requires patience you haven\'t fully given?',
  Rahu: 'What unconventional path keeps tugging at you?',
  Ketu: 'What attachment is quietly ready to be released?',
};

const LUNAR_PROMPTS: Record<LunarPhase, string> = {
  new_moon: 'If today were a blank page, what would you choose to seed?',
  waxing_crescent: 'What small momentum can you protect over the next few days?',
  first_quarter: 'Where is resistance showing up, and what is it asking of you?',
  waxing_gibbous: 'What is almost ready — and what does it still need from you?',
  full_moon: 'What is being illuminated in you right now that you usually keep dim?',
  waning_gibbous: 'What completion are you yet to fully acknowledge?',
  last_quarter: 'What is ready to be released so the next cycle can land cleanly?',
  waning_crescent: 'What needs rest, not effort, this week?',
};

function buildJournalPrompts(chart: ChartData | null, date: Date): string[] {
  const prompts: string[] = [];
  const activeDasha = findActiveDasha(chart?.dashas, date);
  if (activeDasha?.planet && DASHA_PROMPTS[activeDasha.planet]) {
    prompts.push(DASHA_PROMPTS[activeDasha.planet]!);
  }
  const phase = computeLunarPhase(date);
  prompts.push(LUNAR_PROMPTS[phase]);
  return prompts.slice(0, 2);
}

// ─── Theme Tag ─────────────────────────────────────────────────────────────────

function buildThemeTag(signals: DailySignalSet): string {
  // Find the highest-significance non-weekday signal.
  const sorted = signals.signals
    .filter(s => s.type !== 'panchang')
    .sort((a, b) => b.significance - a.significance);
  const top = sorted[0];

  if (signals.isQuietDay) return 'Quiet day';

  if (top?.type === 'upcoming') return 'Shift incoming';

  // Lunar peaks dominate when present.
  if (signals.lunarPhase === 'new_moon') return 'New moon';
  if (signals.lunarPhase === 'full_moon') return 'Full moon';

  if (top?.type === 'dasha' && top.isNew) return 'Sub-period shift';

  // Fall back to current chapter framing.
  if (signals.mahadasha && signals.mahadasha !== 'Unknown') {
    return `${signals.mahadasha} chapter`;
  }
  return 'Daily reading';
}

// ─── Main composer ─────────────────────────────────────────────────────────────

export function composeReadingContext(
  chart: ChartData | null,
  date: Date = new Date(),
): ReadingComposition {
  // Compute a minimal signal set even without a chart so the home preview
  // still has a tomorrow peek and journal prompts to render.
  const signals: DailySignalSet = chart
    ? computeDailySignals(chart, date)
    : {
        date: date.toISOString().split('T')[0]!,
        signals: [],
        overallSignificance: 0.2,
        isQuietDay: true,
        mahadasha: 'Unknown',
        antardasha: null,
        moonSign: 'Unknown',
        moonNakshatra: 'Unknown',
        lunarPhase: computeLunarPhase(date),
      };

  return {
    chips: buildChips(signals.signals),
    provenance: buildProvenance(chart, date),
    tomorrowPeek: buildTomorrowPeek(chart, date),
    journalPrompts: buildJournalPrompts(chart, date),
    themeTag: buildThemeTag(signals),
    signals,
  };
}

// ─── Life-Area Parsing ─────────────────────────────────────────────────────────
//
// The Claude prompt is extended to append a structured block at the end of
// the prose, in the format:
//
//   ---LIFE AREAS---
//   WORK: <one sentence>
//   LOVE: <one sentence>
//   HEALTH: <one sentence>
//   INNER: <one sentence>
//
// We parse it out, return the cleaned prose + the four lines. If the block
// is missing or malformed (older cached readings, model drift), lifeAreas
// is null and the UI hides that section gracefully.

export interface LifeAreas {
  work: string;
  love: string;
  health: string;
  inner: string;
}

export interface ParsedReading {
  prose: string;
  lifeAreas: LifeAreas | null;
}

const LIFE_AREA_MARKER = /---\s*LIFE AREAS\s*---/i;

export function parseReadingResponse(raw: string): ParsedReading {
  const markerMatch = raw.match(LIFE_AREA_MARKER);
  if (!markerMatch || markerMatch.index === undefined) {
    return { prose: raw.trim(), lifeAreas: null };
  }
  const prose = raw.slice(0, markerMatch.index).trim();
  const block = raw.slice(markerMatch.index + markerMatch[0].length);

  // Capture the value as everything from the colon up to (a) the next
  // ALL-CAPS label on a new line, or (b) end of string. Lets Claude
  // wrap a sentence across two lines without losing the tail — the
  // earlier `[^\n]+` version silently truncated at the first newline.
  const LABEL_AHEAD = String.raw`(?=\n\s*(?:WORK|LOVE|HEALTH|INNER)\s*:|$)`;
  const grab = (label: string) => {
    const re = new RegExp(`${label}\\s*:\\s*([\\s\\S]+?)${LABEL_AHEAD}`, 'i');
    const m = block.match(re);
    return m?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
  };

  const work = grab('WORK');
  const love = grab('LOVE');
  const health = grab('HEALTH');
  const inner = grab('INNER');

  // Require at least three of the four to be present — otherwise treat as
  // a malformed response and fall back to prose-only rendering.
  const present = [work, love, health, inner].filter(Boolean).length;
  if (present < 3) return { prose, lifeAreas: null };

  return { prose, lifeAreas: { work, love, health, inner } };
}
