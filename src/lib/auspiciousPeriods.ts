/**
 * Today's auspicious / inauspicious time windows in plain English.
 *
 * Prokerala returns Sanskrit muhurat names (Abhijit Muhurat, Rahu, etc.).
 * This module maps each to a short English label + a "what it's for" line
 * so the home-screen card reads naturally without forcing users to learn
 * Sanskrit. The original name is kept as a subtitle for users who want it.
 */

import { useEffect, useState } from 'react';
import { getAuspiciousPeriods, type AuspiciousPeriodsData } from '@services/prokerala';
import { formatLocalTime } from './panchang';
import type { BirthData } from '@store/userStore';

export interface MuhuratDetail {
  /** Plain-English headline shown on the card. */
  shortLabel: string;
  /** One-line "what is this window for / why avoid." */
  meaning: string;
  /** Sanskrit name as a subtitle, in parens style. */
  sanskrit: string;
}

// Keyed on the lowercased name (Prokerala's `name` field). Their casing is
// stable, but lowercasing protects against drift. Labels are written in
// "what is this for?" form — every shortLabel tells the user what to *do*
// (or not do) during the window. The Sanskrit name is kept separately for
// the modal subtitle.
const DETAILS: Record<string, MuhuratDetail> = {
  // ─── Auspicious ─────────────────────────────────────────────────────────
  'abhijit muhurat': {
    shortLabel: 'Best for big decisions',
    meaning: 'The 48-minute window around solar noon. Classically the safest time of the day to start anything important — sign documents, make commitments, launch projects.',
    sanskrit: 'Abhijit Muhurat',
  },
  'amrit kaal': {
    shortLabel: 'Best for fresh starts',
    meaning: 'A window of unusually clean energy — favorable for new beginnings, prayer, setting intentions, or hitting reset on something stuck.',
    sanskrit: 'Amrit Kaal',
  },
  'brahma muhurat': {
    shortLabel: 'Best for meditation',
    meaning: 'The pre-dawn stillness window. Best of the day for inner work — meditation, reflection, journaling, deep focus.',
    sanskrit: 'Brahma Muhurat',
  },
  // ─── Inauspicious ───────────────────────────────────────────────────────
  'rahu': {
    shortLabel: 'Avoid new commitments',
    meaning: 'Classical "avoid" window. Skip new commitments, signing, launching, asking for favours, or interviewing. Routine work is fine.',
    sanskrit: 'Rahu Kalam',
  },
  'rahu kalam': {
    shortLabel: 'Avoid new commitments',
    meaning: 'Classical "avoid" window. Skip new commitments, signing, launching, asking for favours, or interviewing. Routine work is fine.',
    sanskrit: 'Rahu Kalam',
  },
  'yamaganda': {
    shortLabel: 'Avoid travel & launches',
    meaning: 'Classically inauspicious for travel, new ventures, or important first meetings. Routine work and existing tasks are fine.',
    sanskrit: 'Yamaganda Kalam',
  },
  'yamaganda kalam': {
    shortLabel: 'Avoid travel & launches',
    meaning: 'Classically inauspicious for travel, new ventures, or important first meetings. Routine work and existing tasks are fine.',
    sanskrit: 'Yamaganda Kalam',
  },
  'gulika': {
    shortLabel: 'Avoid major decisions',
    meaning: 'Heavy, slow window classically tied to delays and obstacles. Avoid major decisions and big commitments — push them to a clearer time.',
    sanskrit: 'Gulika Kalam',
  },
  'gulika kalam': {
    shortLabel: 'Avoid major decisions',
    meaning: 'Heavy, slow window classically tied to delays and obstacles. Avoid major decisions and big commitments — push them to a clearer time.',
    sanskrit: 'Gulika Kalam',
  },
  'dur muhurat': {
    shortLabel: 'Avoid sensitive talks',
    meaning: 'Short windows of friction in the day. If you can, push delicate conversations or sensitive negotiations to another time.',
    sanskrit: 'Dur Muhurat',
  },
  'varjyam': {
    shortLabel: 'Best for rest, not action',
    meaning: 'Classical avoid-period. Use it for rest, light tasks, or quiet time — not for important action.',
    sanskrit: 'Varjyam',
  },
};

export function muhuratDetail(name: string): MuhuratDetail {
  const key = name.toLowerCase().trim();
  // Fallback for muhurat names we haven't authored a translation for yet.
  // Prokerala may add new ones over time — surface the raw name as the
  // headline (already-titled like "Abhijit Muhurat") with a generic
  // meaning so the modal never shows an empty paragraph.
  return DETAILS[key] ?? {
    shortLabel: name,
    meaning: 'A classical Vedic timing window. Treat as guidance for the rhythm of the day.',
    sanskrit: name,
  };
}

/**
 * Format a single muhurat's window(s) as a human-readable time string.
 * For most muhurats this is "4:03 - 4:51 AM"; for Dur Muhurat it can be
 * "10:04 - 10:57 AM, 3:22 - 4:16 PM" (multiple sub-windows).
 */
export function formatWindows(windows: { start: string; end: string }[]): string {
  return windows
    .map(w => `${formatLocalTime(w.start)} – ${formatLocalTime(w.end)}`)
    .join(', ');
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches today's auspicious + inauspicious windows for the user's
 * coordinates. Returns null while loading or on error so callers can
 * render-or-skip without extra state. Re-fetches on calendar-day change.
 */
export function useAuspiciousPeriods(
  birthData: BirthData | null | undefined,
  nowTick: number,
): AuspiciousPeriodsData | null {
  const [data, setData] = useState<AuspiciousPeriodsData | null>(null);
  const isoDate = new Date(nowTick).toISOString().split('T')[0];

  useEffect(() => {
    if (!birthData) return;
    let cancelled = false;
    getAuspiciousPeriods(birthData, new Date(nowTick))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData?.latitude, birthData?.longitude, birthData?.timezone, isoDate]);

  return data;
}
