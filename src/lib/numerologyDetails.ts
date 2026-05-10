/**
 * Plain-English numerology lookups for the five core numbers.
 *
 * Two layers compose into the modal content:
 *
 * 1. NUMBER_PROFILE — what each number (1-9, 11, 22, 33) means
 *    fundamentally, regardless of which slot it shows up in. Title,
 *    long description, strengths, challenges, lean-into prompt.
 *
 * 2. KIND_LENS — what each "slot" (lifePath, destiny, soulUrge,
 *    personality, birthday) tracks in the chart, so the same number
 *    reads differently when it's a Life Path vs a Soul Urge.
 *
 * The composer pairs them: e.g. Life Path 5 = "freedom-seeking
 * traveller" energy as your soul's *journey*; Soul Urge 5 = same
 * energy as your *deepest craving*.
 */

export type NumberKind = 'lifePath' | 'destiny' | 'soulUrge' | 'personality' | 'birthday';

export interface KindLens {
  /** Section header, e.g. "LIFE PATH". */
  label: string;
  /** One-liner shown directly under the header — what this slot tracks. */
  oneLiner: string;
  /** A "for this person, this number means…" sentence opener. */
  framingOpen: string;
}

export const KIND_LENS: Record<NumberKind, KindLens> = {
  lifePath: {
    label: 'LIFE PATH',
    oneLiner: 'Your soul\'s fundamental journey — the lessons and rhythm you signed up for.',
    framingOpen: 'As your Life Path,',
  },
  destiny: {
    label: 'DESTINY',
    oneLiner: 'What you\'re here to express, build, and contribute through your work in the world.',
    framingOpen: 'As your Destiny,',
  },
  soulUrge: {
    label: 'SOUL URGE',
    oneLiner: 'What you secretly crave most — the inner motivation that runs underneath everything.',
    framingOpen: 'As your Soul Urge,',
  },
  personality: {
    label: 'PERSONALITY',
    oneLiner: 'The face you show the world — how strangers and acquaintances first read you.',
    framingOpen: 'As your Personality,',
  },
  birthday: {
    label: 'BIRTHDAY',
    oneLiner: 'A specific gift built into the day you were born — a talent that comes naturally.',
    framingOpen: 'As your Birthday gift,',
  },
};

export interface NumberProfile {
  /** Short evocative title, e.g. "The Leader". */
  title: string;
  /** One-line trait summary. */
  traits: string;
  /** Long description: what this number's energy fundamentally is. */
  description: string;
  /** Bullet points: strengths the number tends to bring. */
  strengths: string[];
  /** Bullet points: challenges to be aware of. */
  challenges: string[];
  /** A "what to lean into today" practical prompt. */
  leanInto: string;
}

