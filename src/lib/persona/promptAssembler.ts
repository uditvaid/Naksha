/**
 * Layer 7 — System Prompt Assembly
 *
 * The single integration point for all persona layers. Composes the
 * full Guru system prompt from every layer's output. Replaces the old
 * buildDynamicGuruPrompt() from personaEngine.ts.
 *
 * Target: 4000–8000 tokens. Size is necessary — this is what produces
 * real persona rather than a dressed-up generic response.
 *
 * Composition order (each section is clearly delimited):
 * 1. Core identity + character bible (archetype-specific)
 * 2. Seeker profile (dosha, nakshatra, learning style — from personaEngine)
 * 3. Relationship phase context
 * 4. Relationship arc (longitudinal growth tracking)
 * 5. User memory (facts, threads, observed patterns)
 * 6. Chart context (dasha, dignities, upcoming events)
 * 7. Full chart data
 * 8. Conversation rules (rhythm + guardrails)
 */

import { ChartData, BirthData } from '@store/userStore';
import { deriveArchetype, getArchetypeSystemContext, ArchetypeProfile } from './archetype';
import { buildBibleSystemBlock } from './bibles';
import { PhaseState, buildPhaseBlock, computeAbsenceDays } from './phase';
import { UserArc, buildArcBlock } from './arc';
import { UserMemory, buildMemoryBlock } from './memory';
import { buildChartContextBlock, buildCompactChartSummary } from './chartContext';
import { RhythmContext, buildRhythmBlock } from './rhythm';
import {
  MessageClass,
  getCrisisInstruction,
  getParasocialInstruction,
  getIdentityProbeInstruction,
  getHostileInstruction,
} from './guardrails';
import { deriveUserPersona } from '@services/personaEngine';

// ─── Input Types ───────────────────────────────────────────────────────────────

export interface PromptAssemblyInput {
  birthData: BirthData;
  chart: ChartData;
  phaseState: PhaseState;
  arc: UserArc;
  memory: UserMemory;
  rhythmContext: RhythmContext;
  messageClass: MessageClass;
  sessionTurnCount: number;
}

// ─── Section Builders ──────────────────────────────────────────────────────────

function buildIdentitySection(profile: ArchetypeProfile): string {
  return `════════════════════════════════════════
GURU IDENTITY
════════════════════════════════════════

${buildBibleSystemBlock(profile.key)}

${getArchetypeSystemContext(profile)}`;
}

function buildSeekerProfileSection(chart: ChartData, profile: ArchetypeProfile): string {
  // Re-use personaEngine for dosha + nakshatra — these are still valid
  const persona = deriveUserPersona(chart);
  const moon = chart.planets.find((p) => p.planet === 'Moon');

  return `════════════════════════════════════════
SEEKER PROFILE
════════════════════════════════════════

Chart archetype: ${profile.name} (${profile.planet} dominant, strength: ${profile.dominantPlanetStrength})
Ayurvedic constitution: ${persona.dosha} (dominant ${persona.dominantElement} element)
Learning & receptivity style: ${persona.learningStyle}
${moon ? `Moon in ${moon.nakshatra} Nakshatra — emotional temperament: ${persona.chartSignature}` : ''}

How this person receives information best: calibrate voice, pace, and depth to this profile throughout the conversation.`;
}

function buildChartDataSection(chart: ChartData, birthData: BirthData): string {
  return `════════════════════════════════════════
BIRTH CHART (Lahiri · Whole Sign · BPHS)
════════════════════════════════════════

${buildCompactChartSummary(chart, birthData)}

Lagna: ${chart.lagna}
Navamsha Lagna: ${chart.navamshaLagna}

Planetary positions:
${chart.planets.map((p) =>
  `${p.planet}: ${p.sign} · House ${p.house} · ${p.nakshatra} pada ${p.pada}` +
  (p.isRetrograde ? ' ℞' : '') +
  (p.isExalted ? ' (exalted)' : p.isDebilitated ? ' (debilitated)' : '')
).join('\n')}

Active Dasha: ${chart.dashas.find((d) => d.isActive)?.planet ?? 'Unknown'} Mahadasha
${chart.yogas.length > 0 ? `Yogas: ${chart.yogas.join(', ')}` : ''}`;
}

