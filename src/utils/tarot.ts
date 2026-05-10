/**
 * Tarot — 78-card Rider-Waite-Smith deck.
 *
 * Each card has a one-line upright + reversed keyword. We deliberately keep
 * card meanings terse: the LLM does the contextual interpretation against
 * the user's question and chart, so loading the model with paragraphs of
 * generic meaning here would just bloat the prompt without adding insight.
 */

export type Arcana = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type SpreadType = 'single' | 'three' | 'relationship' | 'decision' | 'celticCross';

export interface TarotCard {
  id: number;
  name: string;
  arcana: Arcana;
  suit?: Suit;
  number?: number; // 1-10 for pip cards, 11=Page, 12=Knight, 13=Queen, 14=King for court
  upright: string;
  reversed: string;
  symbol: string; // single glyph used as card-face placeholder in the UI
}

export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
  position: string; // human label: "The Card", "Past", "Present", etc.
}

// ─── Major Arcana (22) ────────────────────────────────────────────────────────

const MAJOR: Omit<TarotCard, 'id' | 'arcana' | 'symbol'>[] = [
  { name: 'The Fool',           upright: 'New beginnings, leap of faith, innocence',          reversed: 'Recklessness, hesitation, naivety' },
  { name: 'The Magician',       upright: 'Manifestation, focused will, resourcefulness',       reversed: 'Manipulation, untapped potential, scattered energy' },
  { name: 'The High Priestess', upright: 'Intuition, hidden knowledge, inner wisdom',          reversed: 'Secrets surfacing, ignored intuition, withdrawal' },
  { name: 'The Empress',        upright: 'Abundance, nurturing, creativity, sensual fullness', reversed: 'Creative block, dependence, self-neglect' },
  { name: 'The Emperor',        upright: 'Authority, structure, fatherhood, stability',        reversed: 'Rigidity, domination, lack of discipline' },
  { name: 'The Hierophant',     upright: 'Tradition, mentorship, spiritual structure',         reversed: 'Rebellion, breaking convention, personal beliefs' },
  { name: 'The Lovers',         upright: 'Union, alignment of values, important choice',       reversed: 'Misalignment, disharmony, indecision' },
  { name: 'The Chariot',        upright: 'Willpower, victory through focus, decisive motion',  reversed: 'Lack of direction, scattered effort, self-doubt' },
  { name: 'Strength',           upright: 'Inner courage, gentle power, compassion',            reversed: 'Self-doubt, force misapplied, raw emotion' },
  { name: 'The Hermit',         upright: 'Solitude, soul-searching, inner guidance',           reversed: 'Isolation, withdrawal taken too far, refusing help' },
  { name: 'Wheel of Fortune',   upright: 'Cycles, turning point, destiny in motion',           reversed: 'Resistance to change, bad luck, breaking cycles' },
  { name: 'Justice',            upright: 'Truth, fairness, cause and effect, accountability',  reversed: 'Avoidance of consequences, dishonesty, imbalance' },
  { name: 'The Hanged Man',     upright: 'Surrender, new perspective, sacrifice for insight',  reversed: 'Stalling, martyrdom, unable to let go' },
  { name: 'Death',              upright: 'Transformation, ending, profound change',            reversed: 'Resistance to change, stagnation, fear of letting go' },
  { name: 'Temperance',         upright: 'Balance, patience, blending opposites',              reversed: 'Excess, imbalance, impatience' },
  { name: 'The Devil',          upright: 'Attachment, shadow self, restriction by choice',     reversed: 'Releasing attachment, awareness, reclaiming power' },
  { name: 'The Tower',          upright: 'Sudden upheaval, revelation, the false collapses',   reversed: 'Avoiding disaster, fear of change, delayed reckoning' },
  { name: 'The Star',           upright: 'Hope, renewal, quiet faith after the storm',         reversed: 'Despair, disconnection, faith wavering' },
  { name: 'The Moon',           upright: 'Intuition, the unseen, dreams, illusion',            reversed: 'Confusion lifting, secrets revealed, anxiety easing' },
  { name: 'The Sun',            upright: 'Joy, vitality, success, clarity of purpose',         reversed: 'Temporary clouds, dampened joy, ego flare' },
  { name: 'Judgement',          upright: 'Awakening, reckoning, second chance, calling',       reversed: 'Self-doubt, ignoring the call, harsh self-judgement' },
  { name: 'The World',          upright: 'Completion, integration, wholeness, fulfilment',     reversed: 'Loose ends, almost-there, lack of closure' },
];

