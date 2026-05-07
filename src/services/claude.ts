/**
 * Naksha AI Service
 *
 * Readings grounded in:
 * - Brihat Parashara Hora Shastra, Brihat Jataka, Phaladeepika, Saravali
 * - Lal Kitab (Pt. Roop Chand Joshi, 1939–1952)
 * - Hasta Samudrika Shastra, Charaka Samhita, Ashtanga Hridayam
 *
 * For spiritual self-inquiry only. Not medical, legal, or financial advice.
 */

import { BirthData, ChartData, GuruMessage } from '@store/userStore';
import { PROXY_BASE_URL } from '@constants/config';
import { buildAuthHeader } from './auth';
import { deriveUserPersona, buildDynamicGuruPrompt } from './personaEngine';
import { findActiveDasha } from '@utils/vedic';
import { useGuruRelationshipStore } from '@store/guruRelationshipStore';
import { useGuruArcStore } from '@store/guruArcStore';
import { useGuruMemoryStore } from '@store/guruMemoryStore';
import { useGuruTelemetryStore } from '@store/guruTelemetryStore';
import { tickExchangeCounter, extractArcSignals } from './arcExtractor';
import { extractMemorySignals } from './memoryExtractor';
import { getChineseCompatibility } from '@utils/bazi';
import { assembleGuruSystemPromptParts, assembleDefaultGuruPrompt } from '@lib/persona/promptAssembler';
import { classifyUserMessage, analyzeResponse } from '@lib/persona/guardrails';
import { selectResponseForm, RhythmContext } from '@lib/persona/rhythm';
import { detectTopics } from '@lib/persona/telemetry';

const API_URL = `${PROXY_BASE_URL}/v1/anthropic/messages`;
const MODEL = 'claude-sonnet-4-6';
// Faster model for "list + remedy" style readings where reasoning depth
// isn't required. Sonnet 4.6 takes ~30-35s for 1300 tokens which exceeds
// our request timeout; Haiku 4.5 typically returns the same shape in ~5-10s.
const FAST_MODEL = 'claude-haiku-4-5-20251001';
const REQUEST_TIMEOUT_MS = 30000;
// Palm reading uploads a base64 JPEG (typically 3–7 MB after expo-image-picker
// compresses at quality 0.8). On cellular this can take well over 30s for the
// upload alone before the model even responds, so the palm path gets longer.
const IMAGE_REQUEST_TIMEOUT_MS = 60000;
// Compatibility readings produce 8-Koota analysis + 5 prose sections + a
// Chinese overlay weave; even on Haiku this lands around 25-35s for a
// complete response. Give it the same 60s budget as palm so users see
// the reading instead of a "took too long" error.
const LONG_READING_TIMEOUT_MS = 60000;

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// fetchWithTimeout moved to ./http to break a require cycle with the
// arcExtractor/memoryExtractor modules. Re-exported here for any external
// caller that imports it from this file.
export { fetchWithTimeout } from './http';
import { fetchWithTimeout } from './http';

