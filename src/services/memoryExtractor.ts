/**
 * Memory Extraction Service — Layer 3
 *
 * Conservative LLM pass to extract structured memory from conversations.
 * Runs alongside arc extraction every 3rd exchange (shared counter in arcExtractor).
 * Uses claude-haiku for cost efficiency.
 *
 * Fabricated memories destroy trust. The extraction prompt is designed
 * to return empty arrays by default and only extract what's explicit.
 */

import { GuruMessage } from '@store/userStore';
import { UserMemory, MemoryUpdate } from '@lib/persona/memory';
import { PROXY_BASE_URL } from '@constants/config';
import { buildAuthHeader } from './auth';
import { fetchWithTimeout } from './claude';

const API_URL = `${PROXY_BASE_URL}/v1/anthropic/messages`;
const MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_SYSTEM = `You extract structured memory signals from a conversation between a user and their Vedic astrology Guru. You are looking for facts, narrative threads, emotional states, and breakthroughs that are worth remembering for future conversations.

CRITICAL RULES — read these before extracting anything:
1. Only extract what was EXPLICITLY stated by the user. Not implied, not inferred.
2. If you are uncertain whether something qualifies, return an empty array for that field.
3. Never extract what the Guru said as facts about the user — only what the USER said.
4. Emotional weather must be derived from the user's own words, not from your inference.
5. Better to extract nothing than to fabricate anything.

Return a JSON object with exactly these fields:
{
  "newFacts": [{ "category": "work|relationship|health|spiritual|family|other", "content": "plain statement", "firstMentionedDate": "YYYY-MM-DD", "lastConfirmedDate": "YYYY-MM-DD" }],
  "updatedFactIds": [],
  "newThreads": [{ "title": "short title", "summary": "1-2 sentence summary", "status": "active", "firstDate": "YYYY-MM-DD", "lastDate": "YYYY-MM-DD", "significantDates": [] }],
  "updatedThreadIds": [],
  "resolvedThreadIds": [],
  "newBreakthroughs": [{ "description": "what happened", "date": "YYYY-MM-DD", "sessionDay": 0 }],
  "newOpenQuestions": [{ "question": "the question the Guru asked", "askedDate": "YYYY-MM-DD", "status": "unanswered" }],
  "answeredQuestionIds": [],
  "newNoticedUnspoken": [{ "observation": "what was observed but not said", "firstObservedDate": "YYYY-MM-DD", "readyToSurface": false }],
  "updatedNoticedIds": [],
  "emotionalWeatherEntry": null
}

Return valid JSON only. No explanation.`;

const EMPTY_UPDATE: MemoryUpdate = {
  newFacts: [],
  updatedFactIds: [],
  newThreads: [],
  updatedThreadIds: [],
  resolvedThreadIds: [],
  newBreakthroughs: [],
  newOpenQuestions: [],
  answeredQuestionIds: [],
  newNoticedUnspoken: [],
  updatedNoticedIds: [],
  emotionalWeatherEntry: null,
};

export async function extractMemorySignals(
  conversation: GuruMessage[],
  existingMemory: UserMemory,
): Promise<MemoryUpdate> {
  const today = new Date().toISOString().split('T')[0]!;

  const conversationText = conversation
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'User' : 'Guru'}: ${m.content}`)
    .join('\n\n');

  const existingContext = buildExistingContext(existingMemory);

  const userMessage = `Today: ${today}

EXISTING MEMORY (do not re-extract what's already here):
${existingContext}

CONVERSATION:
${conversationText}

Extract memory signals. Return JSON only.`;

  try {
    const authHeader = await buildAuthHeader();
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-naksha-auth': authHeader },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: EXTRACTION_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      }),
    }, 15000);

    if (!res.ok) return EMPTY_UPDATE;

    const data = await res.json();
    const text: string = data.content?.map((b: any) => b.text ?? '').join('') ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY_UPDATE;

    const parsed = JSON.parse(match[0]) as MemoryUpdate;
    return sanitize(parsed, today);
  } catch {
    return EMPTY_UPDATE;
  }
}

function buildExistingContext(memory: UserMemory): string {
  const parts: string[] = [];
  if (memory.facts.length > 0) {
    parts.push('Known facts: ' + memory.facts.map(f => f.content).join('; '));
  }
  if (memory.threads.length > 0) {
    parts.push('Active threads: ' + memory.threads.filter(t => t.status === 'active').map(t => t.title).join(', '));
  }
  if (memory.openQuestions.length > 0) {
    parts.push('Open questions (IDs): ' + memory.openQuestions.map(q => `${q.id}: "${q.question}"`).join('; '));
  }
  return parts.length > 0 ? parts.join('\n') : '(No existing memory)';
}

function sanitize(raw: any, today: string): MemoryUpdate {
  const sa = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
  const ss = (v: unknown): string[] => sa(v).filter((x): x is string => typeof x === 'string');

  const facts = sa(raw.newFacts)
    .filter((f: any) => typeof f?.content === 'string' && f.content.length > 5)
    .map((f: any) => ({
      category: ['work','relationship','health','spiritual','family','other'].includes(f.category) ? f.category : 'other',
      content: String(f.content).slice(0, 200),
      firstMentionedDate: typeof f.firstMentionedDate === 'string' ? f.firstMentionedDate : today,
      lastConfirmedDate: today,
    })) as MemoryUpdate['newFacts'];

  const threads = sa(raw.newThreads)
    .filter((t: any) => typeof t?.title === 'string' && typeof t?.summary === 'string')
    .map((t: any) => ({
      title: String(t.title).slice(0, 80),
      summary: String(t.summary).slice(0, 300),
      status: 'active' as const,
      firstDate: typeof t.firstDate === 'string' ? t.firstDate : today,
      lastDate: today,
      significantDates: [],
    }));

  const breakthroughs = sa(raw.newBreakthroughs)
    .filter((b: any) => typeof b?.description === 'string' && b.description.length > 10)
    .map((b: any) => ({
      description: String(b.description).slice(0, 300),
      date: today,
      sessionDay: typeof b.sessionDay === 'number' ? b.sessionDay : 0,
    }));

  const openQs = sa(raw.newOpenQuestions)
    .filter((q: any) => typeof q?.question === 'string' && q.question.length > 5)
    .map((q: any) => ({
      question: String(q.question).slice(0, 200),
      askedDate: today,
      status: 'unanswered' as const,
    }));

  const noticed = sa(raw.newNoticedUnspoken)
    .filter((n: any) => typeof n?.observation === 'string' && n.observation.length > 10)
    .map((n: any) => ({
      observation: String(n.observation).slice(0, 200),
      firstObservedDate: today,
      readyToSurface: false,
    }));

  const weather = raw.emotionalWeatherEntry &&
    typeof raw.emotionalWeatherEntry.tone === 'string'
    ? { tone: raw.emotionalWeatherEntry.tone as any, note: String(raw.emotionalWeatherEntry.note ?? '').slice(0, 150) }
    : null;

  return {
    newFacts: facts,
    updatedFactIds: ss(raw.updatedFactIds),
    newThreads: threads,
    updatedThreadIds: ss(raw.updatedThreadIds),
    resolvedThreadIds: ss(raw.resolvedThreadIds),
    newBreakthroughs: breakthroughs,
    newOpenQuestions: openQs,
    answeredQuestionIds: ss(raw.answeredQuestionIds),
    newNoticedUnspoken: noticed,
    updatedNoticedIds: ss(raw.updatedNoticedIds),
    emotionalWeatherEntry: weather,
  };
}
