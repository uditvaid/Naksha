/**
 * Panchang plain-English translations.
 *
 * Prokerala returns Sanskrit names (Krishna Paksha, Purva Ashadha, Sadhya, etc.)
 * which mean nothing to a user who doesn't speak Vedic. This module maps each
 * to a short, human-readable label + a one-line meaning. Surfaces that want
 * to show classical depth can render `{plainLabel} ({sanskrit})`; surfaces
 * that want to stay accessible can use `plainLabel` alone.
 */

// ─── Weekday rulers (vaara) ───────────────────────────────────────────────────

const WEEKDAY_RULER: Record<string, string> = {
  Sunday: 'Sun', Monday: 'Moon', Tuesday: 'Mars', Wednesday: 'Mercury',
  Thursday: 'Jupiter', Friday: 'Venus', Saturday: 'Saturn',
};

export function weekdayRuler(vaara: string): string | null {
  return WEEKDAY_RULER[vaara] ?? null;
}

// ─── Tithi (lunar day) + Paksha (fortnight) ──────────────────────────────────

// Tithi index in the response is 1-15 within each paksha (Krishna or Shukla),
// so the 30 tithi names map onto numbers 1-15 twice. We only need the
// number when surfacing "Day N of waxing/waning moon."
const TITHI_TO_DAY: Record<string, number> = {
  Pratipada: 1, Pratipat: 1,
  Dwitiya: 2, Tritiya: 3, Chaturthi: 4, Panchami: 5, Shashthi: 6, Saptami: 7,
  Ashtami: 8, Navami: 9, Dashami: 10, Ekadashi: 11, Dwadashi: 12,
  Trayodashi: 13, Chaturdashi: 14,
  Purnima: 15, Amavasya: 15,
};

export function tithiDay(tithiName: string): number | null {
  return TITHI_TO_DAY[tithiName] ?? null;
}

export function pakshaPlain(paksha: string): 'waxing' | 'waning' | null {
  if (paksha?.toLowerCase().includes('shukla')) return 'waxing';
  if (paksha?.toLowerCase().includes('krishna')) return 'waning';
  return null;
}

// ─── Nakshatras: 27 lunar mansions with one-line meanings ────────────────────

export const NAKSHATRA_MEANING: Record<string, string> = {
  Ashwini:           'The swift twin healers — quick beginnings, vitality, fresh starts',
  Bharani:           'The bearer — endurance, transformation, holding what is heavy',
  Krittika:          'The cutter — sharpness, purifying fire, cutting through illusion',
  Rohini:            'The red bloom — beauty, growth, sensual abundance',
  Mrigashira:        'The seeking deer — gentle quest, curiosity, restlessness with purpose',
  Mrigashirsha:      'The seeking deer — gentle quest, curiosity, restlessness with purpose',
  Ardra:             'The storm — emotional intensity, breakthrough through tears',
  Punarvasu:         'The return of light — renewal, homecoming, second chances',
  Pushya:            'The nourisher — the most auspicious, deep care, generous sustenance',
  Ashlesha:          'The embracing serpent — magnetic, mysterious, hypnotic power',
  Magha:             'The throne — ancestral power, royal lineage, dignity inherited',
  'Purva Phalguni':  'The early bloom — pleasure, creativity, romance, leisure',
  'Uttara Phalguni': 'The late bloom — partnership, generosity, settled grace',
  Hasta:             'The hand — skill, craft, what you make with your own touch',
  Chitra:            'The brilliant — beauty in form, design, magnetic presence',
  Swati:             'The independent — gentle strength, self-direction, freedom',
  Vishakha:          'The forked branch — focused ambition, two paths, hard-won goals',
  Anuradha:          'The devoted follower — friendship, loyalty, success through bonds',
  Jyeshtha:          'The eldest — seniority, hidden power, quiet protection',
  Mula:              'The root — deep digging, getting to the source, unflinching truth',
  'Purva Ashadha':   'The early invincible — courage, conviction, unshakeable belief',
  'Uttara Ashadha':  'The late invincible — lasting wins, ethics, principled victory',
  Shravana:          'The listener — wisdom through hearing, knowledge transmitted',
  Dhanishta:         'The wealthy — abundance, music, the rhythm of success',
  Dhanishtha:        'The wealthy — abundance, music, the rhythm of success',
  Shatabhisha:       'The hundred healers — secret knowledge, healing, sacred solitude',
  'Purva Bhadrapada':'The early scorcher — intensity, sacrifice, fierce transformation',
  'Uttara Bhadrapada':'The late scorcher — depth, restraint, wise endings',
  Revati:            'The completion — gentleness, protection of travellers, soft endings',
};

