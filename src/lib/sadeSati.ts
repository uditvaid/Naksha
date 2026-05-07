/**
 * Saturn's challenging transit periods, plain-English framing.
 *
 * Prokerala's `sade-sati` endpoint reports more than just classical Sade
 * Sati — it also flags Ashtama Sani (Saturn 8th from Moon) and Kantaka
 * Sani (Saturn at quarter-points). All three are recognised challenging
 * Saturn transits in classical Vedic astrology, so we surface them under
 * a single user-facing concept ("Saturn's testing period") and translate
 * the specific phase to plain English.
 *
 * The card on the Dashas tab renders ONLY when isInTransit=true. When the
 * user isn't in any of these transits, nothing appears — no "you're free"
 * placeholder, no toggle, no clutter.
 */

import { useEffect, useState } from 'react';
import { getSadeSati, type SadeSatiData } from '@services/prokerala';
import type { BirthData } from '@store/userStore';

// ─── Phase translations ──────────────────────────────────────────────────────

export interface PhaseDetail {
  /** Card title, e.g. "Saturn's 8th-house transit". No Sanskrit naked. */
  shortLabel: string;
  /** One-line summary shown on the card body, written in plain English. */
  cardBlurb: string;
  /** Modal subtitle, plain English. */
  modalSubtitle: string;
  /** The "what this is" paragraph for the modal — explains the specific phase. */
  modalExplanation: string;
  /** Bullet points: what the phase tends to reward. */
  rewards: string[];
  /** Bullet points: what to be careful with during the phase. */
  cautions: string[];
  /** Approximate remaining duration the user can expect. */
  durationNote: string;
}

// Normalise the wide variety of phase strings Prokerala returns into our
// translation map. Their values include "rising", "peak", "setting",
// "Ashtama Sani", "Kantaka Sani", "Janma Sani", etc., with inconsistent
// capitalisation. We lowercase + strip punctuation before lookup.
function phaseKey(phase: string | null): string {
  if (!phase) return '';
  return phase.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
}

