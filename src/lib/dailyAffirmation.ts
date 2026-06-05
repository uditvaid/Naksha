/**
 * Daily affirmation + dasha-aware focus tasks.
 *
 * Single source of truth for both the home-page card and the daily push
 * notification — they MUST stay in sync, otherwise the user reads one
 * affirmation in the notification then sees a different one when they open
 * the app, which feels broken.
 *
 * Rotation is by day-of-year: same input → same output for an entire
 * calendar day, in any timezone.
 */

export const AFFIRMATIONS = [
  'The universe supports your highest good. Today, trust the timing of your life.',
  'Your birth chart is a map of possibility, not a cage. You hold the power.',
  'Every challenge is Saturn teaching — every grace is Jupiter blessing.',
  'The Moon governs your inner world. Honour your emotions as sacred data.',
  'You are the meeting point of heaven and earth, written in the stars.',
  'What you focus on grows. Direct your awareness with intention today.',
  'Your dharma is unique. No one else can walk the path you are here to walk.',
  'Patience is not passive. It is the strength of one who knows when to act.',
  'The stars incline; they do not compel. Your choices shape your destiny.',
  'Rest is not retreat. Even the Moon waxes and wanes to remain whole.',
  'Gratitude opens the channels through which grace naturally flows.',
  'You carry the wisdom of ancestors. Trust what you know in your bones.',
  'Every ending in your life is preparing space for a new beginning.',
  'The present moment is your point of power. Begin here, begin now.',
  'Your sensitivity is not weakness — it is the antenna that reads the world.',
  'Courage is not the absence of fear. It is moving forward with it beside you.',
  'What you resist teaches you. What you accept has the power to transform you.',
  'The cosmos is not indifferent. It is always speaking. Learn to listen.',
  'You are in exactly the right chapter of your story. Trust the arc.',
  'Small, consistent actions compound into extraordinary transformation.',
  'Your relationships mirror your inner state. Begin any change within.',
  'Abundance is not a destination — it is a frequency you choose to inhabit.',
  'Let go of what was, and make room for what is quietly becoming.',
  'Your body is the vehicle of your dharma. Honour it with care and attention.',
  'Purpose is not found — it is revealed through sustained action and attention.',
  'The Guru within you knows the way. Quiet the mind and listen deeply.',
  'You are not behind. You are exactly where your karma has led you.',
  'What you do in the small moments determines who you become in the large ones.',
] as const;

/**
 * Dasha-specific focus pools. Each pool is 9 items so the picker can produce
 * 3 distinct trios with no overlap between consecutive days. The original
 * three items per dasha live at indices 0/3/6 — same content the user saw
 * before, now joined by six siblings so the daily card actually changes
 * day-to-day inside a multi-year mahadasha period.
 */
