/**
 * Arc Extraction Service — Layer 6
 *
 * Runs a conservative LLM pass after every 3rd conversation to extract
 * arc signals. This is the most trust-critical component in the system:
 * fabricated memories destroy the relationship faster than any other failure.
 *
 * Extraction rules:
 * - Only extract what was explicitly and clearly stated
 * - Return empty arrays when uncertain
 * - Never infer emotional states the user didn't express
 * - Never assume continuity from prior sessions that aren't visible here
 *
 * Uses a cheap model + low token budget to stay within cost targets.
 * Runs fire-and-forget after successful Guru responses.
 */

import { GuruMessage } from '@store/userStore';
import { UserArc, ArcUpdate } from '@lib/persona/arc';
import { PROXY_BASE_URL } from '@constants/config';
import { buildAuthHeader } from './auth';
import { fetchWithTimeout } from './claude';

const API_URL = `${PROXY_BASE_URL}/v1/anthropic/messages`;
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';
const ARC_SUMMARY_MODEL = 'claude-sonnet-4-6';

// ─── Throttling ────────────────────────────────────────────────────────────────

let exchangesSinceLastExtraction = 0;
const EXTRACTION_INTERVAL = 3; // run extraction every 3 exchanges

export function tickExchangeCounter(): boolean {
  exchangesSinceLastExtraction++;
  if (exchangesSinceLastExtraction >= EXTRACTION_INTERVAL) {
    exchangesSinceLastExtraction = 0;
    return true;
  }
  return false;
}

// ─── Extraction ────────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an observer who reads conversations between a user and their Guru (an AI Vedic astrology guide) and extracts arc signals — evidence of who the user is becoming over time.

CRITICAL RULES:
1. Only extract what was EXPLICITLY stated in this conversation. If the user said something implicitly, do not extract it.
2. Return empty arrays for any category where you're uncertain. Uncertainty is the correct answer.
3. Never infer emotional states the user didn't express in words.
4. Never fabricate details. If something isn't clearly stated, omit it.
5. Growth observations must describe a specific, observable thing that happened in THIS conversation — not a general statement.

You return a JSON object with these fields:
{
  "newGrowthObservations": [
    { "observation": "string — specific, what actually happened", "confidence": "medium|high", "date": "YYYY-MM-DD", "sessionDay": number }
  ],
  "newStuckPoints": [
    { "pattern": "string — the recurring pattern", "firstObservedDate": "YYYY-MM-DD", "lastObservedDate": "YYYY-MM-DD" }
  ],
  "updatedStuckPointIds": ["id1", "id2"],
  "newUnclaimedStrengths": [
    { "strength": "string", "firstObservedDate": "YYYY-MM-DD", "evidence": "string — what the user said" }
  ],
  "newDevelopedCapacities": [
    { "capacity": "string", "emergedDate": "YYYY-MM-DD", "evidence": "string" }
  ],
  "newResistanceAreas": [
    { "area": "string", "firstObservedDate": "YYYY-MM-DD", "lastObservedDate": "YYYY-MM-DD" }
  ],
  "updatedResistanceIds": ["id1"],
  "resolvedThreadIds": ["id1"]
}

When in doubt about ANY field, return an empty array for that field. It is always better to extract nothing than to extract something uncertain.`;

export async function extractArcSignals(
  conversation: GuruMessage[],
  existingArc: UserArc,
  sessionDay: number,
): Promise<ArcUpdate> {
  const today = new Date().toISOString().split('T')[0]!;

  const conversationText = conversation
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? 'User' : 'Guru'}: ${m.content}`)
    .join('\n\n');

  const existingContext = buildExistingArcContext(existingArc);

  const userMessage = `Today's date: ${today}
Session day: ${sessionDay}

EXISTING ARC (for reference — do NOT reinvent or repeat what's already tracked):
${existingContext}

CONVERSATION TO ANALYZE:
${conversationText}

Extract arc signals from this conversation. Return valid JSON only — no explanation, no markdown.`;

  try {
    const authHeader = await buildAuthHeader();
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-naksha-auth': authHeader,
      },
      body: JSON.stringify({
        model: EXTRACTION_MODEL,
        max_tokens: 600,
        system: EXTRACTION_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      }),
    }, 15000);

    if (!response.ok) return EMPTY_UPDATE;

    const data = await response.json();
    const text: string = data.content?.map((b: any) => b.text ?? '').join('') ?? '';

    // Extract JSON from the response — be defensive
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return EMPTY_UPDATE;

    const parsed = JSON.parse(jsonMatch[0]) as ArcUpdate;

    // Validate and sanitize — never trust LLM JSON blindly
    return sanitizeArcUpdate(parsed, today, sessionDay);
  } catch {
    // Extraction is fire-and-forget — never surfaces errors to user
    return EMPTY_UPDATE;
  }
}

