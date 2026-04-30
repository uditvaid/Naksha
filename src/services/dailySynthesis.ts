/**
 * Daily Layer 4 — Daily Synthesis
 *
 * Generates the daily message in the Guru's voice using the Persona Engine.
 * Three depth levels: notification (1 sentence), card (50-80 words),
 * expanded (3-5 paragraphs with action/question/callback).
 *
 * ENGAGEMENT REQUIREMENTS:
 * - ~1 in 10 dailies: callback to something from 2-4 weeks ago
 * - ~1 in 20 dailies: "deep day" — substantially more depth
 * - Form varies: reflective, warning, celebration, practical, quiet
 * - Always ends with: a question, a micro-practice, or an invitation
 * - Never ends with a summary
 */

import { BirthData, ChartData } from '@store/userStore';
import { PROXY_BASE_URL } from '@constants/config';
import { buildAuthHeader } from './auth';
import { deriveArchetype } from '@lib/persona/archetype';
import { getBible } from '@lib/persona/bibles';
import { computeDailySignals, DailySignalSet } from '@lib/daily/signals';
import { filterSignals, FilteredSignals } from '@lib/daily/relevance';
import { EngagementProfile } from '@lib/daily/engagementProfile';
import { DailyRecord } from '@store/dailyContinuityStore';
import { checkDailyGuardrails } from '@lib/daily/guardrails';
import { buildChartContextBlock } from '@lib/persona/chartContext';
import { deriveUserPersona } from './personaEngine';

const API_URL = `${PROXY_BASE_URL}/v1/anthropic/messages`;
const MODEL = 'claude-sonnet-4-6';

export interface DailyOutput {
  notification: string;  // 1 sentence, ≤100 chars
  card: string;          // 50-80 words
  expanded: string;      // 3-5 paragraphs
  tone: string;
  isQuietDay: boolean;
  isDeepDay: boolean;
  hasCallback: boolean;
}

// ─── Deterministic Day Features ────────────────────────────────────────────────

function isDeepDay(date: Date, sessionDays: number): boolean {
  // Roughly 1 in 20 — deterministic from date + user seed
  const seed = date.getDate() + date.getMonth() * 31 + sessionDays;
  return seed % 20 === 0;
}

function shouldIncludeCallback(date: Date, sessionDays: number): boolean {
  // Roughly 1 in 10 — only if user has enough history
  if (sessionDays < 14) return false;
  const seed = date.getDate() * 7 + date.getMonth() + sessionDays;
  return seed % 10 === 0;
}

// ─── Prompt Building ───────────────────────────────────────────────────────────

function buildDailyPrompt(
  birthData: BirthData,
  chart: ChartData,
  filtered: FilteredSignals,
  signalSet: DailySignalSet,
  profile: EngagementProfile,
  callbackCandidate: DailyRecord | null,
  isDeep: boolean,
  date: Date,
): string {
  const archetype = deriveArchetype(chart);
  const bible = getBible(archetype.key);
  const persona = deriveUserPersona(chart);
  const chartContext = buildChartContextBlock(chart, birthData);

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const primarySignals = filtered.primary.map(s =>
    `- ${s.title}: ${s.description} (significance: ${Math.round(s.significance * 100)}%)`
  ).join('\n');

  const callbackSection = callbackCandidate
    ? `\nCALLBACK OPPORTUNITY (weave this in naturally, not as an announcement):\n"${callbackCandidate.card.slice(0, 150)}..." — from ${callbackCandidate.date}`
    : '';

  return `You are the Guru generating today's daily message for ${birthData.name}.

GURU ARCHETYPE: ${archetype.name}
YOUR VOICE: ${bible.voiceRegister}

SEEKER PROFILE:
- Chart: ${chart.lagna} Lagna, ${persona.dosha} constitution
- Dasha: ${signalSet.mahadasha} Mahadasha${signalSet.antardasha ? ` / ${signalSet.antardasha} Antardasha` : ''}
- Preferred length: ${profile.preferredLength}
- Tone that resonates most: ${filtered.suggestedTone}

TODAY: ${dateStr}
${primarySignals}

${chartContext}

NARRATIVE SEED: ${filtered.narrativeSeed}
${callbackSection}

THIS IS ${signalSet.isQuietDay ? 'A QUIET DAY — BE HONEST ABOUT THAT' : isDeep ? 'A DEEP DAY — GIVE MORE THAN USUAL' : 'A STANDARD DAY'}

Generate three versions of today's daily message. Return a JSON object with exactly these fields:

{
  "notification": "One sentence, under 100 characters. Intriguing but never clickbait. Must stand alone.",
  "card": "One paragraph, 50-80 words. Shown when the app opens. No markdown. Plain prose.",
  "expanded": "3-5 paragraphs. Covers: (1) what today's energy is and what it's good for, (2) one specific thing worth paying attention to, (3) one thing to move gently with, (4) a connection to a longer arc if relevant${callbackCandidate ? ', (5) a callback to the earlier moment listed above (woven in naturally)' : ''}. Must end with EITHER a question to sit with, a micro-practice for today, or an invitation to reflect or discuss. NEVER ends with a summary. No markdown. Plain prose.",
  "tone": "${filtered.suggestedTone}"
}

RULES:
- Reference at least one specific chart fact or honestly say the day is quiet
- No predicted external events — only internal orientation
- No flattery or sycophancy
- No "the universe is guiding you" type language
- No markdown formatting
- Speak directly to ${birthData.name.split(' ')[0]} (use first name once or twice, not as salutation)
- Write in your archetype's voice: ${archetype.teachingMethod}

Return valid JSON only.`;
}

