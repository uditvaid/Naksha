/**
 * Classical chart "doshas" — Mangal (Mars) and Kalsarpa (Rahu-Ketu axis).
 *
 * Mangal Dosha comes from Prokerala's standalone endpoint. Kalsarpa Dosha
 * has no Prokerala v2 endpoint, so we compute it locally from planet
 * positions we already have in the chart. The check is deterministic and
 * simple: all 7 visible planets must lie on one side of the Rahu-Ketu
 * axis. The classical literature also names 12 sub-types based on which
 * house Rahu occupies (Anant, Kulik, Vasuki, etc.) — we name the
 * sub-type but lead with plain-English headlines.
 *
 * The card on the Chart screen is silent when neither dosha is present.
 * This is the same render-or-skip pattern as Sade Sati.
 */

import { useEffect, useState } from 'react';
import { getMangalDosha, type MangalDoshaInfo } from '@services/prokerala';
import type { BirthData, ChartData, PlanetPosition } from '@store/userStore';

// ─── Kalsarpa Dosha local compute ────────────────────────────────────────────

const VISIBLE_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export interface KalsarpaResult {
  hasDosha: boolean;
  /** "partial" if all 7 are on the OPPOSITE side (Rahu→Ketu going backward).
   *  Some traditions call this Kalsarpa, others reserve the term for the
   *  forward arc only. We surface both but flag partial as less heavy. */
  isPartial: boolean;
  /** 1-12 for the named sub-types (Anant in 1st through Sheshnag in 12th).
   *  Null when no dosha. */
  rahuHouse: number | null;
  /** Plain-English sub-type label, e.g. "Anant Kalsarpa". Null when no dosha. */
  subTypeLabel: string | null;
  /** Sanskrit sub-type name kept as a subtitle in the modal. */
  subTypeSanskrit: string | null;
}

const KALSARPA_BY_HOUSE: { sanskrit: string; theme: string }[] = [
  { sanskrit: 'Anant',       theme: 'Self & identity' },
  { sanskrit: 'Kulika',      theme: 'Family wealth' },
  { sanskrit: 'Vasuki',      theme: 'Courage & siblings' },
  { sanskrit: 'Shankhpal',   theme: 'Home & inner foundations' },
  { sanskrit: 'Padma',       theme: 'Creativity & children' },
  { sanskrit: 'Mahapadma',   theme: 'Daily work & service' },
  { sanskrit: 'Takshak',     theme: 'Partnerships' },
  { sanskrit: 'Karkotak',    theme: 'Hidden things & transformation' },
  { sanskrit: 'Shankhachuda',theme: 'Beliefs & long journeys' },
  { sanskrit: 'Patak',       theme: 'Career & public role' },
  { sanskrit: 'Vishakta',    theme: 'Networks & gains' },
  { sanskrit: 'Sheshnag',    theme: 'Endings & quiet life' },
];

/**
 * Detect Kalsarpa Yoga / Dosha from planet positions.
 *
 * Algorithm: place every visible planet at its angular distance from Rahu
 * going forward in the zodiac (0-360°). Kalsarpa proper = all 7 in (0, 180).
 * Partial Kalsarpa = all 7 in (180, 360). Either case names a sub-type
 * based on which house Rahu occupies.
 */