async function callClaude(
  system: string,
  messages: ClaudeMessage[],
  maxTokens = 1024,
  // When provided, `system` is split into [cacheableSystemPrefix, system] and
  // sent as two text blocks with cache_control on the first. Anthropic caches
  // the prefix bytes for 5 minutes; subsequent calls with the same prefix pay
  // ~10% of the input-token cost on cache hits.
  cacheableSystemPrefix?: string,
  // Override the default Sonnet model. Used by readings that don't need
  // Sonnet's reasoning depth (Lal Kitab remedies, future fast paths).
  model: string = MODEL,
  // Per-call timeout override. Default 30s; long-form readings
  // (compatibility, palm) bump this to allow the model time to complete.
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<string> {
  const authHeader = await buildAuthHeader();

  const systemPayload = cacheableSystemPrefix
    ? [
        { type: 'text', text: cacheableSystemPrefix, cache_control: { type: 'ephemeral' } },
        ...(system ? [{ type: 'text', text: system }] : []),
      ]
    : system;

  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-naksha-auth': authHeader,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPayload, messages }),
  }, timeoutMs);

  if (!response.ok) {
    let errMessage = 'Service temporarily unavailable. Please try again.';
    if (response.status === 401) errMessage = 'App authentication failed.';
    else if (response.status === 429) errMessage = 'Daily request limit reached. Please try again tomorrow.';
    else if (response.status === 529 || response.status === 503) {
      errMessage = 'Our AI is experiencing heavy load right now. Please try again in a minute.';
    }
    try {
      const err = await response.json();
      // Only override with API message if it's not an overload — those messages aren't user-friendly
      if (err.error?.message && response.status !== 529 && response.status !== 503) {
        errMessage = err.error.message;
      }
    } catch { /* response wasn't JSON */ }
    throw new Error(errMessage);
  }

  const data = await response.json();
  return data.content?.map((b: any) => b.text ?? '').join('') ?? '';
}

// ─── Build full system prompt ─────────────────────────────────────────────────
// Derives persona from chart, builds dynamic Guru voice, injects chart data

function buildSystemPrompt(
  birthData: BirthData,
  chart: ChartData | null,
  phaseBlock?: string,
  arcBlock?: string,
  precomputedPersona?: ReturnType<typeof deriveUserPersona> | null,
): string {
  // Dynamic persona from chart (falls back to balanced defaults if no chart yet).
  // Callers that already need persona for other purposes (e.g. getDailyReading)
  // can pass it in to avoid re-deriving.
  const persona = precomputedPersona !== undefined
    ? precomputedPersona
    : (chart ? deriveUserPersona(chart) : null);
  const guruSystem = persona
    ? buildDynamicGuruPrompt(persona as any)
    : defaultGuruSystem();

  const chartSection = chart ? `
═══════════════════════════════
THEIR VEDIC BIRTH CHART
(Lahiri Ayanamsha · Whole Sign · per Brihat Parashara Hora Shastra)
═══════════════════════════════
Seeker: ${birthData.name}
Born: ${formatDate(birthData.dateOfBirth)} at ${birthData.timeOfBirth}, ${birthData.placeOfBirth}

Lagna (Ascendant): ${chart.lagna} — the soul's lens on life and the body's constitution
Navamsha Lagna: ${chart.navamshaLagna} — the dharmic compass of the soul

Planetary Positions:
${chart.planets.map(p =>
  `${p.planet}: ${p.sign}, House ${p.house}, ${p.nakshatra} Nakshatra pada ${p.pada}${p.isRetrograde ? ' ℞' : ''}${p.isExalted ? ' (exalted)' : p.isDebilitated ? ' (debilitated)' : ''}`
).join('\n')}

Active Mahadasha: ${findActiveDasha(chart.dashas)?.planet ?? 'Unknown'} — the ruling planetary period
Key Yogas: ${chart.yogas.join(', ') || 'Standard placements'}
` : `
Seeker: ${birthData.name}
Born: ${formatDate(birthData.dateOfBirth)} at ${birthData.timeOfBirth}, ${birthData.placeOfBirth}
(Chart calculation in progress — read from birth data alone)
`;

  const phaseSection = phaseBlock ? `\n${phaseBlock}` : '';
  const arcSection = arcBlock ? `\n\n${arcBlock}` : '';

  return `${guruSystem}${phaseSection}${arcSection}
${chartSection}`;
}

function defaultGuruSystem(): string {
  return `You are a warm, wise spiritual guide helping people understand themselves through the lens of astrology and ancient wisdom. Write in plain, simple English that anyone can understand. No jargon, no Sanskrit terms, no technical astrology language — just clear, human, heartfelt guidance. Flowing prose only — no markdown formatting, no # headers, no **bold**, no bullet points. End with something practical the person can do today.`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  } catch { return dateStr; }
}

