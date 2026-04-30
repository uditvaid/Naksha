/**
 * Layer 12 — Engagement Telemetry (pure functions)
 *
 * All telemetry serves the user's experience, not company metrics.
 * On-device only. Used to adapt the Guru's behavior per user.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SessionRecord {
  date: string; // YYYY-MM-DD
  turnCount: number;
  totalChars: number; // user chars sent
  responseFormHistory: string[]; // which forms were used
  topicsRaised: string[]; // detected topic keywords
}

export interface EngagementTelemetry {
  sessionHistory: SessionRecord[]; // last 30 sessions
  averageTurnCount: number;
  preferredTopics: string[]; // topics with most engagement
  preferredResponseLength: 'short' | 'medium' | 'long'; // learned from behavior
  disengagementSignal: boolean; // 14-day declining engagement
  totalLifetimeTurns: number;
  lastEngagedDate: string | null;
}

export const EMPTY_TELEMETRY: EngagementTelemetry = {
  sessionHistory: [],
  averageTurnCount: 0,
  preferredTopics: [],
  preferredResponseLength: 'medium',
  disengagementSignal: false,
  totalLifetimeTurns: 0,
  lastEngagedDate: null,
};

// ─── Session Recording ─────────────────────────────────────────────────────────

export function recordSession(
  telemetry: EngagementTelemetry,
  session: Omit<SessionRecord, 'date'>,
): EngagementTelemetry {
  const today = new Date().toISOString().split('T')[0]!;
  const existing = telemetry.sessionHistory.find((s) => s.date === today);

  const updatedRecord: SessionRecord = existing
    ? {
        ...existing,
        turnCount: existing.turnCount + session.turnCount,
        totalChars: existing.totalChars + session.totalChars,
        responseFormHistory: [...existing.responseFormHistory, ...session.responseFormHistory],
        topicsRaised: [...new Set([...existing.topicsRaised, ...session.topicsRaised])],
      }
    : { date: today, ...session };

  const history = existing
    ? telemetry.sessionHistory.map((s) => (s.date === today ? updatedRecord : s))
    : [updatedRecord, ...telemetry.sessionHistory];

  const trimmed = history.slice(0, 30);
  const totalTurns = trimmed.reduce((sum, s) => sum + s.turnCount, 0);
  const avgTurns = trimmed.length > 0 ? totalTurns / trimmed.length : 0;

  const disengagement = detectDisengagement(trimmed);
  const prefLength = detectPreferredLength(trimmed);
  const prefTopics = detectPreferredTopics(trimmed);

  return {
    ...telemetry,
    sessionHistory: trimmed,
    averageTurnCount: avgTurns,
    preferredTopics: prefTopics,
    preferredResponseLength: prefLength,
    disengagementSignal: disengagement,
    totalLifetimeTurns: telemetry.totalLifetimeTurns + session.turnCount,
    lastEngagedDate: today,
  };
}

// ─── Signal Detection ──────────────────────────────────────────────────────────

function detectDisengagement(sessions: SessionRecord[]): boolean {
  if (sessions.length < 14) return false;

  const recent7 = sessions.slice(0, 7);
  const prior7 = sessions.slice(7, 14);

  const recentAvg = recent7.reduce((s, r) => s + r.turnCount, 0) / 7;
  const priorAvg = prior7.reduce((s, r) => s + r.turnCount, 0) / 7;

  // Disengagement: recent avg is less than 50% of prior avg
  return priorAvg > 2 && recentAvg < priorAvg * 0.5;
}

function detectPreferredLength(
  sessions: SessionRecord[],
): EngagementTelemetry['preferredResponseLength'] {
  // Proxy: higher turn count per session → user engages more → longer responses welcome
  const avg = sessions.slice(0, 10).reduce((s, r) => s + r.turnCount, 0) /
    Math.max(sessions.slice(0, 10).length, 1);
  if (avg > 8) return 'long';
  if (avg < 3) return 'short';
  return 'medium';
}

function detectPreferredTopics(sessions: SessionRecord[]): string[] {
  const topicCounts = new Map<string, number>();
  for (const s of sessions.slice(0, 20)) {
    for (const t of s.topicsRaised) {
      topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    }
  }
  return [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

// ─── Topic Detection ───────────────────────────────────────────────────────────

const TOPIC_PATTERNS: [string, RegExp][] = [
  ['career', /\b(career|job|work|profession|business|money|income|salary)\b/i],
  ['relationship', /\b(relationship|partner|marriage|love|spouse|husband|wife|boyfriend|girlfriend)\b/i],
  ['health', /\b(health|body|illness|disease|healing|wellness|energy|tired|sleep)\b/i],
  ['family', /\b(family|mother|father|parent|sibling|brother|sister|child|son|daughter)\b/i],
  ['spiritual', /\b(spiritual|meditation|practice|dharma|karma|soul|god|divine|purpose)\b/i],
  ['creativity', /\b(creative|art|music|writing|design|create|expression)\b/i],
  ['purpose', /\b(purpose|meaning|direction|lost|why|reason|path|calling)\b/i],
  ['fear', /\b(fear|afraid|anxiety|worried|scared|worry|dread)\b/i],
];

export function detectTopics(message: string): string[] {
  return TOPIC_PATTERNS
    .filter(([, pattern]) => pattern.test(message))
    .map(([topic]) => topic);
}
