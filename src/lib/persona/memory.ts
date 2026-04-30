/**
 * Layer 3 — User Memory Store (Relational, Not Just Factual)
 *
 * Structured memory schema. NOT raw chat history.
 * Memory extraction runs conservatively after each conversation.
 * Hallucinated memories destroy trust. When in doubt, extract nothing.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MemoryFact {
  id: string;
  category: 'work' | 'relationship' | 'health' | 'spiritual' | 'family' | 'other';
  content: string; // plain statement of fact
  firstMentionedDate: string;
  lastConfirmedDate: string;
}

export interface NarrativeThread {
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'dormant' | 'resolved';
  firstDate: string;
  lastDate: string;
  significantDates: string[];
}

export interface Breakthrough {
  id: string;
  description: string;
  date: string;
  sessionDay: number;
  relatedThreadId?: string;
}

export interface EmotionalWeatherEntry {
  date: string;
  tone: 'heavy' | 'light' | 'scattered' | 'focused' | 'avoidant' | 'open' | 'turbulent' | 'settled';
  note: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  askedDate: string;
  status: 'unanswered' | 'deflected' | 'partially-answered';
}

export interface NoticedButUnspoken {
  id: string;
  observation: string;
  firstObservedDate: string;
  occurrences: number;
  readyToSurface: boolean;
}

export interface UserMemory {
  facts: MemoryFact[];
  threads: NarrativeThread[];
  breakthroughs: Breakthrough[];
  preferences: Record<string, string>; // e.g. { preferredTopics: 'career, relationships' }
  openQuestions: OpenQuestion[];
  noticedButUnspoken: NoticedButUnspoken[];
  recentEmotionalWeather: EmotionalWeatherEntry[]; // last 10 entries
  lastExtractionDate: string | null;
}

export interface MemoryUpdate {
  newFacts: Omit<MemoryFact, 'id'>[];
  updatedFactIds: string[]; // facts that were mentioned again (refreshes lastConfirmedDate)
  newThreads: Omit<NarrativeThread, 'id'>[];
  updatedThreadIds: string[]; // threads that came up again
  resolvedThreadIds: string[];
  newBreakthroughs: Omit<Breakthrough, 'id'>[];
  newOpenQuestions: Omit<OpenQuestion, 'id'>[];
  answeredQuestionIds: string[];
  newNoticedUnspoken: Omit<NoticedButUnspoken, 'id' | 'occurrences'>[];
  updatedNoticedIds: string[]; // patterns that recurred
  emotionalWeatherEntry: Omit<EmotionalWeatherEntry, 'date'> | null;
}

export const EMPTY_MEMORY: UserMemory = {
  facts: [],
  threads: [],
  breakthroughs: [],
  preferences: {},
  openQuestions: [],
  noticedButUnspoken: [],
  recentEmotionalWeather: [],
  lastExtractionDate: null,
};

// ─── System Prompt Block ────────────────────────────────────────────────────────

export function buildMemoryBlock(memory: UserMemory): string {
  const hasMemory =
    memory.facts.length > 0 ||
    memory.threads.length > 0 ||
    memory.breakthroughs.length > 0 ||
    memory.openQuestions.length > 0 ||
    memory.noticedButUnspoken.length > 0;

  if (!hasMemory) return '';

  const parts: string[] = [
    `WHAT YOU KNOW ABOUT THIS PERSON:`,
    `(Only facts listed here are confirmed. Do not reference anything not on this list. Integrate naturally — never announce "I remember that you...")`,
  ];

  // Facts — organized by category
  if (memory.facts.length > 0) {
    const byCategory = new Map<string, MemoryFact[]>();
    for (const f of memory.facts) {
      if (!byCategory.has(f.category)) byCategory.set(f.category, []);
      byCategory.get(f.category)!.push(f);
    }
    parts.push('\nFacts:');
    for (const [category, facts] of byCategory.entries()) {
      for (const f of facts) {
        parts.push(`- [${category}] ${f.content}`);
      }
    }
  }

  // Active narrative threads
  const activeThreads = memory.threads.filter((t) => t.status === 'active');
  if (activeThreads.length > 0) {
    parts.push('\nActive threads (ongoing situations you have been following):');
    for (const t of activeThreads) {
      parts.push(`- "${t.title}": ${t.summary}`);
    }
  }

  // Recent breakthroughs — last 3
  const recentBreakthroughs = [...memory.breakthroughs]
    .sort((a, b) => b.sessionDay - a.sessionDay)
    .slice(0, 3);
  if (recentBreakthroughs.length > 0) {
    parts.push('\nRecent breakthroughs:');
    for (const b of recentBreakthroughs) {
      parts.push(`- ${b.description}`);
    }
  }

  // Open questions — unanswered or deflected
  const openQs = memory.openQuestions.filter(
    (q) => q.status === 'unanswered' || q.status === 'deflected',
  );
  if (openQs.length > 0) {
    parts.push('\nQuestions you asked that this person hasn\'t yet answered (may return to these if relevant):');
    for (const q of openQs) {
      parts.push(`- [${q.status}] "${q.question}"`);
    }
  }

  // Noticed but unspoken — ready-to-surface ones only
  const readyToSurface = memory.noticedButUnspoken.filter((n) => n.readyToSurface);
  if (readyToSurface.length > 0) {
    parts.push('\nThings you\'ve observed but not yet named aloud (surface only when the moment is genuinely right):');
    for (const n of readyToSurface) {
      parts.push(`- ${n.observation} (observed ${n.occurrences} time${n.occurrences > 1 ? 's' : ''})`);
    }
  }

  // Current emotional weather
  const latestWeather = memory.recentEmotionalWeather[0];
  if (latestWeather) {
    parts.push(`\nCurrent emotional weather: ${latestWeather.tone} — ${latestWeather.note}`);
  }

  return parts.join('\n');
}

// ─── Pruning ────────────────────────────────────────────────────────────────────

export function pruneMemory(memory: UserMemory): UserMemory {
  const cutoff180 = new Date();
  cutoff180.setDate(cutoff180.getDate() - 180);
  const cutoffStr = cutoff180.toISOString().split('T')[0]!;

  return {
    ...memory,
    // Keep last 30 facts, drop those not confirmed in 180 days
    facts: memory.facts
      .filter((f) => f.lastConfirmedDate > cutoffStr)
      .slice(0, 30),
    // Keep all active threads; limit dormant to last 5
    threads: [
      ...memory.threads.filter((t) => t.status === 'active'),
      ...memory.threads
        .filter((t) => t.status !== 'active')
        .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
        .slice(0, 5),
    ],
    // Keep last 10 breakthroughs
    breakthroughs: [...memory.breakthroughs]
      .sort((a, b) => b.sessionDay - a.sessionDay)
      .slice(0, 10),
    // Keep unanswered questions < 90 days old
    openQuestions: memory.openQuestions.filter((q) => q.askedDate > cutoffStr),
    // Keep noticed-but-unspoken items < 90 days old
    noticedButUnspoken: memory.noticedButUnspoken.filter(
      (n) => n.firstObservedDate > cutoffStr || n.occurrences >= 3,
    ),
    // Keep last 10 emotional weather entries
    recentEmotionalWeather: memory.recentEmotionalWeather.slice(0, 10),
  };
}

// ─── User-Facing Memory (for transparency screen) ──────────────────────────────

export function getUserFacingMemory(memory: UserMemory): Record<string, unknown> {
  return {
    facts: memory.facts.map((f) => ({ category: f.category, content: f.content })),
    threads: memory.threads
      .filter((t) => t.status === 'active')
      .map((t) => ({ title: t.title, summary: t.summary })),
    openQuestions: memory.openQuestions.map((q) => ({ question: q.question })),
    recentMood: memory.recentEmotionalWeather[0]?.tone ?? null,
  };
}