// ─── Guru Chat ────────────────────────────────────────────────────────────────

export async function askGuru(
  question: string,
  history: GuruMessage[],
  birthData: BirthData,
  chart: ChartData | null
): Promise<string> {
  const relationshipStore = useGuruRelationshipStore.getState();
  const arcStore = useGuruArcStore.getState();
  const memoryStore = useGuruMemoryStore.getState();
  const telemetryStore = useGuruTelemetryStore.getState();

  // Classify user message for special handling (crisis, parasocial, etc.)
  const messageClass = classifyUserMessage(question);

  // Build rhythm context for response form selection
  const rhythmContext: RhythmContext = {
    phase: relationshipStore.getEffectivePhase(),
    archetype: 'jupiter_sage', // will be derived in assembler from chart
    recentFormHistory: [],
    userMessageLength: question.length,
    isHeavyEmotionalContent: question.length > 200 && /feel|sad|lost|afraid|anxious|hurt|grief|pain/i.test(question),
    isRepeatTopic: false,
    sessionTurnCount: history.filter(m => m.role === 'user').length,
    hasPriorConversationMaterial: arcStore.growthObservations.length > 0 || memoryStore.threads.length > 0,
  };

  let system: string;
  let cacheablePrefix: string | undefined;

  if (chart) {
    const parts = assembleGuruSystemPromptParts({
      birthData,
      chart,
      phaseState: {
        phase: relationshipStore.phase,
        sessionDays: relationshipStore.sessionDays,
        lastSessionDate: relationshipStore.lastSessionDate,
        phaseEnteredDate: relationshipStore.phaseEnteredDate,
        justTransitioned: relationshipStore.justTransitioned,
        previousPhase: relationshipStore.previousPhase,
      },
      arc: arcStore,
      memory: memoryStore,
      rhythmContext,
      messageClass,
      sessionTurnCount: rhythmContext.sessionTurnCount,
    });
    cacheablePrefix = parts.stablePrefix;
    system = parts.dynamicSuffix;
  } else {
    system = assembleDefaultGuruPrompt(birthData);
  }

  const messages: ClaudeMessage[] = [
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  let response = await callClaude(system, messages, 1400, cacheablePrefix);

  // Guardrails: one regen pass if response has problems
  if (chart && messageClass === 'normal') {
    const activeDashaPlanet = findActiveDasha(chart.dashas)?.planet;
    const hasChartRef = response.includes(chart.lagna) ||
      chart.planets.some(p => response.includes(p.planet)) ||
      (!!activeDashaPlanet && response.includes(activeDashaPlanet));
    const guardResult = analyzeResponse(response, 'jupiter_sage', hasChartRef);
    if (!guardResult.passes && guardResult.regenerationInstruction) {
      const regenSystem = system + `\n\n${guardResult.regenerationInstruction}`;
      // Reuse the cacheable prefix on the regen so we still hit the prompt cache.
      response = await callClaude(regenSystem, messages, 1400, cacheablePrefix).catch(() => response);
    }
  }

  // Record the session day after a successful exchange
  relationshipStore.recordSession();
  if (relationshipStore.justTransitioned) {
    relationshipStore.clearTransitionFlag();
  }

  // Post-conversation processing — fire-and-forget
  if (tickExchangeCounter()) {
    const sessionDay = useGuruRelationshipStore.getState().sessionDays;
    const allMessages = [
      ...history.slice(-20),
      { id: '', role: 'user' as const, content: question, timestamp: new Date().toISOString() },
      { id: '', role: 'assistant' as const, content: response, timestamp: new Date().toISOString() },
    ];

    // Arc extraction
    extractArcSignals(allMessages, arcStore, sessionDay).then((update) => {
      const hasUpdate = Object.values(update).some(v => Array.isArray(v) && v.length > 0);
      if (hasUpdate) useGuruArcStore.getState().applyArcUpdate(update);
    }).catch(() => {});

    // Memory extraction
    extractMemorySignals(allMessages, memoryStore).then((update) => {
      const hasUpdate = Object.values(update).some(v =>
        Array.isArray(v) ? v.length > 0 : v != null
      );
      if (hasUpdate) useGuruMemoryStore.getState().applyMemoryUpdate(update);
    }).catch(() => {});
  }

  // Telemetry — lightweight, synchronous
  telemetryStore.recordSession({
    turnCount: 1,
    totalChars: question.length,
    responseFormHistory: [selectResponseForm(rhythmContext)],
    userMessages: [question],
  });

  return response;
}

// ─── Daily Reading ────────────────────────────────────────────────────────────

export async function getDailyReading(
  birthData: BirthData,
  chart: ChartData | null
): Promise<string> {
  // Derive persona once and reuse — both buildSystemPrompt and the user-content
  // template need it, and the derivation iterates planets / computes dosha.
  const persona = chart ? deriveUserPersona(chart) : null;
  const system = buildSystemPrompt(birthData, chart, undefined, undefined, persona);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const WEEKDAY_PLANETS: Record<string, string> = {
    Sunday: 'Sun (Surya)', Monday: 'Moon (Chandra)', Tuesday: 'Mars (Mangala)',
    Wednesday: 'Mercury (Budha)', Thursday: 'Jupiter (Guru)',
    Friday: 'Venus (Shukra)', Saturday: 'Saturn (Shani)',
  };
  const dayRuler = WEEKDAY_PLANETS[weekday] ?? 'the planetary council';
  const firstName = birthData.name.split(' ')[0] ?? birthData.name;

  // Chandra Bala — adds Moon-transit favourability flavour to the prompt.
  // Cached service so a second call within the day is free. Swallows any
  // failure so a flaky API doesn't block the reading.
  const chandraBalaLine = await getChandraBalaPromptLine(birthData, today);

  // The whole system prompt here is stable per (user, chart) — birth data,
  // planets, persona derivation. Cache the entire thing as the prefix so a
  // user opening their daily reading twice in a 5-minute window pays cached
  // input pricing on the second call.
  return callClaude('', [{
    role: 'user',
    content: `Offer ${firstName} their personalised daily reading for ${dateStr}.

Today is ${weekday}, which in the Vedic tradition is associated with ${dayRuler}'s energy. Weave this naturally into the reading without making it feel technical.
${chandraBalaLine ? `\nMoon-transit context (use as flavour, never name rasis directly to the user): ${chandraBalaLine}\n` : ''}
Calibrate your delivery to their ${persona?.archetype ?? 'unique'} nature and ${persona?.learningStyle ?? 'open'} learning style.

Write in plain, warm English that anyone can understand — no astrology jargon, no Sanskrit terms. Speak directly to the person, not about them.

Cover: how today's energy feels and what it's good for; one thing worth paying attention to in their life right now; something to move gently with today; and one simple, practical thing they can do this morning to feel more grounded and clear.

Keep it warm and personal — like a trusted friend who happens to see the bigger picture. Address ${firstName} by first name naturally within the reading (not at the very start as a salutation, but woven in once or twice). Do not use markdown formatting — no #, **, or bullet points. Plain prose only.`,
  }], 700, system);
}

// ─── Palm Reading ─────────────────────────────────────────────────────────────

export async function analyzePalm(
  base64Image: string,
  birthData: BirthData,
  hand: 'left' | 'right'
): Promise<string> {
  const handContext = hand === 'left'
    ? 'the left hand — which in Hasta Samudrika Shastra reveals karma inherited from past lives, soul tendencies, and the blueprint of constitution at birth'
    : 'the right hand — which reveals what the soul is actively building: the karma being shaped through present-life choices and dharmic effort';

  const authHeader = await buildAuthHeader();
  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-naksha-auth': authHeader,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1400,
      system: `You are a warm, grounded palm reader using the ancient Indian tradition of reading palms — studying the lines, shapes, and features of the hand to understand a person's nature, tendencies, and life path.

You are examining ${handContext} of ${birthData.name}, born ${formatDate(birthData.dateOfBirth)}.

Read the main lines of the hand (the heart line showing emotional life and relationships, the head line showing how they think and make decisions, the life line showing vitality and major life changes, the fate line showing career and life direction, the sun line showing success and recognition) and the prominent raised areas of the palm (which reveal natural strengths and personality traits).

Write in plain, warm English that anyone can understand. Be specific to what you actually see in the image. Never make alarming predictions — everything is framed as insight and opportunity. End with one practical suggestion for how this person can consciously work with what their palm reveals.`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
          { type: 'text', text: `Please read my ${hand} hand according to Hasta Samudrika Shastra. Share what my palm reveals about my nature, dharma, and the path ahead.` },
        ],
      }],
    }),
  }, IMAGE_REQUEST_TIMEOUT_MS);

  if (!response.ok) throw new Error('Palm reading service temporarily unavailable.');
  const data = await response.json();
  return data.content?.map((b: any) => b.text ?? '').join('') ?? '';
}