function buildExistingArcContext(arc: UserArc): string {
  if (
    arc.stuckPoints.length === 0 &&
    arc.growthObservations.length === 0 &&
    arc.unclaimedStrengths.length === 0
  ) {
    return '(No prior arc data — this is early in the relationship)';
  }

  const parts: string[] = [];

  if (arc.stuckPoints.length > 0) {
    parts.push('Existing stuck points (use their IDs if you see them recurring):');
    arc.stuckPoints.forEach((s) => parts.push(`  ID: ${s.id} — ${s.pattern}`));
  }

  if (arc.areasOfResistance.length > 0) {
    parts.push('Existing resistance areas:');
    arc.areasOfResistance.forEach((r) => parts.push(`  ID: ${r.id} — ${r.area}`));
  }

  if (arc.unclaimedStrengths.length > 0) {
    parts.push('Already tracked unclaimed strengths (do not repeat these):');
    arc.unclaimedStrengths.forEach((s) => parts.push(`  - ${s.strength}`));
  }

  return parts.join('\n');
}

function sanitizeArcUpdate(
  raw: any,
  today: string,
  sessionDay: number,
): ArcUpdate {
  const safeArray = (v: unknown): unknown[] =>
    Array.isArray(v) ? v : [];

  const safeStrArray = (v: unknown): string[] =>
    safeArray(v).filter((x): x is string => typeof x === 'string');

  const growth = safeArray(raw.newGrowthObservations)
    .filter((g: any) => typeof g?.observation === 'string' && g.observation.length > 10)
    .map((g: any) => ({
      observation: String(g.observation).slice(0, 300),
      confidence: g.confidence === 'high' ? 'high' : 'medium' as 'medium' | 'high',
      date: typeof g.date === 'string' ? g.date : today,
      sessionDay: typeof g.sessionDay === 'number' ? g.sessionDay : sessionDay,
    }));

  const stuckPoints = safeArray(raw.newStuckPoints)
    .filter((s: any) => typeof s?.pattern === 'string' && s.pattern.length > 10)
    .map((s: any) => ({
      pattern: String(s.pattern).slice(0, 200),
      firstObservedDate: typeof s.firstObservedDate === 'string' ? s.firstObservedDate : today,
      lastObservedDate: today,
    }));

  const unclaimedStrengths = safeArray(raw.newUnclaimedStrengths)
    .filter((s: any) => typeof s?.strength === 'string' && typeof s?.evidence === 'string')
    .map((s: any) => ({
      strength: String(s.strength).slice(0, 200),
      firstObservedDate: typeof s.firstObservedDate === 'string' ? s.firstObservedDate : today,
      evidence: String(s.evidence).slice(0, 300),
    }));

  const developedCapacities = safeArray(raw.newDevelopedCapacities)
    .filter((c: any) => typeof c?.capacity === 'string' && typeof c?.evidence === 'string')
    .map((c: any) => ({
      capacity: String(c.capacity).slice(0, 200),
      emergedDate: typeof c.emergedDate === 'string' ? c.emergedDate : today,
      evidence: String(c.evidence).slice(0, 300),
    }));

  const resistanceAreas = safeArray(raw.newResistanceAreas)
    .filter((r: any) => typeof r?.area === 'string' && r.area.length > 10)
    .map((r: any) => ({
      area: String(r.area).slice(0, 200),
      firstObservedDate: typeof r.firstObservedDate === 'string' ? r.firstObservedDate : today,
      lastObservedDate: today,
    }));

  return {
    newGrowthObservations: growth,
    newStuckPoints: stuckPoints,
    updatedStuckPointIds: safeStrArray(raw.updatedStuckPointIds),
    newUnclaimedStrengths: unclaimedStrengths,
    newDevelopedCapacities: developedCapacities,
    newResistanceAreas: resistanceAreas,
    updatedResistanceIds: safeStrArray(raw.updatedResistanceIds),
    resolvedThreadIds: safeStrArray(raw.resolvedThreadIds),
  };
}

const EMPTY_UPDATE: ArcUpdate = {
  newGrowthObservations: [],
  newStuckPoints: [],
  updatedStuckPointIds: [],
  newUnclaimedStrengths: [],
  newDevelopedCapacities: [],
  newResistanceAreas: [],
  updatedResistanceIds: [],
  resolvedThreadIds: [],
};

// ─── Arc Summary Generation ────────────────────────────────────────────────────

/**
 * Generates the "your journey with the Guru" 30-day narrative summary.
 * Written in the Guru's voice. Shown to the user in the Compounding
 * Relationship surface (Layer 13).
 *
 * Only called when the user explicitly requests it or when 30 days
 * have passed since the last summary. Never auto-generated silently
 * without showing the result.
 */
export async function generateArcSummary(
  summaryPrompt: string,
  guruVoice: string,
): Promise<string> {
  try {
    const authHeader = await buildAuthHeader();
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-naksha-auth': authHeader,
      },
      body: JSON.stringify({
        model: ARC_SUMMARY_MODEL,
        max_tokens: 800,
        system: `You are a Guru writing a personal reflection for your student. Write in plain, warm, direct prose — no markdown, no bullets. Your voice: ${guruVoice}`,
        messages: [{ role: 'user', content: summaryPrompt }],
      }),
    }, 25000);

    if (!response.ok) return '';
    const data = await response.json();
    return data.content?.map((b: any) => b.text ?? '').join('') ?? '';
  } catch {
    return '';
  }
}

// ─── Should Generate Summary ───────────────────────────────────────────────────

export function shouldGenerateArcSummary(
  lastSummaryDate: string | null,
  sessionDays: number,
): boolean {
  if (sessionDays < 10) return false; // not enough material
  if (!lastSummaryDate) return true;

  const last = new Date(lastSummaryDate + 'T00:00:00Z');
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
  return daysSince >= 30;
}