export function detectKalsarpa(planets: PlanetPosition[] | null | undefined): KalsarpaResult {
  // Defensive: chart can technically arrive without a planets array (e.g.
  // a half-loaded approximate chart, or a chart shape we haven't seen).
  if (!planets || !Array.isArray(planets) || planets.length === 0) {
    return { hasDosha: false, isPartial: false, rahuHouse: null, subTypeLabel: null, subTypeSanskrit: null };
  }
  const rahu = planets.find(p => p.planet === 'Rahu');
  if (!rahu) return { hasDosha: false, isPartial: false, rahuHouse: null, subTypeLabel: null, subTypeSanskrit: null };

  const rahuLong = rahu.signIndex * 30 + rahu.degree;
  const visible = planets.filter(p => VISIBLE_PLANETS.includes(p.planet));
  if (visible.length < 7) {
    return { hasDosha: false, isPartial: false, rahuHouse: null, subTypeLabel: null, subTypeSanskrit: null };
  }

  // Angular distance from Rahu, walking forward in the zodiac.
  const fromRahu = visible.map(p => {
    const long = p.signIndex * 30 + p.degree;
    return ((long - rahuLong) + 360) % 360;
  });

  // Strict-inside-(0,180) check. We allow a small tolerance at the
  // endpoints because a planet exactly conjunct Rahu/Ketu is rare but
  // would otherwise flicker.
  const EPS = 0.5;
  const allForward = fromRahu.every(d => d > EPS && d < (180 - EPS));
  const allBackward = fromRahu.every(d => d > (180 + EPS) && d < (360 - EPS));

  if (!allForward && !allBackward) {
    return { hasDosha: false, isPartial: false, rahuHouse: null, subTypeLabel: null, subTypeSanskrit: null };
  }

  const rahuHouse = rahu.house;
  const subType = KALSARPA_BY_HOUSE[rahuHouse - 1];
  return {
    hasDosha: true,
    isPartial: allBackward,
    rahuHouse,
    subTypeLabel: subType ? `${subType.sanskrit} Kalsarpa — ${subType.theme}` : 'Kalsarpa Yoga',
    subTypeSanskrit: subType ? `${subType.sanskrit} Kalsarpa` : 'Kalsarpa Yoga',
  };
}

// ─── Mangal Dosha hook ───────────────────────────────────────────────────────

export function useMangalDosha(birthData: BirthData | null | undefined): MangalDoshaInfo | null {
  const [data, setData] = useState<MangalDoshaInfo | null>(null);

  useEffect(() => {
    if (!birthData) return;
    let cancelled = false;
    getMangalDosha(birthData)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent — caller renders nothing */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData?.dateOfBirth, birthData?.timeOfBirth, birthData?.latitude, birthData?.longitude]);

  return data;
}

// ─── Plain-English content for the modal ─────────────────────────────────────

export const MANGAL_EXPLAIN = {
  whatItIs:
    "Mangal Dosha (also called 'Manglik Dosha') is when Mars sits in certain houses of your chart that classical Vedic tradition treats as challenging for partnerships. It's not a curse — it's a known pattern that asks for awareness in how you choose and build relationships.",
  ifPresent:
    "What it tends to bring: more intensity in close relationships, a tendency toward conflict if energies aren't channelled, and a preference for partners who can match your fire. Many people with Mangal Dosha have happy marriages — the difference is that they tend to do better with partners who also have it (the energies match) or partners who give them lots of room.",
  ifAbsent:
    "Mars sits in classically neutral or supportive positions in your chart. Partnership challenges, when they come, are unlikely to be Mars-driven.",
};

export const KALSARPA_EXPLAIN = {
  whatItIs:
    "Kalsarpa Yoga is when all 7 visible planets in your chart sit between Rahu (the north lunar node) and Ketu (the south lunar node) on one side of the cosmic axis. It's named for the Sanskrit 'kal' (time) and 'sarpa' (serpent) — the planets are 'inside the serpent.'",
  ifPresent:
    "Classical interpretation: life feels delayed early, patterns repeat until you understand them, and breakthrough often comes through unconventional paths rather than the standard route. Many great leaders, artists, and spiritual seekers have this configuration. The shape is: hold steady, the long game rewards you.",
  partial:
    "You have a Partial Kalsarpa configuration — the planets sit on the opposite arc of the Rahu-Ketu axis. Same general shape (delayed early, unconventional path, long-game wins) but classically lighter than the full forward Kalsarpa.",
  themes: (theme: string) => `The classical sub-type points your Kalsarpa toward: ${theme.toLowerCase()}. That's the area where the shape of the dosha — delayed start, eventual breakthrough — tends to play out most.`,
};

// ─── Combined hook for the card ──────────────────────────────────────────────

export interface DoshaPanelData {
  mangal: MangalDoshaInfo | null;
  kalsarpa: KalsarpaResult;
}

export function useDoshaPanel(
  birthData: BirthData | null | undefined,
  chart: ChartData | null,
): DoshaPanelData | null {
  const mangal = useMangalDosha(birthData);
  if (!chart || !chart.planets) return null;
  const kalsarpa = detectKalsarpa(chart.planets);
  return { mangal, kalsarpa };
}