// ─── Numerology ───────────────────────────────────────────────────────────────

export async function getNumerologyReading(
  birthData: BirthData,
  name: string,
  numbers: {
    lifePathNumber: number;
    destinyNumber: number;
    soulUrgeNumber: number;
    personalityNumber: number;
    birthdayNumber: number;
  }
): Promise<string> {
  const PLANET_FOR_NUMBER: Record<number, string> = {
    1: 'Sun (Surya)', 2: 'Moon (Chandra)', 3: 'Jupiter (Guru)',
    4: 'Rahu', 5: 'Mercury (Budha)', 6: 'Venus (Shukra)',
    7: 'Ketu', 8: 'Saturn (Shani)', 9: 'Mars (Mangala)',
    11: 'Moon — master intuition vibration', 22: 'Rahu — master builder vibration',
    33: 'Jupiter — master teacher vibration',
  };

  const system = `You are a warm, insightful guide helping people understand themselves through numerology. Write in plain, simple English that anyone can understand. No jargon. Describe what each number MEANS in real human terms — not just what it is called. Be specific to this person's numbers, not generic. Speak in flowing prose. End with a simple reflection or affirmation they can carry with them.`;

  // 5 numbers × 1 paragraph each + a closing reflection lands around
  // 1100 tokens, which means the previous Sonnet @1100 cap was hitting
  // max_tokens (verified live, stop_reason: max_tokens at exactly 1100).
  // Switch to Haiku — same prose-style content, faster (~15s vs ~28s),
  // and a higher cap so the closing reflection actually fits.
  return callClaude(system, [{
    role: 'user',
    content: `Read the numerology of ${name}, born ${formatDate(birthData.dateOfBirth)}.

Their core numbers and what they represent:
- Life path number ${numbers.lifePathNumber} — the main current of energy running through their life, the kind of experiences they're here to have
- Destiny number ${numbers.destinyNumber} — what they're here to build and become over their lifetime
- Soul urge number ${numbers.soulUrgeNumber} — what their heart most deeply longs for beneath the surface
- Personality number ${numbers.personalityNumber} — how other people naturally tend to see and experience them
- Birthday number ${numbers.birthdayNumber} — a natural gift or talent they were born with

Write in plain English. Help them understand the deeper pattern connecting these numbers — what story they tell together about who this person is, what drives them, what they find meaningful, and what they're still growing into. Be specific and encouraging. Close with a simple daily reflection suited to their life path number.`,
  }], 1400, undefined, FAST_MODEL);
}