// ─── Minor Arcana (56) ────────────────────────────────────────────────────────

interface SuitMeanings {
  upright: Record<number, string>;
  reversed: Record<number, string>;
}

const SUIT_LABELS: Record<Suit, string> = {
  wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles',
};

const COURT_LABELS: Record<number, string> = { 11: 'Page', 12: 'Knight', 13: 'Queen', 14: 'King' };
const RANK_LABELS: Record<number, string> = {
  1: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
  6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
  ...COURT_LABELS,
};

const MINOR: Record<Suit, SuitMeanings> = {
  wands: {
    upright: {
      1:  'A spark of inspiration, creative ignition, new venture',
      2:  'Future planning, weighing options, personal power emerging',
      3:  'Expansion, foresight, ships coming in',
      4:  'Celebration, harmony, homecoming, milestone',
      5:  'Healthy competition, friction, growth through challenge',
      6:  'Public recognition, victory, confidence',
      7:  'Standing your ground, defending position, perseverance',
      8:  'Rapid movement, news arriving, momentum',
      9:  'Resilience, last stand, near the finish line',
      10: 'Burden, overcommitment, carrying too much',
      11: 'Eager learner, free spirit, fresh enthusiasm',
      12: 'Bold action, pursuit of vision, possibly impulsive',
      13: 'Charismatic leader, confident presence, magnetic warmth',
      14: 'Visionary leadership, big-picture thinker, natural authority',
    },
    reversed: {
      1:  'Delayed start, lack of energy, missed spark',
      2:  'Indecision, fear of unknown, stalled planning',
      3:  'Delays in expansion, foresight ignored, obstacles',
      4:  'Cracks in foundation, conflict at home, ungrounded',
      5:  'Avoiding conflict, suppressed competition, inner tension',
      6:  'Lack of recognition, ego inflation, hollow victory',
      7:  'Overwhelmed, giving up, defensive exhaustion',
      8:  'Stagnation, frustrating delays, losing momentum',
      9:  'Worn down, paranoia, defensive walls too high',
      10: 'Releasing burden, delegating, stress eased',
      11: 'Unfocused energy, pessimism, immaturity',
      12: 'Reckless action, no plan, burning bridges',
      13: 'Arrogance, overbearing presence, ego misalignment',
      14: 'Tyranny, rash decisions, leadership failing',
    },
  },
  cups: {
    upright: {
      1:  'Emotional opening, love beginning, intuitive flow',
      2:  'Mutual attraction, partnership, deep connection',
      3:  'Friendship, celebration, community joy',
      4:  'Contemplation, apathy, opportunity overlooked',
      5:  'Loss, regret, focus on what remains',
      6:  'Nostalgia, innocence, reunion with the past',
      7:  'Dreams and choices, illusion, possibilities',
      8:  'Walking away, seeking deeper meaning, leaving comfort',
      9:  'Contentment, wishes fulfilled, emotional satisfaction',
      10: 'Family harmony, lasting happiness, deep belonging',
      11: 'Sensitive messenger, creative invitation, new feelings',
      12: 'Romantic offer, idealism, charm in motion',
      13: 'Compassionate, intuitive, emotionally attuned',
      14: 'Emotional mastery, calm wisdom, balanced heart',
    },
    reversed: {
      1:  'Blocked emotion, unrequited love, repressed feeling',
      2:  'Disharmony, mismatched desires, breakup',
      3:  'Gossip, third-party trouble, group friction',
      4:  'Awakening, accepting offers, motivation returning',
      5:  'Acceptance, moving on, healing from grief',
      6:  'Stuck in past, refusing to grow up, idealising what was',
      7:  'Clarity returning, choice made, illusion dissolving',
      8:  'Returning, fear of leaving, stuck in dissatisfaction',
      9:  'Emptiness despite abundance, smug, ego-driven',
      10: 'Disconnect at home, broken family, unmet expectations',
      11: 'Emotional immaturity, creative block, escapism',
      12: 'Moodiness, unrealistic, jealous projection',
      13: 'Codependence, smothering, overwhelmed by emotion',
      14: 'Emotional manipulation, repressed feeling, volatility' },
  },
  swords: {
    upright: {
      1:  'Mental clarity, breakthrough, truth cutting through',
      2:  'Stalemate, difficult choice, weighing options',
      3:  'Heartbreak, painful truth, grief',
      4:  'Rest, retreat, recovery, contemplation',
      5:  'Conflict, hollow victory, disagreement',
      6:  'Transition, leaving for calmer waters, slow healing',
      7:  'Strategy, deception, getting away with it',
      8:  'Self-imposed restriction, victim mindset, paralysis',
      9:  'Anxiety, worry, sleepless nights',
      10: 'Painful endings, rock bottom, ruin (and dawn after)',
      11: 'Curious mind, vigilant, ideas sharpening',
      12: 'Decisive action, intellectual force, headfirst',
      13: 'Independent, sharp, honest to the point of cool',
      14: 'Authority through truth, intellectual leadership, principled',
    },
    reversed: {
      1:  'Confusion, miscommunication, mental fog',
      2:  'Indecision overcome, choice forced, information surfacing',
      3:  'Healing, forgiveness, recovery from grief',
      4:  'Restlessness, exhaustion, unable to rest',
      5:  'Reconciliation, releasing resentment, moving on from conflict',
      6:  'Refusing transition, stuck in old waters, self-sabotage',
      7:  'Caught out, guilt, returning what was taken',
      8:  'Releasing yourself, new perspective, freedom returning',
      9:  'Inner work, anxiety easing, hope returning',
      10: 'Recovery, the worst is over, regeneration',
      11: 'Cynicism, gossip, all talk no follow-through',
      12: 'Recklessness, scattered force, bullying',
      13: 'Coldness, harsh judgement, bitterness',
      14: 'Tyranny, abuse of power, manipulation',
    },
  },
  pentacles: {
    upright: {
      1:  'New material opportunity, prosperity beginning, manifestation',
      2:  'Juggling, balance, adaptability with resources',
      3:  'Skill, collaboration, craft recognised',
      4:  'Saving, control, security through holding',
      5:  'Financial loss, isolation, hardship',
      6:  'Generosity, fair exchange, giving and receiving',
      7:  'Patience, long-term view, evaluating progress',
      8:  'Apprenticeship, mastery, dedication to craft',
      9:  'Self-sufficiency, luxury earned, independent abundance',
      10: 'Legacy, lasting wealth, family wealth',
      11: 'Practical learner, opportunity scout, focused study',
      12: 'Steady progress, reliability, methodical effort',
      13: 'Nurturing wealth, practical care, abundance shared',
      14: 'Established success, prosperity, generous patriarch',
    },
    reversed: {
      1:  'Missed opportunity, scarcity mindset, poor planning',
      2:  'Overwhelmed, dropping the ball, financial juggling failing',
      3:  'Lack of teamwork, lazy work, poor craftsmanship',
      4:  'Greed, miserliness, controlling money or others',
      5:  'Recovery from loss, help arriving, end of hard times',
      6:  'Strings attached, unfair exchange, self-centred giving',
      7:  'Impatience, lack of reward, second-guessing',
      8:  'Lack of focus, sloppy work, perfectionism',
      9:  'Living beyond means, dependence, hollow luxury',
      10: 'Family disputes, broken legacy, financial loss',
      11: 'Distracted, unmotivated, unable to start',
      12: 'Stuck in routine, boredom, work going nowhere',
      13: 'Smothering, materialism, neglecting inner life',
      14: 'Greed, corruption, stubborn hoarding',
    },
  },
};

