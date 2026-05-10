/**
 * Plain-English deep content for the Lagna (Rising Sign) drill-down modal.
 *
 * The card on Chart already shows the basics (ruler, traits, life focus,
 * strength, growth edge). Tapping it opens a modal that goes one layer
 * deeper into how *this specific rising sign* shapes the four areas
 * users actually ask questions about: love, work, money, and inner life.
 *
 * Written in plain conversational English — no Sanskrit, no jargon. The
 * Sanskrit name ("Lagna") only appears once in the modal subtitle for
 * users who already know the term; everything else reads like a
 * thoughtful friend explaining your nature to you.
 */

export interface LagnaDeepDetail {
  loveAndRelationships: string;
  workAndPurpose: string;
  moneyAndStability: string;
  innerLifePattern: string;
  /** A short "what your life will keep teaching you" line — the lesson
   *  the Rising Sign tends to repeat over decades. */
  growthArc: string;
}

export const LAGNA_DEEP: Record<string, LagnaDeepDetail> = {
  Aries: {
    loveAndRelationships: "You fall fast and direct — when you're interested, the other person knows. You need a partner who can match your energy without being intimidated by it. Slow-burn romances frustrate you; you want momentum. The challenge: learning to read partners who express love through quieter signals than you do.",
    workAndPurpose: "You thrive when you're starting things, not maintaining them. The first 6 months of any project are where your magic lives. You need autonomy and a clear target. Work that requires diplomatic patience or endless committee meetings will drain you fast — better to lead, found, or pioneer.",
    moneyAndStability: "Money flows in bursts for you, not steady streams. You earn through bold moves and big bets. The risk: spending impulsively when the wins arrive. Build the boring baseline first (savings, recurring income), and let the bigger swings ride on top of it.",
    innerLifePattern: "Your inner world runs on action — when you're stuck, you spiral. The quickest way out of any rut is *doing something*, even something small. Meditation that asks you to sit still tends to fail; meditation through movement (running, martial arts, anything physical) tends to land.",
    growthArc: "Your life will keep teaching you that *finishing* matters more than *starting*. The fire that ignites a hundred projects is your gift; the discipline to see one through is the lesson.",
  },
  Taurus: {
    loveAndRelationships: "You love through presence — showing up, being there, providing comfort and beauty. Your love is durable but slow to declare itself. You need a partner with patience for your timeline; you'll never be rushed. The challenge: trusting that change in a relationship can be growth rather than threat.",
    workAndPurpose: "You're built for crafting, building, and ownership. Work that lets you create something tangible — a business, a product, an estate, a body of skill — fits you. You're allergic to chaos and pivots; pick a direction with care, then go deep. Your endurance is your moat.",
    moneyAndStability: "Money is meant to be enjoyed, not just hoarded. You earn through patience and tend to build genuine wealth over decades. Watch the inverse failure mode: holding onto investments, jobs, or assets past their prime out of attachment to comfort.",
    innerLifePattern: "Your inner peace is tied to your senses. A messy environment, bad food, harsh sounds — these affect you more than they affect most people. Your meditation is sensory: cooking, gardening, music, touch. You access depth through the body, not through the mind.",
    growthArc: "Your life will keep teaching you when to *let go*. What was once nourishing can become heavy if you hold on too long. The Taurus gift is permanence; the lesson is selective release.",
  },
  Gemini: {
    loveAndRelationships: "You fall in love through conversation. A partner who can't keep up with your mind will lose you, even if everything else fits. You need variety, mental stimulation, and the freedom to pursue your endless curiosity. The challenge: cultivating depth with one person rather than breadth across many.",
    workAndPurpose: "You're a connector and translator — between fields, between people, between languages of thought. Writing, teaching, sales, journalism, design, and any work that lets your mind move quickly all suit you. The risk: spreading too thin. Pick 2-3 main lanes; let the rest be hobbies.",
    moneyAndStability: "You earn through information, communication, and varied streams. You're often happiest with multiple income sources rather than one big one. Watch the impulse buy and the shiny-thing tax — your curiosity makes you vulnerable to spending on novelty.",
    innerLifePattern: "Your inner world is busy — many threads, many voices. You'll never have a quiet mind, and trying to force one will exhaust you. Your peace comes from *channelling* the flow, not silencing it: writing, talking, learning. Solitude with a notebook beats solitude alone.",
    growthArc: "Your life will keep teaching you that *depth* lives on the other side of the boredom you keep escaping. The Gemini gift is range; the lesson is going one inch deeper than feels comfortable.",
  },
  Cancer: {
    loveAndRelationships: "You love through care — feeding, remembering, holding. Once you've let someone in, your loyalty is bone-deep. You need a partner who reciprocates emotional attentiveness; cool, distant types will starve you slowly. The challenge: not absorbing your partner's moods so completely that your own get lost.",
    workAndPurpose: "You're at your best when your work feels like care for people. Healthcare, teaching, hospitality, food, design that creates emotional refuge — these fit. You'll struggle in environments that demand emotional armour; soft skin is part of your gift, not a flaw to fix.",
    moneyAndStability: "Money for you is about safety, not status. You'll save more than most people think reasonable, and that's healthy. Watch the inverse: financial anxiety that no amount of savings cures. The work is psychological, not numerical.",
    innerLifePattern: "Your moods come in tides — high, low, high, low. Resisting them makes them worse; surfing them is the practice. You need a private space (literal or emotional) to retreat to, and a few people who've earned the right to see you when the tide is out.",
    growthArc: "Your life will keep teaching you that *boundaries* are a form of love, not its opposite. The Cancer gift is unconditional care; the lesson is care that includes yourself.",
  },
  Leo: {
    loveAndRelationships: "You love generously and theatrically — gifts, gestures, public declarations. You need a partner who can both witness your light and have their own. Lovers who shrink you out of insecurity won't last; neither will ones who refuse to be impressed. The challenge: distinguishing real adoration from performance.",
    workAndPurpose: "You're a creator and a leader — work that puts you on a stage (literal or metaphorical) brings out your best. The arts, entrepreneurship, anything where your unique signature shows. The trap: needing the applause more than the work itself. Build a practice that's satisfying even when no one's watching.",
    moneyAndStability: "You earn through visibility and creative output. You'll spend on quality and on experiences that affirm your sense of self — and that's not always wrong. Watch the failure mode: lifestyle inflation, keeping up appearances, making money decisions to manage how you appear rather than what you want.",
    innerLifePattern: "Your inner world is bright and dramatic, prone to highs and lows of meaning. You're more sensitive than you let on, especially to feeling overlooked. Your practice is recognising your own light without needing external mirrors. The deeper Leo path is from \"see me\" to \"I see myself.\"",
    growthArc: "Your life will keep teaching you that *the light is real whether or not anyone applauds it*. The Leo gift is radiance; the lesson is sourcing it from inside.",
  },
  Virgo: {
    loveAndRelationships: "You love through service — small acts, attention to detail, remembering exactly how someone takes their tea. Your love is precise and reliable. You need a partner who values craft over flash; one who notices your attentiveness and reciprocates. The challenge: letting go of the inner critic when it turns on the relationship itself.",
    workAndPurpose: "You're a craftsperson at heart. Work that demands precision, mastery, and continuous refinement is your home — analytics, editing, surgery, teaching, software, design. You quietly outperform flashier colleagues over time. The trap: perfectionism that delays shipping. Done beats perfect; *done well* beats both.",
    moneyAndStability: "You earn through skill and reliability. You'll save methodically and tend toward the boring-but-correct financial choices. Watch the failure mode: anxiety that stays high regardless of net worth. The fix is a written plan you check rarely, not a spreadsheet you check daily.",
    innerLifePattern: "Your inner world is analytical — always sorting, refining, improving. The same gift that makes you good at work can be hard on your psyche. The practice is turning the analyst's gentleness toward yourself: noticing what's working as carefully as what isn't.",
    growthArc: "Your life will keep teaching you that *imperfect and present* is more useful than *perfect and late*. The Virgo gift is discernment; the lesson is gentleness with the imperfect — including yourself.",
  },
  Libra: {
    loveAndRelationships: "You're built for partnership — relationships are how you process the world. You think in \"we\" before \"I.\" You need a partner who values fairness as much as you do; one-sided dynamics will slowly poison you. The challenge: knowing what *you* want, separate from what would keep things harmonious.",
    workAndPurpose: "You shine in roles that involve people, beauty, and balance — design, law, mediation, hospitality, public-facing leadership, any work where aesthetic and relational intelligence matter. The trap: avoiding hard decisions because they'd disappoint someone. Real fairness sometimes requires choosing.",
    moneyAndStability: "You spend on beauty and on people you love — and that's often the right call. You earn through relationships and reputation. Watch the failure mode: financial decisions made to keep peace (with a partner, family, business associate) rather than to serve your actual interests.",
    innerLifePattern: "Your inner world is relational — you'll figure out what you think by talking it through with someone. Pure solitude tends to feel hollow, not restorative. Your meditation is *with* the world, not away from it: a long walk with a friend, a conversation that goes deep.",
    growthArc: "Your life will keep teaching you to *take a stand*. The Libra gift is seeing every side; the lesson is occasionally choosing one even when it costs you a little harmony.",
  },
  Scorpio: {
    loveAndRelationships: "You love deeply or not at all — there's no middle gear. When you're in, you're all in: emotionally, physically, energetically. You need a partner who can match that depth without being overwhelmed by it. The challenge: trust. Once it's broken, your shell is hard to crack again — and the practice is staying open to repair.",
    workAndPurpose: "You're drawn to depth — psychology, research, investigation, finance, healing, anything that requires going beneath the surface. Surface-level work bores you fast. You're underestimated until people see what you've quietly been building. The trap: holding power too tightly when sharing it would actually serve you.",
    moneyAndStability: "You're shrewd with money and tend to play long games — investing, building leverage, controlling your runway. Watch the failure mode: secrecy around finances that creates problems where transparency would have prevented them.",
    innerLifePattern: "Your inner world is intense — you feel deeply and you carry old emotional information longer than most. The practice is *transmuting* rather than *suppressing*: art, therapy, intense physical practice. You're built to compost the difficult into the powerful, but it requires going through it, not around.",
    growthArc: "Your life will keep teaching you that *vulnerability* is the strength, not the weakness. The Scorpio gift is depth; the lesson is letting another being witness yours.",
  },
  Sagittarius: {
    loveAndRelationships: "You love freedom in love — a partner who tries to cage you will lose you fast. You're drawn to people who expand your world: different cultures, philosophies, viewpoints. The challenge: staying past the honeymoon. The first three months are easy; the long arc requires discipline.",
    workAndPurpose: "You're a teacher, philosopher, or explorer at heart. Work that lets you travel, expand, share what you know, or connect across cultures fits you best — academia, travel, publishing, religion, international business. The trap: starting big things and abandoning them when the next horizon calls.",
    moneyAndStability: "Money for you is fuel for adventure, not the goal. You'll spend on travel and learning more than on possessions. You can be optimistic to your detriment with finances — \"it'll work out\" doesn't always work out. The practice is building a financial plan that protects future you from present-you's optimism.",
    innerLifePattern: "Your inner world thrives on horizons — physical, intellectual, spiritual. You feel most alive when you're growing. The flip side: when you're not growing, you go restless quickly. The practice is finding daily growth in small things rather than waiting for the next big trip.",
    growthArc: "Your life will keep teaching you to *land*. The Sagittarian gift is expansion; the lesson is taking root somewhere — relationships, place, practice — long enough for the seeds to actually fruit.",
  },
  Capricorn: {
    loveAndRelationships: "You love through commitment and provision — you build a life with someone, brick by brick. You're slow to declare love and slower to leave it. You need a partner who values your steadiness without expecting you to be the only adult in the relationship. The challenge: warmth in expression. Your love is real but quiet; some partners need it spoken.",
    workAndPurpose: "You're built for the long game — career, mastery, legacy. Work that compounds (institutions, skills, reputation) suits you. You'll outwork everyone, often quietly. The trap: letting work crowd out everything else. Nobody at the end of life wishes they'd spent more time at the office, even Capricorns.",
    moneyAndStability: "You're naturally good with money — saving, planning, building. Wealth tends to accumulate over decades almost regardless of what you do. Watch the failure mode: scarcity mindset that persists past the point of actual scarcity. At some point, *spend it*.",
    innerLifePattern: "Your inner world runs on responsibility — duty, structure, what's owed. The shadow: this can become a heaviness that crowds out joy. The practice is *play* — deliberate, scheduled, treated as seriously as work. Capricorns need a hobby with no productive purpose.",
    growthArc: "Your life will keep teaching you that *enough* is a place you can choose to arrive at. The Capricorn gift is endurance; the lesson is recognising when the climb is the destination.",
  },
  Aquarius: {
    loveAndRelationships: "You love unconventionally — you'll find your own template rather than follow received wisdom. You need a partner who respects your need for space and intellectual freedom. The challenge: emotional intimacy. You're warm at a distance; the practice is staying open in close range, where ideas matter less and presence matters more.",
    workAndPurpose: "You're built for futures — technology, social change, the systems other people haven't seen yet. Work that's purely conventional will bore you. You shine in roles where you can build the new thing, name the unnamed, organise people around a vision. The trap: idealism that resists practical compromise.",
    moneyAndStability: "Money for you is a tool for freedom, not status. You'll work for ideas you believe in even if the pay is worse. Watch the failure mode: irregular income from following passion projects without a baseline that stabilises the rest. Build the boring base; let the visionary work ride on top.",
    innerLifePattern: "Your inner world is conceptual — you process feelings through frameworks. The strength and the trap: emotions that aren't intellectualised feel chaotic, but the intellectualisation can also become a way to avoid actually feeling. The practice is letting feelings exist before you understand them.",
    growthArc: "Your life will keep teaching you to *come closer*. The Aquarian gift is the wide view; the lesson is the specific person right in front of you, who matters more than any idea about humanity in general.",
  },
  Pisces: {
    loveAndRelationships: "You love with a porous heart — you feel your partner's feelings as your own. The depth and connection are real; the challenge is keeping a self when you're so merged. You need a partner who is themselves a clear, grounded presence — chaos in your partner becomes chaos in you. The practice is loving without dissolving.",
    workAndPurpose: "You're built for work that touches the unseen — art, healing, music, spirituality, mental health, fields where intuition and empathy are competitive advantages. Hard-edged corporate environments will drain you. You're often happiest with semi-structured work, room to flow, and creative latitude.",
    moneyAndStability: "Money is the most uncomfortable area for you — it's so concrete, so clear, so unlike how you naturally process the world. You'll either avoid thinking about it (and get into trouble) or worry about it constantly (and not enjoy what you have). The practice is automation: rules and systems you set once that handle the practical for you.",
    innerLifePattern: "Your inner world is oceanic — vast, beautiful, sometimes overwhelming. You absorb other people's emotional states whether you want to or not. Your nervous system needs more recovery time than most people's, and protecting that isn't optional. Solitude is medicine, not luxury.",
    growthArc: "Your life will keep teaching you to *anchor*. The Pisces gift is the wide ocean; the lesson is the specific commitment, the practical structure, the daily routine — the things that keep you from drifting.",
  },
};

export function lagnaDeep(lagna: string): LagnaDeepDetail | null {
  return LAGNA_DEEP[lagna] ?? null;
}