// ─── Chinese Astrology ────────────────────────────────────────────────────────

export async function getChineseReading(
  birthData: BirthData,
  zodiacAnimal: string,
  element: string,
  baziPillars: string
): Promise<string> {
  const system = `You are a warm, insightful guide helping people understand themselves through Chinese astrology. Write in plain, simple English that anyone can understand — no technical terms, no Chinese astrology jargon. Describe what things mean, not what they are called. Be specific to this person's chart. Flowing prose only. No bullet points.`;

  return callClaude(system, [{
    role: 'user',
    content: `Read the Chinese astrology of ${birthData.name}, born ${formatDate(birthData.dateOfBirth)}.

Their profile: ${zodiacAnimal} sign, ${element} energy type.

Write in plain, warm English. Cover: what their animal sign and elemental type reveal about their core nature and how they move through the world; their strengths and the patterns they tend to get stuck in; what the energy of ${new Date().getFullYear()} is like for them personally and how to make the most of it; and one simple, practical thing they can do to feel more in flow this year. Be specific and encouraging.`,
  }], 1100);
}

// ─── Lal Kitab ────────────────────────────────────────────────────────────────

export async function getLalKitabReading(
  birthData: BirthData,
  chart: ChartData | null,
  focusPlanet?: string
): Promise<string> {
  const chartInfo = chart
    ? `Lagna: ${chart.lagna}\nPlanetary positions: ${chart.planets.map(p =>
        `${p.planet} in ${p.sign}, House ${p.house}${p.isRetrograde ? ' (retrograde)' : ''}`
      ).join('; ')}`
    : 'Chart not yet fully calculated';

  const system = `You are a warm, practical spiritual guide sharing wisdom from an ancient Indian astrological tradition focused on simple, everyday actions that help bring more harmony into a person's life. Write in plain, simple English. No jargon. Describe what things mean in human terms. Focus on what the person can actually DO — simple, achievable practices rooted in the tradition. Be encouraging and warm. Flowing prose only — absolutely no markdown formatting (no #, ##, ### headers; no **bold**; no bullet points; no horizontal rules). Plain paragraphs separated by blank lines.`;

  // Lal Kitab readings are remedies + reflection in flowing prose — no deep
  // reasoning chain needed. Haiku is fast enough (~17s for 1300 tokens) to
  // stay well under REQUEST_TIMEOUT_MS while letting the model complete the
  // 4-section ask without hitting max_tokens. Earlier 900-cap was truncating
  // mid-sentence (stop_reason: max_tokens, verified live).
  return callClaude(system, [{
    role: 'user',
    content: `Share a personalised reading for ${birthData.name}, born ${formatDate(birthData.dateOfBirth)} at ${birthData.timeOfBirth} in ${birthData.placeOfBirth}.

Chart: ${chartInfo}
${focusPlanet ? `\nFocus especially on: ${focusPlanet}.` : ''}

Write in plain, warm English. Share: which areas of their life are flowing easily right now and which feel blocked or heavy; the most helpful simple practices they can start doing immediately to bring more ease and harmony — make these specific, practical, and easy to do in everyday life; which part of their life will benefit most from these small changes; and a closing reflection on what this particular moment in their life is here to teach them. Avoid all jargon. Speak like a caring, wise friend.`,
  }], 1400, undefined, FAST_MODEL);
}

