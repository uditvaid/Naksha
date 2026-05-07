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
// stable, but lowercasing protects against drift.
const DETAILS: Record<string, MuhuratDetail> = {
  // ─── Auspicious ─────────────────────────────────────────────────────────
  'abhijit muhurat': {
    shortLabel: 'Most reliable window',
    meaning: 'The 48-minute window around solar noon. Classically the safest time to start anything important.',
    sanskrit: 'Abhijit Muhurat',
  },
  'amrit kaal': {
    shortLabel: 'Nectar hour',
    meaning: "A window of unusually clean energy — favorable for new beginnings, prayer, or reset.",
    sanskrit: 'Amrit Kaal',
  },
  'brahma muhurat': {
    shortLabel: 'Pre-dawn clarity',
    meaning: 'The pre-dawn window. Best for inner work — meditation, reflection, deep focus.',
    sanskrit: 'Brahma Muhurat',
  },
  // ─── Inauspicious ───────────────────────────────────────────────────────
  'rahu': {
    shortLabel: 'Rahu Kalam',
    meaning: 'Classical "avoid" window. Skip new commitments, signing, launching, or asking for things.',
    sanskrit: 'Rahu Kalam',
  },
  'rahu kalam': {
    shortLabel: 'Rahu Kalam',
    meaning: 'Classical "avoid" window. Skip new commitments, signing, launching, or asking for things.',
    sanskrit: 'Rahu Kalam',
  },
  'yamaganda': {
    shortLabel: 'Yamaganda',
    meaning: "Avoid travel and new ventures during this window. Routine work is fine.",
    sanskrit: 'Yamaganda Kalam',
  },
  'yamaganda kalam': {
    shortLabel: 'Yamaganda',
    meaning: "Avoid travel and new ventures during this window. Routine work is fine.",
    sanskrit: 'Yamaganda Kalam',
  },
  'gulika': {
    shortLabel: 'Gulika Kalam',
    meaning: "Avoid major decisions and big commitments. The window is heavy and slow.",
    sanskrit: 'Gulika Kalam',
  },
  'gulika kalam': {
    shortLabel: 'Gulika Kalam',
    meaning: "Avoid major decisions and big commitments. The window is heavy and slow.",
    sanskrit: 'Gulika Kalam',
  },
  'dur muhurat': {
    shortLabel: 'Tense window',
    meaning: 'Short windows of friction in the day — handle delicate conversations later if you can.',
    sanskrit: 'Dur Muhurat',
  },
  'varjyam': {
    shortLabel: 'Skip-it window',
    meaning: 'Classical avoid-period. Best for rest, not for action.',
    sanskrit: 'Varjyam',
  },
};

export function muhuratDetail(name: string): MuhuratDetail {
  const key = name.toLowerCase().trim();
  return DETAILS[key] ?? {
    shortLabel: name,
    meaning: '',
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