const DASHA_FOCUS_POOLS: Record<string, readonly string[]> = {
  Sun: [
    'Step into a leadership role, even a small one today',
    'Speak up in a moment when staying quiet would have been easier',
    'Decide one thing today that has been waiting for your authority',
    'Clarify your core identity and what you stand for',
    'Praise someone publicly for work that deserves recognition',
    'Move through the day with deliberate, upright posture',
    'Spend time in natural light — nourish your vital energy',
    'Choose visibility over comfort in one conversation',
    'Honour your father, mentor, or anyone who shaped your courage',
  ],
  Moon: [
    'Check in honestly with your emotional needs',
    'Call or message someone who has been quietly on your mind',
    'Eat something nourishing and notice how it lands in your body',
    'Nurture an important relationship with full presence',
    'Take a slow walk under the moon or open sky tonight',
    'Forgive yourself for one small thing you have been carrying',
    'Create one moment of stillness and quiet reflection',
    'Let your home receive you — tidy one corner that has been waiting',
    'Trust an emotional read you would normally talk yourself out of',
  ],
  Mars: [
    'Take decisive action on something you have been postponing',
    'Say no to one request that does not serve your direction',
    'Finish the unfinished — close a loop that has been open too long',
    'Move your body — channel this energy through exercise',
    'Pick the harder version of a task and do it well',
    'Defend a boundary you have been letting slip',
    'Set one clear goal and begin it before the day ends',
    'Channel any irritation into a clean, useful action',
    'Take a cold shower or wash your face with cold water — reset the system',
  ],
  Mercury: [
    'Write, speak, or learn something meaningful today',
    'Make a list before the day picks up speed — three priorities, no more',
    'Ask a sharper question in a meeting or conversation today',
    'Clear a communication backlog — messages, emails, conversations',
    'Edit something you wrote — cut, tighten, clarify',
    'Teach someone a small skill you take for granted',
    'Engage your curiosity — read, research, or explore a new idea',
    'Learn one new word, phrase, or concept and use it once today',
    'Pause before replying — let your first thought refine itself',
  ],
  Jupiter: [
    'Express gratitude for three specific blessings today',
    'Offer guidance to someone newer in their journey than you',
    'Read a few pages of something timeless — scripture, philosophy, poetry',
    'Share your knowledge or wisdom with someone who needs it',
    'Be generous with a compliment that you would normally keep to yourself',
    'Give to a cause or person without expectation of return',
    'Invest in your growth — a book, course, or deep conversation',
    'Take the longer, more ethical path on one decision today',
    'Surround yourself briefly with people wiser or older than you',
  ],
  Venus: [
    'Do something beautiful — create, appreciate art, or dress with care',
    'Notice something beautiful around you and let yourself stop for it',
    'Bring care to one shared space — a meal, a room, a small gathering',
    'Deepen a relationship with genuine attention and warmth',
    'Send a warm message with no agenda other than affection',
    'Light a candle, play music, set the room with intention tonight',
    'Allow yourself real pleasure today, without guilt',
    'Wear something that genuinely pleases you',
    'Tell someone you love what you appreciate about them specifically',
  ],
  Saturn: [
    'Tackle the most important task you have been avoiding',
    'Show up on time for everything today — every meeting, every call',
    'Spend ten quiet minutes with a problem instead of avoiding it',
    'Review a long-term commitment and honour it fully today',
    'Keep one promise to yourself that you usually break',
    'Simplify — remove one thing from your day, your plate, or your space',
    'Practice discipline in one area: sleep, diet, or focused work',
    'Sit with a hard truth instead of softening it',
    'Do the boring, foundational work that future-you will be glad you did',
  ],
  Rahu: [
    'Step outside your comfort zone in one deliberate way',
    'Try a route, food, or method you have never tried before',
    'Question one assumption you usually treat as a given',
    'Explore an unconventional idea or a new perspective',
    'Reach out to someone outside your usual circle',
    'Notice where you are performing for an audience — and pause',
    'Channel your ambition with focus — do not scatter your energy',
    'Pick one ambition that excites you and take a small, real step on it',
    'Limit your screen time by one deliberate hour today',
  ],
  Ketu: [
    'Sit in silent meditation or contemplative reflection',
    'Spend ten minutes in silence with no input — phone away, mind open',
    'Let one small thing go — a grudge, a hope, a worn-out plan',
    'Release one attachment or expectation that no longer serves you',
    'Notice where you are gripping; soften your hands and your jaw',
    'Read or listen to something that points beyond the everyday',
    'Connect with your spiritual practice or deeper sense of purpose',
    'Eat one meal slowly and without distraction',
    'Sit with the question: what is no longer mine to carry?',
  ],
};

/**
 * Fallback pool used when the chart hasn't loaded yet (and we don't know
 * the active mahadasha lord). Nine items so the picker still rotates.
 */
const GENERIC_FOCUS_POOL: readonly string[] = [
  'Begin your day with clear intention — write down three priorities',
  'Drink a full glass of water before your first cup of coffee or tea',
  'Step outside for ten minutes — change your context, change your energy',
  'Take five deep breaths before responding to any challenge today',
  'Notice one moment of beauty and pause for two slow breaths in it',
  'Send one warm message you have been meaning to send',
  'Do one thing today that your future self will genuinely thank you for',
  'Tidy one small thing — a desk, a drawer, an inbox',
  'End the day by naming three things that worked, no matter how small',
];

/** Day-of-year index, 0-365. Same value for an entire calendar day. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Pick three items from a pool using a deterministic stride pattern keyed
 * on day-of-year. For a 9-item pool: produces three trios that cycle every
 * three days with no item appearing in two consecutive days' picks. Falls
 * back gracefully for smaller pools (stride collapses to 1).
 */
function pickThree(pool: readonly string[], doy: number): [string, string, string] {
  const n = pool.length;
  // Defensive — todaysFocus is the only caller and pools are length-9, but
  // a future pool edit might drop below 3 by accident. Fall back to the
  // first three items in that case rather than throwing.
  if (n < 3) {
    return [pool[0] ?? '', pool[1] ?? pool[0] ?? '', pool[2] ?? pool[0] ?? ''] as [string, string, string];
  }
  const a = ((doy % n) + n) % n; // safe for negative doy edge cases
  const stride = Math.max(1, Math.floor(n / 3));
  const b = (a + stride) % n;
  const c = (a + 2 * stride) % n;
  return [pool[a]!, pool[b]!, pool[c]!];
}

export function todaysAffirmation(date: Date = new Date()): string {
  return AFFIRMATIONS[dayOfYear(date) % AFFIRMATIONS.length]!;
}

export function todaysFocus(activeDashaLord: string | undefined, date: Date = new Date()): [string, string, string] {
  // Daily rotation: each dasha has a 9-item pool; stride-of-3 selection
  // means a fresh trio every calendar day with no overlap between
  // consecutive days. Without rotation, a user mid-mahadasha would see
  // the same three focus lines for years.
  const doy = dayOfYear(date);
  const pool = activeDashaLord ? DASHA_FOCUS_POOLS[activeDashaLord] : undefined;
  return pickThree(pool ?? GENERIC_FOCUS_POOL, doy);
}