// ─── Build deck ───────────────────────────────────────────────────────────────

const SUIT_SYMBOL: Record<Suit, string> = {
  wands: '🜂', cups: '🜄', swords: '🜁', pentacles: '🜃',
};

function buildDeck(): TarotCard[] {
  const deck: TarotCard[] = [];

  // Major Arcana — IDs 0-21
  MAJOR.forEach((m, i) => {
    deck.push({
      id: i,
      arcana: 'major',
      name: m.name,
      upright: m.upright,
      reversed: m.reversed,
      symbol: '✦',
    });
  });

  // Minor Arcana — IDs 22-77
  let id = 22;
  (Object.keys(MINOR) as Suit[]).forEach((suit) => {
    const meanings = MINOR[suit];
    for (let n = 1; n <= 14; n++) {
      const rank = RANK_LABELS[n]!;
      deck.push({
        id: id++,
        arcana: 'minor',
        suit,
        number: n,
        name: `${rank} of ${SUIT_LABELS[suit]}`,
        upright: meanings.upright[n]!,
        reversed: meanings.reversed[n]!,
        symbol: SUIT_SYMBOL[suit],
      });
    }
  });

  return deck;
}

export const TAROT_DECK: TarotCard[] = buildDeck();

// ─── Shuffle + draw ───────────────────────────────────────────────────────────