// ─── Main Generation ───────────────────────────────────────────────────────────

export async function generateDaily(
  birthData: BirthData,
  chart: ChartData,
  profile: EngagementProfile,
  callbackCandidate: DailyRecord | null,
  sessionDays: number,
  date: Date = new Date(),
): Promise<DailyOutput> {
  const signalSet = computeDailySignals(chart, date);
  const memory = { facts: [], threads: [], breakthroughs: [], preferences: {}, openQuestions: [], noticedButUnspoken: [], recentEmotionalWeather: [], lastExtractionDate: null };
  const filtered = filterSignals(signalSet, profile, memory);

  const deep = isDeepDay(date, sessionDays);
  const withCallback = shouldIncludeCallback(date, sessionDays) && callbackCandidate !== null;

  const prompt = buildDailyPrompt(
    birthData, chart, filtered, signalSet, profile,
    withCallback ? callbackCandidate : null,
    deep, date,
  );

  try {
    const authHeader = await buildAuthHeader();
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-naksha-auth': authHeader },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: 'You generate daily astrological guidance messages. Return valid JSON only. No explanation, no markdown around the JSON.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error('Daily generation failed');

    const data = await res.json();
    const text: string = data.content?.map((b: any) => b.text ?? '').join('') ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);

    // Guardrails check
    const guardResult = checkDailyGuardrails(parsed.expanded ?? '', signalSet.isQuietDay);
    let expanded = parsed.expanded ?? '';
    if (!guardResult.passes) {
      // One regen attempt with feedback
      const regenRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-naksha-auth': authHeader },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: 'You regenerate a daily message to fix specific problems. Return only the corrected "expanded" text as plain JSON: {"expanded": "..."}',
          messages: [{ role: 'user', content: `Original:\n${expanded}\n\nProblems:\n${guardResult.issues.join('\n')}\n\nFix and return JSON.` }],
        }),
      }).catch(() => null);

      if (regenRes?.ok) {
        const rd = await regenRes.json();
        const rt = rd.content?.map((b: any) => b.text ?? '').join('') ?? '';
        const rm = rt.match(/\{[\s\S]*\}/);
        if (rm) expanded = JSON.parse(rm[0]).expanded ?? expanded;
      }
    }

    return {
      notification: (parsed.notification ?? filtered.narrativeSeed).slice(0, 100),
      card: parsed.card ?? filtered.narrativeSeed,
      expanded,
      tone: parsed.tone ?? filtered.suggestedTone,
      isQuietDay: signalSet.isQuietDay,
      isDeepDay: deep,
      hasCallback: withCallback,
    };
  } catch (err) {
    // Fallback — honest quiet-day message
    return {
      notification: `Today is a ${signalSet.isQuietDay ? 'quiet' : 'steady'} day in your ${signalSet.mahadasha} period.`,
      card: `The ${signalSet.mahadasha} current continues today. ${filtered.narrativeSeed}`,
      expanded: `${filtered.narrativeSeed} The ${signalSet.mahadasha} period carries its characteristic energy: consistent, cumulative, and asking for steady attention rather than dramatic action.\n\nWhat one small thing, done today, would feel like an honest expression of where you are right now?`,
      tone: 'reflective',
      isQuietDay: signalSet.isQuietDay,
      isDeepDay: false,
      hasCallback: false,
    };
  }
}
