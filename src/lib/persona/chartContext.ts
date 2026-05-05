/**
 * Layer 4 — Chart Context Builder
 *
 * Builds the chart context block for every Guru call:
 * - Current Mahadasha/Antardasha with dates
 * - Active dasha themes
 * - Dignity flags (exalted, debilitated, retrograde)
 * - What's coming soon (next significant chart event)
 *
 * ENGAGEMENT REQUIREMENT: "What's changing soon" — the next significant
 * chart event. Forward-looking references make the relationship feel
 * anticipatory, not just present-tense.
 *
 * The Guru never invents chart facts. Only what's in the chart object
 * is referenced. This function surfaces what's there clearly.
 */

import { ChartData, DashaPeriod, AntarDasha, PlanetPosition, BirthData } from '@store/userStore';
import { findActiveDasha, findActiveAntardasha } from '@utils/vedic';

// ─── Dasha Themes (classical) ──────────────────────────────────────────────────

const DASHA_THEMES: Record<string, string> = {
  Sun: 'identity, authority, soul purpose, and the relationship with father and power',
  Moon: 'emotional life, the inner world, mother, home, and the mind\'s responsiveness to the world',
  Mars: 'action, courage, assertion, property, siblings, and the confrontation of what requires direct engagement',
  Mercury: 'intellect, communication, learning, adaptability, business, and the precision of thought and word',
  Jupiter: 'wisdom, expansion, dharma, teachers, children, philosophy, and the recognition of what is genuinely worth growing toward',
  Venus: 'love, relationship, creative expression, beauty, material comfort, and the deepening of the heart',
  Saturn: 'discipline, long-term consequence, karmic resolution, service, and the slow building of what endures',
  Rahu: 'worldly ambition, rapid transformation, the foreign and the unconventional, obsessive seeking, and the shadow of desire',
  Ketu: 'spiritual deepening, detachment, past-life completion, intuition, and the withdrawal of energy from worldly pursuits',
};

// ─── Dignity Language ──────────────────────────────────────────────────────────

function describePlanetDignity(p: PlanetPosition): string | null {
  if (p.isExalted) return `${p.planet} is in its strongest placement (${p.sign}, House ${p.house}) — functioning with exceptional clarity and power`;
  if (p.isDebilitated) return `${p.planet} is in a challenging placement (${p.sign}, House ${p.house}) — its themes are active but require conscious attention`;
  if (p.isRetrograde) return `${p.planet} is retrograde — its energy turns inward; familiar themes return for deeper resolution`;
  return null;
}

// ─── What's Coming Soon ────────────────────────────────────────────────────────

function findNextDashaShift(dashas: DashaPeriod[]): string | null {
  const active = findActiveDasha(dashas);
  if (!active) return null;

  // Check antardasha shifts first (happen more frequently)
  if (active.antardasha) {
    const activeAntar = findActiveAntardasha(active.antardasha);
    if (activeAntar) {
      const endDate = new Date(activeAntar.endDate);
      const now = new Date();
      const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / 86_400_000);

      if (daysUntilEnd >= 0 && daysUntilEnd <= 60) {
        const nextAntar = active.antardasha[active.antardasha.indexOf(activeAntar) + 1];
        const endStr = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (nextAntar) {
          return `In approximately ${daysUntilEnd} days (around ${endStr}), the current sub-period shifts from ${activeAntar.planet} to ${nextAntar.planet}. This transition may bring a noticeable shift in the themes that are most active.`;
        }
        return `The current ${activeAntar.planet} sub-period ends around ${endStr}. A shift in emphasis is approaching.`;
      }
    }
  }

  // Check Mahadasha shifts
  const endDate = new Date(active.endDate);
  const now = new Date();
  const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / 86_400_000);

  if (daysUntilEnd >= 0 && daysUntilEnd <= 365) {
    const currentIdx = dashas.indexOf(active);
    const nextDasha = dashas[currentIdx + 1];
    const endStr = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (nextDasha) {
      const monthsRemaining = Math.round(daysUntilEnd / 30);
      return `In approximately ${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} (around ${endStr}), the ${active.planet} Mahadasha ends and the ${nextDasha.planet} Mahadasha begins. This is a significant transition — the themes of ${DASHA_THEMES[nextDasha.planet] ?? nextDasha.planet} will become the primary current.`;
    }
  }

  return null;
}

// ─── Main Builder ──────────────────────────────────────────────────────────────

export function buildChartContextBlock(chart: ChartData, birthData: BirthData): string {
  const parts: string[] = [];

  const activeDasha = findActiveDasha(chart.dashas);
  const activeAntar = findActiveAntardasha(activeDasha?.antardasha);

  // Current dasha period
  if (activeDasha) {
    const dashaTheme = DASHA_THEMES[activeDasha.planet] ?? `${activeDasha.planet} themes`;
    const startYear = new Date(activeDasha.startDate).getFullYear();
    const endYear = new Date(activeDasha.endDate).getFullYear();

    parts.push(`CURRENT PLANETARY PERIOD:`);
    parts.push(`${activeDasha.planet} Mahadasha (${startYear}–${endYear}): This person is in a long-term period governed by ${dashaTheme}. Every topic they bring will carry this undercurrent.`);

    if (activeAntar) {
      const antarTheme = DASHA_THEMES[activeAntar.planet] ?? activeAntar.planet;
      const antarEnd = new Date(activeAntar.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      parts.push(`Current sub-period: ${activeAntar.planet} Antardasha (until ${antarEnd}) — ${antarTheme} is the more immediate emphasis within the longer Mahadasha current.`);
    }
  }

  // Dignity flags — only notable ones
  const dignityNotes: string[] = [];
  for (const p of chart.planets) {
    const note = describePlanetDignity(p);
    if (note) dignityNotes.push(note);
  }

  if (dignityNotes.length > 0) {
    parts.push(`\nNOTABLE PLANETARY CONDITIONS:`);
    dignityNotes.forEach((n) => parts.push(`- ${n}`));
  }

  // Active yogas
  if (chart.yogas.length > 0) {
    parts.push(`\nACTIVE CHART COMBINATIONS: ${chart.yogas.join(', ')}`);
  }

  // What's coming soon
  const upcoming = findNextDashaShift(chart.dashas);
  if (upcoming) {
    parts.push(`\nWHAT'S COMING SOON:\n${upcoming}`);
  }

  // Navamsha lagna
  parts.push(`\nNavamsha (dharmic compass): ${chart.navamshaLagna} — the deeper soul orientation beneath the surface personality.`);

  return parts.join('\n');
}

// ─── Compact Chart Summary (for system prompt) ─────────────────────────────────

export function buildCompactChartSummary(chart: ChartData, birthData: BirthData): string {
  const moon = chart.planets.find((p) => p.planet === 'Moon');
  const activeDasha = findActiveDasha(chart.dashas);
  const activeAntar = findActiveAntardasha(activeDasha?.antardasha);

  const dashaStr = activeAntar
    ? `${activeDasha?.planet} Mahadasha / ${activeAntar.planet} Antardasha`
    : activeDasha
    ? `${activeDasha.planet} Mahadasha`
    : 'Unknown Dasha';

  return `${birthData.name} · ${chart.lagna} Lagna · Moon in ${moon?.sign ?? '?'} (${moon?.nakshatra ?? '?'}) · ${dashaStr}`;
}
