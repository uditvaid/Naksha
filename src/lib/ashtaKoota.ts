/**
 * Ashta-koota (8-area Vedic compatibility) plain-English framing.
 *
 * Prokerala's `/kundli-matching/advanced` endpoint returns 8 koota areas with
 * Sanskrit names (Varna Koot, Vasya Koot, etc.) and classical-style
 * descriptions. We translate the names to plain English and pair each with
 * a one-line "what it measures" subtitle, while keeping the Sanskrit name
 * accessible for users who want it.
 *
 * Render rule: every match shows totalPoints / maximumPoints — no "no
 * score available" fallback (we have an authoritative API now). The card
 * is silent only when the API call fails entirely (network down etc.).
 */

import { useEffect, useState } from 'react';
import { getAshtaKoota, type AshtaKootaData } from '@services/prokerala';
import type { BirthData } from '@store/userStore';

// ─── Per-koota plain-English headings + subtitles ────────────────────────────

export interface KootaTranslation {
  /** Plain-English heading shown in the modal. */
  plainName: string;
  /** Sanskrit name kept as a subtitle so users learning the tradition can
   *  cross-reference. Lowercase parens style mirrors panchang.ts. */
  sanskritName: string;
  /** One-line "what does this koota measure" — written for someone who has
   *  never heard of it. Avoids Sanskrit-explaining-Sanskrit. */
  measures: string;
}

// Keyed on the Prokerala `id` (1-8) — robust across capitalisation drift in
// their `name` field. Order is the classical Varna→Nadi.
const KOOTA_TRANSLATIONS: Record<number, KootaTranslation> = {
  1: {
    plainName: 'Spiritual Temperament',
    sanskritName: 'Varna Koot',
    measures: 'How aligned your underlying spiritual or ego development is.',
  },
  2: {
    plainName: 'Mutual Influence',
    sanskritName: 'Vasya Koot',
    measures: 'How easily one of you can sway or settle the other.',
  },
  3: {
    plainName: 'Luck & Timing',
    sanskritName: 'Tara Koot',
    measures: "How your birth-stars support each other's timing and luck.",
  },
  4: {
    plainName: 'Physical & Instinctive Bond',
    sanskritName: 'Yoni Koot',
    measures: 'How well your instinctive, physical natures fit together.',
  },
  5: {
    plainName: 'Mental Compatibility',
    sanskritName: 'Graha Maitri',
    measures: 'How aligned your mental and psychological dispositions are.',
  },
  6: {
    plainName: 'Behavioral Temperament',
    sanskritName: 'Gana Koot',
    measures: "How well your everyday temperaments and energies match.",
  },
  7: {
    plainName: 'Family & Life Direction',
    sanskritName: 'Bhakoot Koot',
    measures: 'How smoothly the longer arcs of your life and family fit.',
  },
  8: {
    plainName: 'Health & Progeny',
    sanskritName: 'Nadi Koot',
    measures: "How your constitutions and lineages combine — health, children.",
  },
};

const FALLBACK: KootaTranslation = {
  plainName: 'Compatibility area',
  sanskritName: '',
  measures: '',
};

export function kootaTranslation(id: number): KootaTranslation {
  return KOOTA_TRANSLATIONS[id] ?? FALLBACK;
}

// ─── Score-band interpretation ───────────────────────────────────────────────

export interface ScoreBand {
  /** Card label below the number. */
  label: string;
  /** Theme key — caller resolves to actual colour. */
  tone: 'excellent' | 'compatible' | 'challenging';
}

export function scoreBand(total: number, max: number): ScoreBand {
  // Classical thresholds: <18 inauspicious, 18-24 average, 25-32 good,
  // 32+ excellent. We collapse to 3 bands for UI clarity:
  //   28+   excellent
  //   18-27 compatible
  //   <18   challenging
  const pctOf36 = max > 0 ? (total / max) * 36 : 0;
  if (pctOf36 >= 28) return { label: 'Excellent match', tone: 'excellent' };
  if (pctOf36 >= 18) return { label: 'Compatible', tone: 'compatible' };
  return { label: 'Challenging match', tone: 'challenging' };
}

/**
 * Classify each koota by how it scored. Used to colour the per-area badge
 * and to summarise "X strong matches, Y challenges" on the card.
 */
export type KootaQuality = 'excellent' | 'partial' | 'weak';

export function kootaQuality(obtained: number, max: number): KootaQuality {
  if (max === 0) return 'partial';
  const ratio = obtained / max;
  if (ratio >= 0.99) return 'excellent';
  if (ratio >= 0.5) return 'partial';
  return 'weak';
}

export function summarise(areas: { obtainedPoints: number; maximumPoints: number }[]): { strong: number; partial: number; weak: number } {
  const out = { strong: 0, partial: 0, weak: 0 };
  for (const a of areas) {
    const q = kootaQuality(a.obtainedPoints, a.maximumPoints);
    if (q === 'excellent') out.strong += 1;
    else if (q === 'partial') out.partial += 1;
    else out.weak += 1;
  }
  return out;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches Ashta-koota for a partner pair. Returns null while loading or
 * on error so callers render-or-skip without extra state. Cache lives in
 * the service so re-mounts are free.
 */
export function useAshtaKoota(
  me: BirthData | null | undefined,
  partner: BirthData | null | undefined,
): AshtaKootaData | null {
  const [data, setData] = useState<AshtaKootaData | null>(null);

  useEffect(() => {
    if (!me || !partner) return;
    let cancelled = false;
    // Note: Prokerala expects girl/boy params; we pass the user as `girl`
    // and partner as `boy` regardless of actual gender. Classical Ashta-koota
    // rules are direction-sensitive, but the score is symmetric in practice
    // for the kootas that matter for everyday compatibility.
    getAshtaKoota(me, partner)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent — caller renders nothing */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    me?.dateOfBirth, me?.timeOfBirth, me?.latitude, me?.longitude,
    partner?.dateOfBirth, partner?.timeOfBirth, partner?.latitude, partner?.longitude,
  ]);

  return data;
}
