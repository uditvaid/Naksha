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

export const DASHA_FOCUS: Record<string, [string, string, string]> = {
  Sun:     ['Step into a leadership role, even a small one today', 'Clarify your core identity and what you stand for', 'Spend time in natural light — nourish your vital energy'],
  Moon:    ['Check in honestly with your emotional needs', 'Nurture an important relationship with full presence', 'Create one moment of stillness and quiet reflection'],
  Mars:    ['Take decisive action on something you\'ve been postponing', 'Move your body — channel this energy through exercise', 'Set one clear goal and begin it before the day ends'],
  Mercury: ['Write, speak, or learn something meaningful today', 'Clear a communication backlog — messages, emails, conversations', 'Engage your curiosity — read, research, or explore a new idea'],
  Jupiter: ['Express gratitude for three specific blessings today', 'Share your knowledge or wisdom with someone who needs it', 'Invest in your growth — a book, course, or deep conversation'],
  Venus:   ['Do something beautiful — create, appreciate art, or dress with care', 'Deepen a relationship with genuine attention and warmth', 'Allow yourself real pleasure today, without guilt'],
  Saturn:  ['Tackle the most important task you have been avoiding', 'Review a long-term commitment and honour it fully today', 'Practice discipline in one area: sleep, diet, or focused work'],
  Rahu:    ['Step outside your comfort zone in one deliberate way', 'Explore an unconventional idea or a new perspective', 'Channel your ambition with focus — do not scatter your energy'],
  Ketu:    ['Sit in silent meditation or contemplative reflection', 'Release one attachment or expectation that no longer serves you', 'Connect with your spiritual practice or deeper sense of purpose'],
};

export const GENERIC_FOCUS: [string, string, string] = [
  'Begin your day with clear intention — write down three priorities',
  'Take five deep breaths before responding to any challenge today',
  'Do one thing today that your future self will genuinely thank you for',
];

/** Day-of-year index, 0-365. Same value for an entire calendar day. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function todaysAffirmation(date: Date = new Date()): string {
  return AFFIRMATIONS[dayOfYear(date) % AFFIRMATIONS.length]!;
}

export function todaysFocus(activeDashaLord: string | undefined, date: Date = new Date()): [string, string, string] {
  // The dasha-specific arrays don't rotate (only 3 items each), but if they did
  // we'd rotate by day-of-year here. Today: just return the dasha set, falling
  // back to generic if no chart yet.
  void date;
  if (activeDashaLord && DASHA_FOCUS[activeDashaLord]) return DASHA_FOCUS[activeDashaLord]!;
  return GENERIC_FOCUS;
}