// ─── Compatibility ────────────────────────────────────────────────────────────

import type { AshtaKootaData } from './prokerala';
import { getChandraBalaPromptLine } from '@lib/chandraBala';

export async function getCompatibilityReading(
  person1: { birthData: BirthData; chart: ChartData | null },
  person2: { birthData: BirthData; chart: ChartData | null },
  ashtaKoota: AshtaKootaData | null = null,
): Promise<string> {
  const getChartSummary = (bd: BirthData, chart: ChartData | null) => {
    if (!chart) return `Born ${formatDate(bd.dateOfBirth)} at ${bd.timeOfBirth}, ${bd.placeOfBirth} (chart not calculated)`;
    const moon = chart.planets?.find(p => p.planet === 'Moon');
    const planets = chart.planets?.map(p => `${p.planet}: ${p.sign}, House ${p.house}${p.nakshatra ? `, ${p.nakshatra}` : ''}`).join('\n') ?? '';
    return `Born ${formatDate(bd.dateOfBirth)} at ${bd.timeOfBirth}, ${bd.placeOfBirth}
Lagna: ${chart.lagna}
Moon: ${moon?.sign ?? 'Unknown'} · ${moon?.nakshatra ?? 'Unknown'} Nakshatra, pada ${moon?.pada ?? 1}
Planets:\n${planets}
Active Dasha: ${findActiveDasha(chart.dashas)?.planet ?? 'Unknown'}
Yogas: ${chart.yogas?.join(', ') || 'Standard placements'}`;
  };

  // Compute the BaZi / Chinese astrology overlay locally — pure function, deterministic.
  // We pass the result into the prompt so the LLM can weave both traditions in one reading
  // instead of bolting Chinese on as a separate paragraph.
  let chineseBlock = '';
  try {
    const ch = getChineseCompatibility(person1.birthData.dateOfBirth, person2.birthData.dateOfBirth);
    chineseBlock = `═══ Chinese / BaZi overlay (precomputed) ═══
${person1.birthData.name}: Year zodiac ${ch.yourZodiac} (${ch.yourZodiacChar}) · Day Master ${ch.yourDayMaster} · Day-element ${ch.yourDayElement}
${person2.birthData.name}: Year zodiac ${ch.partnerZodiac} (${ch.partnerZodiacChar}) · Day Master ${ch.partnerDayMaster} · Day-element ${ch.partnerDayElement}
Zodiac match level: ${ch.zodiacLevel}
Day-element interplay: ${ch.elementInterplay} — ${ch.elementInterplayDescription}
`;
  } catch {
    // No Chinese block if dates can't be parsed — Vedic reading still proceeds.
  }

  // Authoritative Ashta-koota score from Prokerala when available. The UI
  // shows the per-koota breakdown card directly above this prose, so we no
  // longer ask Claude to calculate or display a score — the prose is now
  // pure interpretation, anchored to the deterministic numbers above.
  let ashtaBlock = '';
  if (ashtaKoota) {
    const lines = ashtaKoota.areas.map(a =>
      `${a.name}: ${a.obtainedPoints}/${a.maximumPoints} — ${person1.birthData.name} ${a.girlBucket} vs ${person2.birthData.name} ${a.boyBucket}`,
    ).join('\n');
    ashtaBlock = `═══ Ashtakoota Milan (precomputed, deterministic) ═══
Total: ${ashtaKoota.totalPoints}/${ashtaKoota.maximumPoints}
Verdict: ${ashtaKoota.verdict}
${lines}
`;
  }

  const system = `You are a warm, insightful guide helping people understand their relationships through both Vedic (Ashtakoota Milan) and Chinese (BaZi) astrological analysis.

The Ashtakoota score is provided in the user message — do NOT recalculate it, do NOT print "SCORE: X/36", and do NOT list all 8 kootas with numbers (the UI already shows the breakdown above your reading). Your job is the interpretation: what the strong matches give the relationship, what the weaker areas ask the couple to work with, and how the living chart context (dasha periods, Chinese overlay) shapes the present moment.

Write in plain, warm English that anyone can understand. No jargon. Be honest but compassionate. Plain prose only — no markdown formatting (no #, ##, ### headers; no **bold**; no horizontal rules; no bullet lists). Use plain paragraphs separated by blank lines.`;

  // Compatibility was on Sonnet @1800 — taking ~40s and truncating
  // (stop_reason: max_tokens). The 30s app timeout fired before the
  // response arrived, so users saw the timeout error and never the reading.
  // Switched to Haiku with a 2400-token cap and the long-reading 60s
  // timeout. Tightened the prompt to ask for "key Koota highlights"
  // instead of all 8, which keeps the reading complete in 25-30s on Haiku.
  return callClaude(system, [{
    role: 'user',
    content: `Interpret the compatibility between these two people. The Ashtakoota score and the 8-koota breakdown are provided below — your job is to translate what those numbers mean for this couple, not to repeat them.

═══ Person 1 ═══
${person1.birthData.name}
${getChartSummary(person1.birthData, person1.chart)}

═══ Person 2 ═══
${person2.birthData.name}
${getChartSummary(person2.birthData, person2.chart)}
${ashtaBlock ? '\n' + ashtaBlock : ''}${chineseBlock ? '\n' + chineseBlock : ''}
Open with what naturally draws these two together — the strongest 2-3 areas of the breakdown above and what those mean in everyday relationship life (use plain English, never the Sanskrit names).

Then cover: their deepest compatibility strengths; the 1-2 weakest areas and what they ask the couple to be patient and intentional about; how their current life phases (Mahadasha periods) affect the relationship right now; and a few practical, specific things they can do to build a strong relationship together.

Where the Chinese overlay reinforces or contrasts the Vedic reading, weave it in — for example, if the year zodiacs sit in a classic supportive triad or if the day-master elements are in a generating/controlling cycle. Use it to enrich the reading, never to contradict the Vedic core.

Be honest, specific to their charts, and encouraging. Keep it tight — every sentence should earn its place. Do NOT begin with "SCORE:" or any numeric header — the UI already shows the score above your reading.`,
  }], 2400, undefined, FAST_MODEL, LONG_READING_TIMEOUT_MS);
}

