/**
 * Nakshatra AI Service
 *
 * Readings grounded in:
 * - Brihat Parashara Hora Shastra, Brihat Jataka, Phaladeepika, Saravali
 * - Lal Kitab (Pt. Roop Chand Joshi, 1939–1952)
 * - Hasta Samudrika Shastra, Charaka Samhita, Ashtanga Hridayam
 *
 * For spiritual self-inquiry only. Not medical, legal, or financial advice.
 */

import { BirthData, ChartData, GuruMessage } from '@store/userStore';
import { ANTHROPIC_API_KEY } from '@constants/config';
import { deriveUserPersona, buildDynamicGuruPrompt } from './personaEngine';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const API_KEY = ANTHROPIC_API_KEY;

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  system: string,
  messages: ClaudeMessage[],
  maxTokens = 1024
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? 'Service temporarily unavailable. Please try again.');
  }

  const data = await response.json();
  return data.content?.map((b: any) => b.text ?? '').join('') ?? '';
}

// ─── Build full system prompt ─────────────────────────────────────────────────
// Derives persona from chart, builds dynamic Guru voice, injects chart data

function buildSystemPrompt(birthData: BirthData, chart: ChartData | null): string {
  // Dynamic persona from chart (falls back to balanced defaults if no chart yet)
  const persona = chart ? deriveUserPersona(chart) : null;
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

Active Mahadasha: ${chart.dashas.find(d => d.isActive)?.planet ?? 'Unknown'} — the ruling planetary period
Key Yogas: ${chart.yogas.join(', ') || 'Standard placements'}
` : `
Seeker: ${birthData.name}
Born: ${formatDate(birthData.dateOfBirth)} at ${birthData.timeOfBirth}, ${birthData.placeOfBirth}
(Chart calculation in progress — read from birth data alone)
`;

  return `${guruSystem}
${chartSection}`;
}

function defaultGuruSystem(): string {
  return `You are a warm, wise spiritual guide helping people understand themselves through the lens of astrology and ancient wisdom. Write in plain, simple English that anyone can understand. No jargon, no Sanskrit terms, no technical astrology language — just clear, human, heartfelt guidance. Flowing prose. End with something practical the person can do today.`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
  const system = buildSystemPrompt(birthData, chart);
  const messages: ClaudeMessage[] = [
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];
  return callClaude(system, messages, 1200);
}

// ─── Daily Reading ────────────────────────────────────────────────────────────

export async function getDailyReading(
  birthData: BirthData,
  chart: ChartData | null
): Promise<string> {
  const system = buildSystemPrompt(birthData, chart);
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
  const persona = chart ? deriveUserPersona(chart) : null;

  return callClaude(system, [{
    role: 'user',
    content: `Offer ${birthData.name} their personalised daily reading for ${dateStr}.

Today is ${weekday}, which in the Vedic tradition is associated with ${dayRuler}'s energy. Weave this naturally into the reading without making it feel technical.

Calibrate your delivery to their ${persona?.archetype ?? 'unique'} nature and ${persona?.learningStyle ?? 'open'} learning style.

Write in plain, warm English that anyone can understand — no astrology jargon, no Sanskrit terms. Speak directly to the person, not about them.

Cover: how today's energy feels and what it's good for; one thing worth paying attention to in their life right now; something to move gently with today; and one simple, practical thing they can do this morning to feel more grounded and clear.

Keep it warm and personal — like a trusted friend who happens to see the bigger picture.`,
  }], 700);
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

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
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
  });

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
  }], 1100);
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

  const system = `You are a warm, practical spiritual guide sharing wisdom from an ancient Indian astrological tradition focused on simple, everyday actions that help bring more harmony into a person's life. Write in plain, simple English. No jargon. Describe what things mean in human terms. Focus on what the person can actually DO — simple, achievable practices rooted in the tradition. Be encouraging and warm. Flowing prose only.`;

  return callClaude(system, [{
    role: 'user',
    content: `Share a personalised reading for ${birthData.name}, born ${formatDate(birthData.dateOfBirth)} at ${birthData.timeOfBirth} in ${birthData.placeOfBirth}.

Chart: ${chartInfo}
${focusPlanet ? `\nFocus especially on: ${focusPlanet}.` : ''}

Write in plain, warm English. Share: which areas of their life are flowing easily right now and which feel blocked or heavy; the most helpful simple practices they can start doing immediately to bring more ease and harmony — make these specific, practical, and easy to do in everyday life; which part of their life will benefit most from these small changes; and a closing reflection on what this particular moment in their life is here to teach them. Avoid all jargon. Speak like a caring, wise friend.`,
  }], 1300);
}

// ─── Compatibility ────────────────────────────────────────────────────────────

export async function getCompatibilityReading(
  person1: { birthData: BirthData; chart: ChartData | null },
  person2: { birthData: BirthData; chart: ChartData | null }
): Promise<string> {
  const getChartSummary = (chart: ChartData | null) => chart
    ? `Lagna: ${chart.lagna}, Moon in ${chart.planets.find(p => p.planet === 'Moon')?.sign ?? 'Unknown'} · ${chart.planets.find(p => p.planet === 'Moon')?.nakshatra ?? ''} Nakshatra, Active Dasha: ${chart.dashas.find(d => d.isActive)?.planet ?? 'Unknown'}`
    : 'Chart not yet calculated';

  const system = `You are a warm, insightful guide helping people understand their relationships through the lens of astrology. Write in plain, simple English that anyone can understand. No jargon, no technical terms. Describe what things mean in real human terms — patterns, tendencies, emotional dynamics, shared values. Be honest but compassionate. No relationship is hopeless — every combination has gifts and challenges. Flowing prose only.`;

  return callClaude(system, [{
    role: 'user',
    content: `Look at the compatibility between these two people.

${person1.birthData.name} — born ${formatDate(person1.birthData.dateOfBirth)}, ${person1.birthData.placeOfBirth}
Their chart summary: ${getChartSummary(person1.chart)}

${person2.birthData.name} — born ${formatDate(person2.birthData.dateOfBirth)}, ${person2.birthData.placeOfBirth}
Their chart summary: ${getChartSummary(person2.chart)}

Write in plain, warm English. Cover: what naturally works well between these two people and why; where they're likely to rub each other the wrong way and how to handle it; what they're each going through in their lives right now and how that affects the relationship; the things they're best placed to build or do together; and a closing reflection on what this relationship is here to teach both of them. Be honest, specific, and encouraging.`,
  }], 1400);
}