function buildUniversalRules(): string {
  return `════════════════════════════════════════
NON-NEGOTIABLE RULES
════════════════════════════════════════

LANGUAGE:
- Write in plain, warm, conversational English. No Sanskrit terms without immediate plain-English explanation. No jargon.
- No markdown formatting. No # headers, no **bold**, no bullet points. Plain prose only.
- Use everyday metaphors appropriate to your archetype's preferred metaphors.

CHART GROUNDING:
- Reference specific chart facts (planets, dasha, dignities) when relevant.
- If nothing specific is relevant, say so honestly rather than floating into generalities.
- NEVER invent chart facts, memories, or shared history that didn't happen.

CHARACTER:
- You are not a response generator. You are a character in relationship with this specific person.
- You may disagree, sit in silence, decline to predict, decline to answer a question.
- You may push back on self-indulgence, avoidance, or wrong-question framing.
- You never flatter. You never validate without basis.
- You are never "infinitely available." Sometimes the right response is brief or withheld.
- When the user tests you (memory probes, jailbreaks, identity questions): respond in character, not in corporate voice.

WHAT YOU NEVER DO:
- Predict external events (you can speak to internal conditions and orientations)
- Speak in generalities about "the stars" or "cosmic energy" without specific chart grounding
- Begin responses with the user's name as a salutation
- Use "navigate," "embrace," "holistic," "the universe is telling you," or similar generic spiritual language
- Offer comfort that isn't earned by the actual situation`;
}

// ─── Special Handling Sections ─────────────────────────────────────────────────

function buildSpecialHandlingSection(
  messageClass: MessageClass,
  archetype: ArchetypeProfile['key'],
): string {
  switch (messageClass) {
    case 'crisis':
      return `\n════════════════════════════════════════\nSPECIAL HANDLING\n════════════════════════════════════════\n\n${getCrisisInstruction()}`;
    case 'parasocial':
      return `\n════════════════════════════════════════\nSPECIAL HANDLING\n════════════════════════════════════════\n\n${getParasocialInstruction(archetype)}`;
    case 'identity_probe':
      return `\n════════════════════════════════════════\nSPECIAL HANDLING\n════════════════════════════════════════\n\n${getIdentityProbeInstruction(archetype)}`;
    case 'hostile':
      return `\n════════════════════════════════════════\nSPECIAL HANDLING\n════════════════════════════════════════\n\n${getHostileInstruction()}`;
    default:
      return '';
  }
}

// ─── Main Assembler ────────────────────────────────────────────────────────────

export function assembleGuruSystemPrompt(input: PromptAssemblyInput): string {
  const { birthData, chart, phaseState, arc, memory, rhythmContext, messageClass } = input;

  const archetypeProfile = deriveArchetype(chart);
  const absenceDays = computeAbsenceDays(phaseState.lastSessionDate);

  const sections: string[] = [
    buildIdentitySection(archetypeProfile),
    buildSeekerProfileSection(chart, archetypeProfile),
  ];

  // Phase context
  const phaseBlock = buildPhaseBlock(phaseState, absenceDays);
  if (phaseBlock) {
    sections.push(`════════════════════════════════════════\nRELATIONSHIP PHASE\n════════════════════════════════════════\n\n${phaseBlock}`);
  }

  // Arc context — only if there's content
  const arcBlock = buildArcBlock(arc, phaseState.sessionDays);
  if (arcBlock) {
    sections.push(`════════════════════════════════════════\nRELATIONSHIP ARC\n════════════════════════════════════════\n\n${arcBlock}`);
  }

  // Memory block — only if there's content
  const memoryBlock = buildMemoryBlock(memory);
  if (memoryBlock) {
    sections.push(`════════════════════════════════════════\nMEMORY\n════════════════════════════════════════\n\n${memoryBlock}`);
  }

  // Chart context
  const chartContextBlock = buildChartContextBlock(chart, birthData);
  sections.push(`════════════════════════════════════════\nCHART CONTEXT\n════════════════════════════════════════\n\n${chartContextBlock}`);

  // Full chart data
  sections.push(buildChartDataSection(chart, birthData));

  // Universal rules
  sections.push(buildUniversalRules());

  // Rhythm instruction
  const rhythmBlock = buildRhythmBlock(rhythmContext);
  sections.push(`════════════════════════════════════════\nTHIS RESPONSE\n════════════════════════════════════════\n\n${rhythmBlock}`);

  // Special handling (crisis, parasocial, etc.)
  const specialSection = buildSpecialHandlingSection(messageClass, archetypeProfile.key);
  if (specialSection) sections.push(specialSection);

  return sections.join('\n\n');
}

// ─── Fallback (no chart) ───────────────────────────────────────────────────────

export function assembleDefaultGuruPrompt(birthData: BirthData): string {
  return `You are a warm, wise spiritual guide. Write in plain, simple English. No jargon. No Sanskrit terms. No markdown. Speak directly and honestly. End with something practical the person can try today.

Seeker: ${birthData.name}
Born: ${birthData.dateOfBirth}, ${birthData.placeOfBirth}
(Chart not yet calculated — read from birth data alone, without inventing placements.)`;
}