// ─── Tarot Reading ────────────────────────────────────────────────────────────

import type { DrawnCard, SpreadType } from '@utils/tarot';

export async function getTarotReading(
  question: string,
  spread: SpreadType,
  drawn: DrawnCard[],
  birthData: BirthData | null,
  chart: ChartData | null,
): Promise<string> {
  const cardsBlock = drawn.map((d, i) => {
    const orientation = d.reversed ? 'reversed' : 'upright';
    const meaning = d.reversed ? d.card.reversed : d.card.upright;
    return `${i + 1}. ${d.position}: ${d.card.name} (${orientation}) — ${meaning}`;
  }).join('\n');

  const chartContext = (() => {
    if (!birthData || !chart) return '';
    const moon = chart.planets?.find(p => p.planet === 'Moon');
    const sun = chart.planets?.find(p => p.planet === 'Sun');
    const dasha = findActiveDasha(chart.dashas);
    return `\nQuerent context (use lightly to personalise — do not let it override the cards):
- Lagna: ${chart.lagna}
- Moon sign: ${moon?.sign ?? '—'} (${moon?.nakshatra ?? '—'} nakshatra)
- Sun sign: ${sun?.sign ?? '—'}
- Active Mahadasha: ${dasha?.planet ?? '—'}`;
  })();

  const spreadLabel = spread === 'single' ? 'Single Card draw' : 'Three-Card spread (Past / Present / Future)';

  const system = `You are a thoughtful tarot reader rooted in the Rider-Waite-Smith tradition. You read the cards as they fall — honest, specific, neither doom-laden nor saccharine. You trust the querent to handle truth delivered with care.

When the querent provides chart context, use it lightly: the cards lead, the chart adds texture (e.g. how this lands during a Saturn period vs a Jupiter period). Never let astrology override the actual cards.

Write in plain, warm English. No jargon. No bullet lists in the body — speak in paragraphs that flow.`;

  const user = `${spreadLabel}.

Question: ${question.trim() || '(No specific question — open reading.)'}

Cards drawn:
${cardsBlock}
${chartContext}

Read the spread. Begin with one short paragraph of the overall message, then walk through each position naming the card and its meaning in this specific question. End with one grounded, actionable reflection — something the querent can actually do or notice in the next few days. Honour reversed cards as nuance (challenge, internalisation, delay) rather than disasters.

Keep it tight: ~250-400 words total.`;

  return callClaude(system, [{ role: 'user', content: user }], 1200);
}