// Tiny seeded PRNG so tests can pin results. Mulberry32.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

const SPREAD_POSITIONS: Record<SpreadType, string[]> = {
  single: ['The Card'],
  three:  ['Past', 'Present', 'Future'],
  // 5-card relationship spread — focused on a single connection
  relationship: ['You', 'Them', 'The Bond', 'What Helps', 'What Strains'],
  // 3-card decision spread — A vs B + the deeper truth underneath
  decision: ['If You Choose A', 'If You Choose B', 'Underneath Both'],
  // Classic 10-card Celtic Cross — the deepest reading available
  celticCross: [
    'The Heart of the Matter',
    'What Crosses You',
    'The Foundation',
    'The Recent Past',
    'What\'s Possible',
    'The Near Future',
    'How You See Yourself',
    'How Others See You',
    'Your Hopes & Fears',
    'The Outcome',
  ],
};

export function getSpreadPositions(spread: SpreadType): string[] {
  return SPREAD_POSITIONS[spread];
}

export interface DrawOptions {
  /** Optional deterministic seed (e.g. user+date for daily card). */
  seed?: string;
  /** Whether reversed (upside-down) cards are allowed in this draw. Some
   *  users prefer upright-only readings; default true honours both. */
  allowReversed?: boolean;
}

/**
 * Draws cards for a spread. Without a seed, uses Math.random.
 * With a seed, results are deterministic — useful for tests and for
 * "draw of the day" where the seed is the date.
 */
export function shuffleAndDraw(spread: SpreadType, opts: DrawOptions | string = {}): DrawnCard[] {
  // Backwards-compat: callers used to pass `seed` directly as a string.
  const o: DrawOptions = typeof opts === 'string' ? { seed: opts } : opts;
  const rand = o.seed != null ? mulberry32(hashStringToSeed(o.seed)) : Math.random;
  const positions = SPREAD_POSITIONS[spread];
  const allowReversed = o.allowReversed !== false;

  // Fisher-Yates on a copy of the deck.
  const deck = TAROT_DECK.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }

  return positions.map((position, i) => ({
    card: deck[i]!,
    // ~40% reversed when reversals are allowed; pure 50% leaves too many reversals
    reversed: allowReversed ? rand() < 0.4 : false,
    position,
  }));
}

/**
 * Returns today's "card of the day" deterministically — same date + user gives
 * the same card. Useful for surfacing a daily draw alongside the daily reading.
 */
export function dailyCardOfTheDay(userKey: string, date: Date = new Date()): DrawnCard {
  const dayKey = date.toISOString().split('T')[0]!;
  return shuffleAndDraw('single', `${userKey}:${dayKey}`)[0]!;
}