const PHASE_DETAILS: Record<string, PhaseDetail> = {
  // ─── Classical Sade Sati: 7.5-year cycle, 3 phases ────────────────────────
  'rising': {
    shortLabel: 'Beginning phase — Saturn arriving',
    cardBlurb: "Saturn is just entering. Adjustments and turbulence as the testing period begins. Slow building rather than quick wins.",
    modalSubtitle: 'Beginning phase — Saturn just entering',
    modalExplanation: "Saturn has just entered the sign before your natal Moon. This is the first phase of the 7.5-year cycle classical Vedic astrology calls Sade Sati. The shape of the next several years is being set now — what you commit to, what you let go of, what you build.",
    rewards: [
      'Setting honest, long-horizon intentions',
      'Letting go of inheritances you never chose',
      'Slowing down and rebuilding foundations',
    ],
    cautions: [
      'Forcing decisions Saturn isn\'t ready to settle',
      'Mistaking the heaviness for failure',
      'Borrowing or lending impulsively',
    ],
    durationNote: 'About 2.5 years in this first phase. ~7.5 years total for the full cycle.',
  },
  'peak': {
    shortLabel: 'Peak phase — Saturn directly on your Moon',
    cardBlurb: "Saturn is sitting on your natal Moon. The heaviest phase of the cycle. Slow building, hard truths, deep recommitment.",
    modalSubtitle: 'Peak phase — Saturn on your natal Moon',
    modalExplanation: "Saturn is now in the same sign as your natal Moon. This is the middle and heaviest phase of the 7.5-year Sade Sati cycle. The classical sense is that Saturn tests the very ground you stand on — your emotional foundations, what you depend on, who you've been when no one was watching.",
    rewards: [
      'Honest accounting of what you actually own',
      'Slow, sustained effort on what matters most',
      'Patience as a form of strength',
      'Letting depth replace urgency',
    ],
    cautions: [
      'Big leaps Saturn isn\'t ready to bless',
      'Reading the heaviness as personal failure',
      'Quitting just before the turn',
    ],
    durationNote: 'About 2.5 years in this middle phase. The third (closing) phase follows.',
  },
  'setting': {
    shortLabel: 'Closing phase — Saturn moving on',
    cardBlurb: "Saturn is leaving. The hardest weight is past. Patience nearly rewarded; small graces beginning to land.",
    modalSubtitle: 'Closing phase — Saturn moving on',
    modalExplanation: "Saturn has moved past your natal Moon and is in the sign just after it. The heaviest weight of the 7.5-year cycle is behind you. What you built during the previous phases is being tested for durability — and what holds is yours to keep.",
    rewards: [
      'Reaping what was planted with patience',
      'Closing chapters cleanly',
      'Recognising the strength the cycle built',
    ],
    cautions: [
      'Letting the relief make you complacent',
      'Rushing into commitments before the cycle fully completes',
    ],
    durationNote: 'About 2.5 years in this final phase before Saturn fully leaves the cycle.',
  },
  // ─── Janma Sani — alternate name for the peak phase ──────────────────────
  'janma-sani': {
    shortLabel: 'Saturn directly on your Moon',
    cardBlurb: "Saturn is sitting on your natal Moon. The heaviest phase of the cycle. Slow building, hard truths, deep recommitment.",
    modalSubtitle: 'Saturn on your natal Moon (Janma Sani)',
    modalExplanation: "Saturn is now in the same sign as your natal Moon — the classical Janma Sani configuration. This is the heart of Sade Sati: Saturn tests the very ground you stand on, your emotional foundations, what you depend on.",
    rewards: [
      'Honest accounting of what you actually own',
      'Slow, sustained effort on what matters most',
      'Patience as a form of strength',
    ],
    cautions: [
      'Big leaps Saturn isn\'t ready to bless',
      'Reading the heaviness as personal failure',
    ],
    durationNote: 'About 2.5 years in this phase.',
  },
  // ─── Ashtama Sani — Saturn 8th from Moon ─────────────────────────────────
  'ashtama-sani': {
    shortLabel: "Saturn's 8th-house transit",
    cardBlurb: "Saturn is testing what's been inherited — shared resources, hidden patterns, what you've been depending on without realising.",
    modalSubtitle: "Saturn 8th from your Moon (Ashtama Sani)",
    modalExplanation: "Saturn is sitting in the 8th sign from your natal Moon — the classical Ashtama Sani configuration. The 8th sign in Vedic astrology governs inheritance, shared finances, intimacy, transformation, and what's been hidden. Saturn here pressures all of those areas to be honest.",
    rewards: [
      'Honest accounting of what you actually own',
      'Slow building rather than quick wins',
      'Letting go of what you inherited but never chose',
      'Long-game thinking about resources',
    ],
    cautions: [
      'Forcing breakthroughs Saturn isn\'t ready to give',
      'Lending or borrowing impulsively',
      'Mistaking the heaviness for failure — this period rewards persistence',
    ],
    durationNote: 'About 2.5 years total. Saturn moves on when it leaves this sign of the sky.',
  },
  // ─── Kantaka Sani — Saturn at 4th, 7th, or 10th from Moon ────────────────
  'kantaka-sani': {
    shortLabel: "Saturn's quarter-point transit",
    cardBlurb: "Saturn is on a stress-point of your chart — pressuring the angle of home, partnership, or career. Slow rebuilding ahead.",
    modalSubtitle: "Saturn at a quarter-point from your Moon (Kantaka Sani)",
    modalExplanation: "Saturn is in one of the angular signs from your natal Moon — the 4th (home and inner foundations), 7th (partnerships), or 10th (career and public role). Classical Vedic astrology calls this Kantaka Sani: Saturn pressing on a structural pillar of your life, asking it to hold up to scrutiny.",
    rewards: [
      'Rebuilding the angle Saturn is pressing on',
      'Sustained effort over urgency',
      'Knowing what your foundations actually are',
    ],
    cautions: [
      'Breaking a partnership / job / home setup before knowing what to replace it with',
      'Reading slowness as standstill',
    ],
    durationNote: 'About 2.5 years total in this configuration.',
  },
};

// Fallback used when Prokerala returns a phase string we don't have a
// translation for — keeps the card useful instead of breaking.
const FALLBACK: PhaseDetail = {
  shortLabel: "Saturn's testing period",
  cardBlurb: "Saturn is in a classical challenging position relative to your Moon. Slow building, hard truths, patience rewarded.",
  modalSubtitle: "Saturn is testing you",
  modalExplanation: "Saturn is currently in one of the challenging Moon-relative positions classical Vedic astrology has mapped for thousands of years. The shape is: things slow down, what's been hidden surfaces, and effort needs to be steady rather than dramatic.",
  rewards: [
    'Slow building rather than quick wins',
    'Honest accounting of what is and isn\'t working',
    'Patience as a form of strength',
  ],
  cautions: [
    'Forcing breakthroughs Saturn isn\'t ready to give',
    'Mistaking the heaviness for failure',
  ],
  durationNote: 'About 2.5 years in this configuration.',
};

export function phaseDetail(phase: string | null): PhaseDetail {
  return PHASE_DETAILS[phaseKey(phase)] ?? FALLBACK;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches Sade Sati state once per session per user. Returns null while
 * loading or on error so callers render-or-skip without extra state.
 */
export function useSadeSati(birthData: BirthData | null | undefined): SadeSatiData | null {
  const [data, setData] = useState<SadeSatiData | null>(null);

  useEffect(() => {
    if (!birthData) return;
    let cancelled = false;
    getSadeSati(birthData)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent — caller renders nothing */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData?.dateOfBirth, birthData?.timeOfBirth, birthData?.latitude, birthData?.longitude]);

  return data;
}