export function nakshatraMeaning(name: string): string {
  return NAKSHATRA_MEANING[name] ?? '';
}

// ─── Yoga (Sun-Moon harmonic) — 27 nityayogas ────────────────────────────────

// "Yoga" here is a different concept from chart-yogas (Gajakesari etc.) — it's
// one of 27 Sun-Moon angle states cycling through each lunar month. Each has
// a flavour. We translate to a short modern label so users get the gist.

export const YOGA_LABEL: Record<string, string> = {
  Vishkambha: 'Solid foundation',
  Priti:      'Affection',
  Ayushman:   'Long life',
  Saubhagya:  'Good fortune',
  Shobhana:   'Splendour',
  Atiganda:   'Tested ground',
  Sukarma:    'Right action',
  Dhriti:     'Steadiness',
  Shoola:     'Sharp edge',
  Ganda:      'Knot',
  Vriddhi:    'Growth',
  Dhruva:     'Constancy',
  Vyaghata:   'Striking',
  Harshana:   'Joy',
  Vajra:      'Diamond will',
  Siddhi:     'Accomplishment',
  Vyatipata:  'Disruption',
  Variyan:    'Excellence',
  Variyana:   'Excellence',
  Parigha:    'Barrier',
  Shiva:      'Auspicious',
  Siddha:     'Perfected',
  Sadhya:     'Achievable',
  Shubha:     'Auspicious',
  Subha:      'Auspicious',
  Shukla:     'Pure light',
  Brahma:     'Sacred',
  Indra:      'Royal',
  Vaidhriti:  'Disjunction',
};

export function yogaLabel(yoga: string): string {
  return YOGA_LABEL[yoga] ?? yoga;
}

// ─── Time formatting ─────────────────────────────────────────────────────────

/**
 * Format an ISO datetime in the SAME timezone the string carries, NOT in
 * the device's local timezone. Prokerala returns timestamps already
 * anchored to the user's birth-coords timezone (e.g.
 * "2026-05-07T05:39:48+05:30" for Faridabad). Using `Date.getHours()`
 * would silently convert to whatever timezone the device happens to be
 * in — so a user travelling internationally, or running the app on a
 * sim in a different region, would see times shifted by hours.
 *
 * We parse the time-of-day portion directly from the string instead of
 * round-tripping through Date, which preserves the intended timezone.
 *
 * Example: "2026-05-07T11:50:55+05:30" → "11:50 AM" (regardless of
 * where the device clock is set).
 */
export function formatLocalTime(isoWithTz: string): string {
  if (!isoWithTz) return '';
  // Match HH:MM after the "T" separator, ignoring seconds + offset.
  const match = isoWithTz.match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── Hook + summary line ─────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { getPanchang, type PanchangData } from '@services/prokerala';
import type { BirthData } from '@store/userStore';

/**
 * Fetches today's panchang for the user once per calendar date.
 * Returns null while loading or on error so callers can render-or-skip
 * without extra state. Service-level cache + inflight dedup means many
 * mounts in a single day still hit the network only once.
 */
export function usePanchang(
  birthData: BirthData | null | undefined,
  nowTick: number,
): PanchangData | null {
  const [data, setData] = useState<PanchangData | null>(null);
  const isoDate = new Date(nowTick).toISOString().split('T')[0];

  useEffect(() => {
    if (!birthData) return;
    let cancelled = false;
    getPanchang(birthData, new Date(nowTick))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent — caller renders nothing */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData?.latitude, birthData?.longitude, birthData?.timezone, isoDate]);

  return data;
}

/**
 * Plain-English one-line summary of the panchang at "now". Skips Sanskrit
 * jargon entirely — meant as subtle context above an affirmation, not as
 * its own surface. Returns null if the data hasn't loaded.
 *
 * Example output:
 *   "Thursday · Moon in Purva Ashadha · waning"
 */
export function panchangSummaryLine(data: PanchangData | null, nowMs: number): string | null {
  if (!data) return null;
  const inWindow = (s: string, e: string) => {
    const ss = new Date(s).getTime();
    const ee = new Date(e).getTime();
    return ss <= nowMs && nowMs < ee;
  };
  const activeNak = data.nakshatra.find(n => inWindow(n.start, n.end)) ?? data.nakshatra[0];
  const activeTithi = data.tithi.find(t => inWindow(t.start, t.end)) ?? data.tithi[0];
  const phase = activeTithi ? pakshaPlain(activeTithi.paksha) : null;

  const parts: string[] = [];
  if (data.vaara) parts.push(data.vaara);
  if (activeNak) parts.push(`Moon in ${activeNak.name}`);
  if (phase) parts.push(`${phase} moon`);
  return parts.length ? parts.join(' · ') : null;
}