export const NUMBER_PROFILE: Record<number, NumberProfile> = {
  1: {
    title: 'The Leader',
    traits: 'Independent · pioneering · original · ambitious',
    description: "Number 1 is the energy of beginning, individuation, and standing on your own two feet. It's the spark of will that says \"I am, I choose, I lead.\" People shaped by 1 tend to be initiators — first to start, first to act, allergic to following the herd.",
    strengths: ['Self-starter, doesn\'t need permission', 'Original ideas and willingness to back them', 'Natural authority, others look to you', 'Strong will, finishes what you start'],
    challenges: ['Loneliness from over-individuating', 'Bossiness when patience runs short', 'Trouble asking for help', 'Stubbornness disguised as confidence'],
    leanInto: "Trust your first instinct. The world needs your particular angle, not a watered-down version. Practise asking \"what do I actually think?\" before checking what others think.",
  },
  2: {
    title: 'The Diplomat',
    traits: 'Cooperative · sensitive · balanced · supportive',
    description: "Number 2 is the energy of partnership, peace-keeping, and quiet influence. It's the second voice in any room — the one that listens, harmonises, and finds the bridge. People shaped by 2 lead through relationships rather than through force.",
    strengths: ['Reads emotional weather better than most', 'Builds trust quickly', 'Mediates conflict naturally', 'Patient with slow-blooming things'],
    challenges: ['Loses self in others\' needs', 'Avoids necessary conflict', 'Indecisive when surrounded by strong opinions', 'Over-sensitive to criticism'],
    leanInto: "Practise saying \"no\" without explanation. Your gift is reading rooms — but you don't owe everyone in the room your energy. Boundaries make your softness more effective, not less.",
  },
  3: {
    title: 'The Creator',
    traits: 'Creative · expressive · joyful · optimistic',
    description: "Number 3 is the energy of creative expression, play, and the magic of language. It's the storyteller, the artist, the friend who lights up a dinner party. People shaped by 3 process the world through making — words, art, performance, design.",
    strengths: ['Natural communicator and entertainer', 'Optimism that lifts others', 'Creative range across mediums', 'Charm that opens doors'],
    challenges: ['Scatters energy across too many projects', 'Avoids hard emotions through humour', 'Surface-level when depth is called for', 'Self-doubt about whether the work is "real"'],
    leanInto: "Finish one creative thing this week, even if it's small. Your gift gets stronger with completion, not with starts. The world has enough sparks — be the one who builds a fire.",
  },
  4: {
    title: 'The Builder',
    traits: 'Disciplined · reliable · practical · grounded',
    description: "Number 4 is the energy of structure, slow building, and the satisfaction of solid work. It's the foundation under everything that lasts. People shaped by 4 are the ones others count on — they show up, follow through, and build things that hold.",
    strengths: ['Reliable in ways others find rare', 'Sees long arcs others miss', 'Finishes what they start', 'Brings order to chaos'],
    challenges: ['Rigidity when change is needed', 'Workaholism dressed as duty', 'Pessimism about new ideas', 'Slow to celebrate, quick to find what\'s next'],
    leanInto: "Schedule unstructured time. Your gift is structure — but the unstructured space is where insight lands. The brick is laid; let yourself look at the wall.",
  },
  5: {
    title: 'The Free Spirit',
    traits: 'Adventurous · versatile · freedom-loving · curious',
    description: "Number 5 is the energy of motion, change, and refusing to be boxed in. It's the wanderer, the connector, the one who tries the new thing first. People shaped by 5 learn through experience — they need to taste the world rather than read about it.",
    strengths: ['Adapts to change others find disorienting', 'Wide range of interests and friends', 'Magnetic, brings energy into rooms', 'Sees connections across fields'],
    challenges: ['Restlessness, leaves before things deepen', 'Trouble with long-term commitments', 'Sensory overstimulation', 'Avoids the boring middle of any project'],
    leanInto: "Stay one extra day. The depth your soul actually wants is on the other side of the boredom you keep escaping from. Variety is your gift — but mastery is what variety is supposed to be feeding.",
  },
  6: {
    title: 'The Nurturer',
    traits: 'Responsible · caring · harmonious · family-oriented',
    description: "Number 6 is the energy of care, beauty, and creating spaces where others can thrive. It's the parent, the host, the one who makes a house a home. People shaped by 6 are wired to look after — relationships, family, community, beauty.",
    strengths: ['Genuine warmth that draws people in', 'Eye for beauty and harmony', 'Reliable shoulder to lean on', 'Creates the conditions others need to grow'],
    challenges: ['Over-functioning, doing for others what they should do themselves', 'Resentment when caring goes unacknowledged', 'Tendency to fix rather than witness', 'Self-care comes last'],
    leanInto: "Receive on purpose. Let someone else cook, plan, decide. The world will not collapse — and your nervous system will get a lesson in being held instead of holding.",
  },
  7: {
    title: 'The Seeker',
    traits: 'Analytical · spiritual · introspective · wise',
    description: "Number 7 is the energy of inquiry — the mystic, the scholar, the late-night thinker who needs to understand. It blends sharp analysis with spiritual longing in a way few other numbers do. People shaped by 7 often feel slightly outside the world they're observing.",
    strengths: ['Penetrating insight into patterns and people', 'Comfort with solitude', 'Strong intuition paired with rigour', 'Drawn to truth even when it costs'],
    challenges: ['Isolation that becomes loneliness', 'Cynicism dressed as discernment', 'Trouble translating insight into action', 'Holds the world at arm\'s length'],
    leanInto: "Share what you've figured out. Your gift gets richer when it meets another mind. Truth in solitude is half the work; truth in conversation is the other half.",
  },
  8: {
    title: 'The Achiever',
    traits: 'Powerful · ambitious · business-minded · authoritative',
    description: "Number 8 is the energy of material mastery — money, power, and the systems that move them. It's not about greed; it's about understanding leverage. People shaped by 8 are wired to build, scale, and turn vision into structures that compound.",
    strengths: ['Sees the financial / strategic shape of things', 'Comfortable with authority', 'Endures setbacks others can\'t', 'Turns ideas into infrastructure'],
    challenges: ['Workaholism that crowds out everything else', 'Equates self-worth with output', 'Power dynamics in close relationships', 'Cycles of building and burning out'],
    leanInto: "Define enough. Your gift can run forever — define the finish line so the rest of your life isn't waiting in line behind it. \"More\" is not a destination.",
  },
  9: {
    title: 'The Humanitarian',
    traits: 'Compassionate · idealistic · generous · visionary',
    description: "Number 9 is the energy of completion, compassion, and a wide-angle view. It's the old soul, the one who sees how it all connects. People shaped by 9 carry a sense that they're here for something larger than personal success — though learning to live their own life still matters.",
    strengths: ['Genuine empathy across difference', 'Big-picture thinking', 'Generosity that uplifts communities', 'Endings handled gracefully'],
    challenges: ['Martyr energy, neglecting own needs', 'Difficulty letting go of what should already end', 'Vagueness about own desires', 'Disappointment when others don\'t share the vision'],
    leanInto: "Want what you actually want. The world needs your wide vision — but it also needs you to want a specific small thing and pursue it. Specificity is not a betrayal of compassion.",
  },
  // ─── Master Numbers ──────────────────────────────────────────────────────
  11: {
    title: 'The Illuminator',
    traits: 'Intuitive · inspirational · spiritually evolved · psychically aware',
    description: "Master Number 11 is heightened 2 — partnership and sensitivity dialed up to vision and inspiration. It's the channel, the inspirer, the one whose intuition arrives faster than their reasoning. The gift is real, but the nervous system carrying it is more sensitive than most.",
    strengths: ['Intuitive flashes that turn out to be right', 'Inspires others without trying', 'Bridges spiritual and practical', 'Genuine charisma'],
    challenges: ['Anxiety from over-receptive nervous system', 'Self-doubt about the validity of intuition', 'Burnout from absorbing others\' energy', 'Difficulty grounding the visions'],
    leanInto: "Ground daily. Your nervous system is doing the equivalent of receiving on a wider bandwidth — protect the body that has to carry it. Routine is not the enemy of vision; it's the container.",
  },
  22: {
    title: 'The Master Builder',
    traits: 'Visionary · practical · powerful manifestor · lasting impact',
    description: "Master Number 22 is heightened 4 — discipline and structure dialed up to world-shaping capacity. It's the architect of large, lasting things: institutions, movements, systems that outlive the builder. The gift is rare; living up to it requires patience most people don't have.",
    strengths: ['Vision big enough to matter, executed well enough to last', 'Endures the long middle others abandon', 'Bridges idealism and practicality', 'Legacy-level impact when fully expressed'],
    challenges: ['Crushing pressure of own potential', 'Perfectionism that delays starting', 'Imposter syndrome despite real capability', 'Tendency to play smaller than capacity'],
    leanInto: "Start before you feel ready. The 22 only activates through doing — the gift cannot be thought into being. Accept the early version will be imperfect; build the second, third, tenth.",
  },
  33: {
    title: 'The Master Teacher',
    traits: 'Compassionate · healing · divine service · spiritual elder',
    description: "Master Number 33 is heightened 6 — care and beauty dialed up to spiritual teaching and collective healing. The rarest of the master numbers. It carries the weight of service to something larger, with a tendency to forget the body and life of the person carrying the gift.",
    strengths: ['Healing presence that calms others', 'Wisdom that arrives without effort', 'Capacity to hold large groups in care', 'Selfless service when called'],
    challenges: ['Self-neglect masked as service', 'Difficulty with personal needs and boundaries', 'Burnout from holding too much', 'Loneliness despite being surrounded'],
    leanInto: "Protect your own life. The teaching only stays clear if the teacher is rested, fed, and loved. Self-care isn't a deviation from the path — it's the path's foundation.",
  },
};

const FALLBACK_PROFILE: NumberProfile = {
  title: 'A Compound Energy',
  traits: 'Multifaceted · still being interpreted',
  description: 'This number falls outside the usual single-digit and master-number set. We don\'t have a deep profile for it yet, but the digits that make it up each carry their own meaning worth exploring.',
  strengths: [],
  challenges: [],
  leanInto: '',
};

export function profileForNumber(value: number): NumberProfile {
  return NUMBER_PROFILE[value] ?? FALLBACK_PROFILE;
}
