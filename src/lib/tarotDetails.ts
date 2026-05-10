/**
 * Plain-English deep content for every tarot card.
 *
 * Two layers:
 *
 *   1. Major Arcana (22 cards) — each authored individually with rich
 *      "what it means," strengths, watch-fors, and a "what to do today"
 *      prompt. These are the iconic cards users actually want to learn.
 *
 *   2. Minor Arcana (56 cards) — composed from a (suit × rank) template.
 *      Each suit has an essence (Wands = action, Cups = feeling,
 *      Swords = thought, Pentacles = matter); each rank has an arc
 *      (Ace = seed, 5 = challenge, 10 = completion, etc.). The
 *      composer pairs them to produce cards like "the cup that has
 *      just begun to fill" instead of a one-line keyword.
 *
 * No API call. Same chart + same card → same content. The Claude
 * reading lives on top of this — this layer is for tap-to-learn.
 */

import type { DrawnCard, Suit } from '@utils/tarot';

export interface TarotDetail {
  /** Plain-English title for the card. Falls back to the card.name. */
  title: string;
  /** A 1-2 sentence essence of what this card represents. */
  essence: string;
  /** Plain-English upright meaning, 2-3 sentences. */
  upright: string;
  /** Plain-English reversed meaning, 2-3 sentences. */
  reversed: string;
  /** Bullet points: what this card invites when it appears upright. */
  uprightLeanInto: string[];
  /** Bullet points: what to be careful about (esp. when reversed). */
  watchFor: string[];
  /** A short prompt — "what to do today if this card appeared." */
  practiceHint: string;
  /** The vedic-cross planetary correspondence in plain English. */
  vedicLens: string;
}

// ─── Major Arcana ────────────────────────────────────────────────────────────

const MAJOR_DETAIL: Record<string, TarotDetail> = {
  'The Fool': {
    title: 'The Fool — The Leap',
    essence: 'The card of beginnings — stepping off the cliff with faith that the path will appear under your feet.',
    upright: "Something new is about to start, and the only sane move is to begin without knowing exactly where it leads. The Fool's wisdom is that everything important started this way: jobs, relationships, creative works, lives. Trust matters more than certainty here.",
    reversed: "You're hesitating at the edge of a leap that's already overdue, or you've leapt without enough sense to land well. Either too much caution or too much recklessness — the practice is finding the middle.",
    uprightLeanInto: ['Saying yes before you feel ready', 'Beginnings that scare you a little', 'Trust that the next step will reveal itself', 'Childlike curiosity over expert posture'],
    watchFor: ['Naïveté that ignores real warnings', 'Jumping into something to escape another thing', 'Burning bridges before you\'ve walked far enough to need them gone'],
    practiceHint: 'Take one small irreversible step toward the new thing. Buy the ticket. Send the message. Begin.',
    vedicLens: 'Connected to Mercury\'s curious, unattached mind — and to the energy of a chart that\'s ready to start a new dasha or major life chapter.',
  },
  'The Magician': {
    title: 'The Magician — The Channel',
    essence: 'You have everything you need to make the thing happen. The card is asking you to actually use what\'s in your hands.',
    upright: "The four tools of the magician (cup, sword, wand, pentacle) are all on the table — emotion, mind, will, matter. You have the full kit. The question is whether you'll focus all four toward one specific outcome instead of dabbling.",
    reversed: "Power is being scattered or used to manipulate rather than create. Talent that isn't being directed. Or you're under-estimating what you actually have to work with.",
    uprightLeanInto: ['Focusing all your tools on one outcome', 'Owning your power without apologising', 'Manifesting through specific action, not just intention'],
    watchFor: ['Manipulation disguised as charm', 'Trickery that costs you trust', 'Confusing "I could do this" with "I am doing this"'],
    practiceHint: 'List the four resources you actually have. Pick one specific outcome. Direct all four toward it this week.',
    vedicLens: 'Resonates with Mercury (communication, skill) and a focused, confident Mars — the chart\'s "willpower in motion" energy.',
  },
  'The High Priestess': {
    title: 'The High Priestess — The Inner Knowing',
    essence: 'The card of intuition that knows things the rational mind hasn\'t caught up to yet. Trust the quieter signal.',
    upright: "Something in you already knows the answer. The Priestess sits between two pillars — the mystery is still hidden in books for the asking mind, but accessible in the body for the receiving one. Slow down and listen rather than push.",
    reversed: "Intuition has been ignored, often for so long the signal has gone faint. Or what's coming through is anxiety dressed as intuition. The work is distinguishing them.",
    uprightLeanInto: ['Listening more than speaking', 'Dreams, journaling, anything that lets the unconscious surface', 'Patience with answers that won\'t arrive on demand'],
    watchFor: ['Calling fear "intuition"', 'Withholding what you know from people who deserve to hear it', 'Hiding rather than revealing'],
    practiceHint: 'Sit with the question for ten minutes without trying to solve it. Write whatever surfaces, even if it makes no sense yet.',
    vedicLens: 'Connected to the Moon — the Vedic Chandra. When this card appears alongside a strong Moon in your chart, the gift is amplified.',
  },
  'The Empress': {
    title: 'The Empress — Abundance & Nurture',
    essence: 'The card of fullness, fertility, and creating conditions where things grow — projects, people, gardens, ideas.',
    upright: "Something in your life is in a season of growth. Relationships are deepening, creative work is flowing, the body feels well. The Empress invites you to enjoy the fullness rather than rush past it toward the next thing.",
    reversed: "Creative block, dependency, or self-neglect has crept in. Or you're giving so much to others that nothing's left for you. The Empress reversed asks who's tending the gardener.",
    uprightLeanInto: ['Receiving as much as you give', 'Sensual presence — food, body, touch, beauty', 'Trusting the timeline of what\'s growing'],
    watchFor: ['Over-giving until you\'re depleted', 'Confusing comfort with growth', 'Possessiveness toward what you\'ve nurtured'],
    practiceHint: 'Tend something that\'s yours. Cook a real meal, refresh a corner of your home, water the literal plants. Let care be reciprocal.',
    vedicLens: 'Strongly Venusian — Shukra\'s themes of beauty, art, sensual fullness, and what makes life genuinely sweet.',
  },
  'The Emperor': {
    title: 'The Emperor — Structure & Authority',
    essence: 'The card of structure, fatherhood, and the discipline that turns vision into something that holds up over time.',
    upright: "It's time to build the architecture under your dream. The Emperor is the part of you that follows through — the steady, structured energy that takes the bigger vision and makes it real with rules, routines, and consistent showing up.",
    reversed: "Authority is rigid, controlling, or absent. Either too much 'father' energy (domineering, inflexible) or too little (no structure, no discipline, drift). Either way needs adjustment.",
    uprightLeanInto: ['Setting structures that make the work easier', 'Owning your authority without apology', 'Long-term thinking — what compounds over decades'],
    watchFor: ['Rigidity disguised as discipline', 'Domination of others, especially family or team', 'Structure that has outlived its purpose'],
    practiceHint: 'Set up one rule for yourself this week and follow it without exception. Discipline is not punishment; it\'s gravity for the things you care about.',
    vedicLens: 'Strongly resonates with the Sun (Surya — authority, leadership) and Saturn (Shani — structure, discipline) working together.',
  },
  'The Hierophant': {
    title: 'The Hierophant — Tradition & Mentorship',
    essence: 'The card of inherited wisdom — schools, traditions, mentors, lineages. What\'s been worked out by people who came before.',
    upright: "Knowledge is available to you through someone or something with established credibility. A mentor, a school, a religious or spiritual tradition, a body of received wisdom. Sometimes the right move is to learn what others have already figured out instead of rebuilding from scratch.",
    reversed: "Rebellion against received tradition — sometimes healthy (the tradition is rotten), sometimes premature (you haven\'t earned the right yet to discard it). Or empty conformity to rules without understanding their original purpose.",
    uprightLeanInto: ['Finding a mentor or teacher you actually respect', 'Studying a tradition seriously rather than dabbling', 'Honouring what\'s been handed down'],
    watchFor: ['Conformity to rules you don\'t actually believe', 'Hierarchy that demands obedience without earning trust', 'Mistaking heritage for current truth'],
    practiceHint: 'Identify one person whose path you respect. Reach out, take their course, read their book, sit at their table. Discipleship is unfashionable but it works.',
    vedicLens: 'Connected to Jupiter (Guru — the teacher, the wisdom-tradition). When Jupiter is well-placed in your chart, this card\'s gift comes naturally.',
  },
  'The Lovers': {
    title: 'The Lovers — Choice & Union',
    essence: 'The card of love, alignment of values, and the choices that define who you become.',
    upright: "Something is asking for a soul-level choice — usually about love, sometimes about a value-based fork in the road. The Lovers is not just romance; it's about the choices that align you with your own deeper truth, even when easier paths exist.",
    reversed: "Misalignment in a relationship, or a choice being made for the wrong reasons (status, fear, convention). The work is uncovering what you actually want, separate from what looks right.",
    uprightLeanInto: ['Choices made from values, not convenience', 'Honest conversations with people you love', 'Alignment between what you say and what you do'],
    watchFor: ['Choosing partners who reflect your insecurity rather than your wholeness', 'Avoiding the choice altogether', 'Romanticising what\'s actually a problem'],
    practiceHint: 'Name the choice you\'ve been avoiding. Write down what your honest values say about it. Then move.',
    vedicLens: 'Venus + Mercury — heart aligned with mind. The choice card is at its strongest when both Venus and Mercury are well-disposed in your chart.',
  },
  'The Chariot': {
    title: 'The Chariot — Willpower & Direction',
    essence: 'The card of focused will — yoking opposing forces and driving toward a specific destination.',
    upright: "You have momentum and direction. The Chariot says: keep going, hold the reins, don't let the horses pull you off course. Discipline + drive = arrival. The card is most powerful when the goal is genuinely yours, not someone else's idea of what you should want.",
    reversed: "Direction is unclear, the horses are pulling against each other, willpower is scattered. Or you're driving fast toward a destination you didn't actually choose. Either way: stop and re-aim before going further.",
    uprightLeanInto: ['Holding the line through the boring middle', 'Finishing what you started rather than starting again', 'Focused intensity over scattered effort'],
    watchFor: ['Aggression masquerading as drive', 'Steamrolling others to "get there"', 'Goal-fever that misses what you\'re actually here for'],
    practiceHint: 'Pick one goal, write down its three-month vision, calendar this week toward it. Will is built through repetition.',
    vedicLens: 'Mars (Mangala) energy — disciplined and aimed. When Mars is strong in your chart, this card\'s gift comes naturally.',
  },
  'Strength': {
    title: 'Strength — Gentle Power',
    essence: 'The card of inner courage — the strength of patience and compassion, not domination.',
    upright: "There's a force in your life that needs taming, not breaking — an inner fear, a wild emotion, a difficult person, a pattern. Strength shows the woman with the lion: she doesn't slay it, she places her hand on its mouth. The deeper power is gentle.",
    reversed: "Self-doubt, raw emotion overwhelming, force misapplied. Or strength being faked — bravado masking fragility. The work is finding the genuine version: courage that doesn't need to dominate.",
    uprightLeanInto: ['Patience with what\'s difficult', 'Compassion toward your own flaws', 'Courage that whispers rather than shouts'],
    watchFor: ['Suppressing rather than integrating', 'Strength as performance', 'Domination disguised as discipline'],
    practiceHint: 'When the impulse is to react, pause for 60 seconds. The pause IS the strength.',
    vedicLens: 'Sun (vital strength) tempered by Moon (compassion). The cards reads as inner courage — atma bala in Vedic terms.',
  },
  'The Hermit': {
    title: 'The Hermit — Inner Light',
    essence: 'The card of solitude with purpose — withdrawing from the noise to find the lamp inside.',
    upright: "Some answers are only available in silence. The Hermit invites a deliberate retreat — not from life, but from the noise that drowns out the inner signal. The lamp the Hermit holds is for himself first, and only by extension for others.",
    reversed: "Isolation that's tipped into loneliness, or refusing solitude when the soul needs it. Sometimes also: hiding behind solitude as an excuse to avoid what scares you.",
    uprightLeanInto: ['Deliberate solitude — silence, walks, retreats', 'Inner inquiry over external advice', 'Slow processing of what you already know'],
    watchFor: ['Withdrawal that becomes avoidance', 'Spiritual bypassing — using solitude to skip the hard human work', 'Refusing help you genuinely need'],
    practiceHint: 'Schedule two hours alone this week with no phone, no input. Bring a notebook. See what surfaces.',
    vedicLens: 'Saturn (Shani) — disciplined inwardness. When Saturn is doing important work in your chart (Sade Sati, Saturn dasha), this card reflects the season.',
  },
  'Wheel of Fortune': {
    title: 'Wheel of Fortune — The Cycle Turns',
    essence: 'The card of cycles, fate, and the moments when forces larger than you are clearly at work.',
    upright: "Something is turning. Not because of a decision you made — because the wheel itself is moving. The Wheel says: ride the upswing when it comes, stay grounded when the descent comes. Both are part of the same cycle.",
    reversed: "Resistance to a change that's already underway, or stuck in a pattern that keeps repeating. Bad luck that's actually the same lesson trying to land. Sometimes the wheel needs a different relationship from you — surrender, or course-correction.",
    uprightLeanInto: ['Acceptance of what\'s outside your control', 'Riding the upswing without becoming attached', 'Pattern recognition — what cycle is repeating'],
    watchFor: ['Treating luck as identity', 'Despair on the descent', 'Forcing what wants to wait'],
    practiceHint: 'Name the bigger cycle you\'re in (career, relationship, life chapter). Where on the wheel are you? Don\'t fight gravity.',
    vedicLens: 'Jupiter (expansion, fortune) interacting with the dasha cycle — the natural turning of life chapters.',
  },
  'Justice': {
    title: 'Justice — Cause & Consequence',
    essence: 'The card of truth, fairness, and the moments when actions catch up with outcomes — for better or worse.',
    upright: "Something is being weighed. The Justice card asks for honesty over convenience, even when honesty costs. What you've sown is what you'll reap; that's not punishment, it's how the system works. Live as though the consequences will land.",
    reversed: "Avoidance of consequences, dishonesty, or imbalance that hasn't been corrected. Sometimes the system itself is unjust and the card is asking you to call it out. Other times the work is your own accountability.",
    uprightLeanInto: ['Honest accounting of where you\'ve been less than fair', 'Decisions made through values, not optics', 'Speaking the truth even when it costs'],
    watchFor: ['Self-righteousness disguised as justice', 'Refusing to forgive when accountability has been done', 'Black-and-white thinking in grey situations'],
    practiceHint: 'Where have you avoided a hard truth this month? Tell it — to yourself first, then to whoever needs to hear it.',
    vedicLens: 'Saturn (Shani — the karmic accountant) and Jupiter (Guru — the wisdom that knows when truth serves). Together they form the inner judge.',
  },
  'The Hanged Man': {
    title: 'The Hanged Man — Sacred Pause',
    essence: 'The card of surrender, perspective shift, and finding insight by stopping the struggle.',
    upright: "There's a problem you can't solve from inside it. The Hanged Man hangs upside-down by choice — the perspective shift is the gift. Stop pushing. Stop trying. Sometimes the way through is by hanging there until you see it from a different angle.",
    reversed: "Stuck without insight — the pause has tipped into stagnation. Or martyrdom: staying in pain for a sacrifice that isn't actually serving anyone. The work is moving when movement returns, not before, but also not too far after.",
    uprightLeanInto: ['Stopping when you can\'t solve it through effort', 'Perspective changes, even literal ones (different room, different city, different angle)', 'Trusting the dormant period'],
    watchFor: ['Pause that becomes paralysis', 'Sacrifice no one asked for', 'Self-pity dressed as spiritual surrender'],
    practiceHint: 'For one day, stop trying to solve the thing. Live around it. See what arrives in the silence.',
    vedicLens: 'Ketu (release, surrender, dissolution of ego). When Ketu is active in your chart, this card\'s pause is amplified.',
  },
  'Death': {
    title: 'Death — Transformation',
    essence: 'The card of endings that make space for the new — not literal death, but the kind that has to happen for something else to begin.',
    upright: "Something is ending so something else can begin. Death is the most misread card in the deck — it almost never means literal death. It means: the chapter is closing, finally. Resistance to the ending makes it harder, not optional.",
    reversed: "Resistance to a change that's already happened in essence, even if the form hasn't caught up. Holding onto what's already gone. The work is letting go — fully, not partially.",
    uprightLeanInto: ['Cleaning out — emotional, physical, relational', 'Endings done well, with grace', 'Trust that the next thing arrives faster when you make space'],
    watchFor: ['Pretending the chapter is still open when it\'s not', 'Holding for sentiment what should release', 'Confusing nostalgia with current truth'],
    practiceHint: 'Name what\'s already over. Have the closing conversation. Throw out the old box. Let the new arrive.',
    vedicLens: 'Scorpio energy (Mars+Pluto) — transformation and rebirth. Often appears around major dasha transitions.',
  },
  'Temperance': {
    title: 'Temperance — Blending Opposites',
    essence: 'The card of balance, patience, and the quiet alchemy of mixing things until something better emerges.',
    upright: "You're being asked to blend rather than choose. Two truths can be held at once. The Temperance angel pours water between two cups — the work is the careful mixing, not the rapid resolution. Patience is the active ingredient.",
    reversed: "Excess in one direction, imbalance, or impatience. Trying to force a resolution before the slow alchemy is done. Either too much of one thing or rushing the integration.",
    uprightLeanInto: ['Patience with the long process', 'Holding contradiction without resolving prematurely', 'The middle path — neither extreme'],
    watchFor: ['Imbalance that\'s gone past adjustment range', 'Forcing a synthesis before the elements are ready', 'Lukewarm, in a way that\'s avoiding rather than blending'],
    practiceHint: 'What two opposing things are you trying to choose between? Ask whether the answer is integration rather than picking. Sometimes both is the truth.',
    vedicLens: 'Mercury (the messenger that travels between realms) and Jupiter (the wisdom that holds opposites). Strong with a well-disposed Mercury.',
  },
  'The Devil': {
    title: 'The Devil — Chosen Bondage',
    essence: 'The card of attachment, addiction, and the chains we wear that aren\'t actually locked — we\'re holding the key.',
    upright: "Something has you bound, and the chains aren't actually as tight as they feel. The Devil isn't punishment — it's a mirror showing you what you've consented to. Look at the figures: the chains are loose. They could step away. The trap is believing they can't.",
    reversed: "Awareness is dawning — you're seeing the bondage for what it is. The work is putting down the chain, often slowly, sometimes with help.",
    uprightLeanInto: ['Honest naming of what has you trapped', 'Looking at the addiction / pattern / relationship without flinching', 'The first step toward freedom — admitting'],
    watchFor: ['Pretending you don\'t have agency when you do', 'Romanticising the trap', 'Taking the chain off only to put it back on'],
    practiceHint: 'Name one attachment that is costing you more than it gives. Just naming it is the first move.',
    vedicLens: 'Saturn (Shani — karmic patterns) and Rahu (compulsive desire, attachment). Strong when Rahu is doing major work in your chart.',
  },
  'The Tower': {
    title: 'The Tower — The Necessary Collapse',
    essence: 'The card of sudden upheaval — the false structure cracks and what\'s left is the real ground.',
    upright: "Something built on a false foundation is collapsing. The Tower is shocking but rarely arbitrary — it removes what wouldn\'t hold, fast. The relief on the other side is real. What remains is what was actually true.",
    reversed: "Avoiding the collapse that needs to happen, or the collapse has already happened and you're picking up pieces of something that should stay broken. Sometimes also: a Tower experience handled with unusual grace, the lightning still strikes but you bend with it.",
    uprightLeanInto: ['Surrender to what\'s collapsing — it would have collapsed eventually', 'Trust that the foundation underneath is real', 'Speed of recovery, not delay'],
    watchFor: ['Trying to rebuild what shouldn\'t be rebuilt', 'Despair when relief is closer than it feels', 'Blaming the lightning for the rotten beams'],
    practiceHint: 'What in your life is structurally unsound? Don\'t shore it up — let it fall now, under your control, rather than later, under no one\'s.',
    vedicLens: 'Mars (Mangala — sudden action) striking what Saturn (the slow rot) has been weakening. Both planets active = Tower season.',
  },
  'The Star': {
    title: 'The Star — Hope After the Storm',
    essence: 'The card of renewal, gentle faith, and the quiet returning of light after a dark passage.',
    upright: "Something hard has passed. The Star arrives after the Tower — it's the cool water poured on burned earth. Hope returns, not as a sunrise but as a single bright point in the night. Trust the gentleness.",
    reversed: "Faith is wavering or has gone out. Despair, disconnection, or the cynicism that follows hope being broken too many times. The work is letting hope be small again — not grand, just present.",
    uprightLeanInto: ['Quiet faith over grand optimism', 'Letting yourself heal — actively, slowly', 'Re-engagement with what gives life meaning'],
    watchFor: ['Spiritual bypassing — using "hope" to skip the integration work', 'Hope as performance', 'Disappointment when the renewal is gradual rather than instant'],
    practiceHint: 'Identify one thing that genuinely gives you hope. Spend ten minutes with it today. Hope is built, not summoned.',
    vedicLens: 'Venus (Shukra — beauty, sweetness, returning) often combined with Jupiter (Guru — faith). The chart\'s gentle-medicine combination.',
  },
  'The Moon': {
    title: 'The Moon — Mystery & Illusion',
    essence: 'The card of the unconscious, dreams, intuition, and the things that can\'t be seen clearly in the daylight of reason.',
    upright: "You're in the territory of the unconscious — dreams, fears, intuitions, hidden information. The Moon's light is real but doesn't show things clearly the way the Sun does. The practice is staying open to what comes through fog without demanding clarity prematurely.",
    reversed: "Confusion is lifting, or anxiety that wasn't real is fading. Sometimes also: deception revealed, secrets surfacing, the dreamlike quality giving way to waking truth.",
    uprightLeanInto: ['Dream journaling, intuitive practices', 'Not forcing clarity before it\'s ready', 'Trust the body\'s signals over the mind\'s arguments'],
    watchFor: ['Anxiety treated as intuition', 'Acting on unclear information', 'Romance with confusion — staying lost feels safer than landing'],
    practiceHint: 'Write down a recurring dream or feeling you can\'t name. Don\'t interpret it — just describe it. Information arrives sideways here.',
    vedicLens: 'The Moon (Chandra) itself — the most direct correspondence in the deck. Strong when your natal Moon is in a watery or hidden house.',
  },
  'The Sun': {
    title: 'The Sun — Joy & Vitality',
    essence: 'The card of clarity, joy, and the simple goodness of being alive — the most directly positive card in the deck.',
    upright: "Joy has arrived, or is available if you let it in. The Sun is unsubtle — health, happiness, success, clarity, simple goodness. The card asks not for analysis but for presence. Let yourself enjoy it.",
    reversed: "Joy dampened — temporary clouds, ego flare, or success that hasn't been allowed to land. Sometimes also: forced positivity covering grief, the Sun as performance rather than presence.",
    uprightLeanInto: ['Receiving the good news without flinching', 'Visibility — being seen for the good thing', 'Simple joys, child-like delight'],
    watchFor: ['Performing happiness rather than feeling it', 'Ego inflation when sunshine arrives', 'Refusing the joy because it feels undeserved'],
    practiceHint: 'Find one thing today that makes you genuinely happy. Spend 30 minutes with it without checking your phone.',
    vedicLens: 'The Sun (Surya) — vitality, recognition, the soul\'s essential light. Strongest when your natal Sun is exalted or well-aspected.',
  },
  'Judgement': {
    title: 'Judgement — The Calling',
    essence: 'The card of awakening, reckoning, and the moment you hear your own name called.',
    upright: "Something is asking you to rise — a calling, a chance to take stock, a resurrection of an old purpose. Judgement is not punishment; it's the angel's trumpet calling people up out of their coffins. Show up to your own life.",
    reversed: "Self-doubt about a calling, or harsh self-judgement that paralyses. Sometimes ignoring the call entirely — pretending you didn't hear what you definitely heard.",
    uprightLeanInto: ['Honest reckoning with where you\'ve been', 'Saying yes to a calling you\'ve been hedging on', 'Forgiveness — yourself first'],
    watchFor: ['Harsh self-judgement disguised as accountability', 'Avoidance of the calling because you\'re afraid you won\'t live up to it', 'Reckoning that becomes self-flagellation'],
    practiceHint: 'What\'s the thing you\'ve been called to that you keep dodging? Take one concrete step toward it today.',
    vedicLens: 'Pluto / Saturn — the deep reckoning and second-chance themes that show up around major dasha transitions.',
  },
  'The World': {
    title: 'The World — Completion',
    essence: 'The card of integration, fulfilment, and the satisfaction of a chapter properly closed.',
    upright: "Something has come full circle. The World is the moment of arrival — the project finished, the lesson integrated, the long road completed. Take the moment. The next cycle starts soon, but first: this is yours.",
    reversed: "Loose ends, almost-there, lack of closure. Either premature claims of completion or genuine work still needing to be done before the chapter actually closes.",
    uprightLeanInto: ['Letting yourself feel the completion', 'Honouring what it took to get here', 'The pause before the next beginning'],
    watchFor: ['Skipping the celebration', 'Calling it done before it is', 'Restlessness that won\'t let the moment land'],
    practiceHint: 'What in your life is actually complete? Mark it. Tell someone. Pour the metaphorical drink. The next thing waits.',
    vedicLens: 'Saturn (mastery achieved) + Jupiter (wisdom integrated). The completion of a major dasha period often resonates with this card.',
  },
};

// ─── Minor Arcana — composed from suit + rank templates ──────────────────────

const SUIT_ESSENCE: Record<Suit, { realm: string; essence: string; vedicLens: string }> = {
  wands:     { realm: 'action and creative will', essence: 'fire — what you do, the passion that drives, the spark of new ventures', vedicLens: 'Mars (drive, action) and Sun (vital will).' },
  cups:      { realm: 'feeling and relationship',  essence: 'water — what you feel, the heart\'s currents, the relational world', vedicLens: 'Moon (emotional life) and Venus (love, beauty).' },
  swords:    { realm: 'thought and communication', essence: 'air — what you think, the mind\'s clarity or struggle, words and ideas', vedicLens: 'Mercury (intellect, communication) and Saturn when the thinking is heavy.' },
  pentacles: { realm: 'matter and money',          essence: 'earth — what you build, the body, money, work, and the tangible world', vedicLens: 'Saturn (long-term building) and Venus (material enjoyment).' },
};

interface RankTemplate {
  arc: string;          // What this rank represents in the suit's arc
  uprightLean: string[];
  reversedWatch: string[];
}

const RANK_TEMPLATES: Record<number, RankTemplate> = {
  1:  { arc: 'a seed, the gift offered, the start of something new in this realm',
        uprightLean: ['Saying yes to the offering', 'New beginnings handled with care', 'Trust in the fresh impulse'],
        reversedWatch: ['Opportunity hesitated past', 'Misreading the gift', 'Premature exit'] },
  2:  { arc: 'choice, balance, two forces in tension',
        uprightLean: ['Holding both sides honestly', 'A considered choice', 'Equilibrium found through care'],
        reversedWatch: ['Indecision dragged out', 'False balance', 'Avoiding the necessary choice'] },
  3:  { arc: 'first growth, collaboration, early fruition',
        uprightLean: ['Working with others', 'Building on the seed planted', 'Celebrating the first sign of progress'],
        reversedWatch: ['Going it alone when help is offered', 'Premature pride', 'Plans not aligned with reality'] },
  4:  { arc: 'stability, the foundation laid',
        uprightLean: ['Resting in what\'s built', 'Conservation of resources', 'Quiet satisfaction'],
        reversedWatch: ['Hoarding and inflexibility', 'Fear-driven stagnation', 'Boredom that signals time to move'] },
  5:  { arc: 'challenge, conflict, the dip in the middle of the arc',
        uprightLean: ['Honest engagement with the hard part', 'Resilience over avoidance', 'Letting loss teach what easy times can\'t'],
        reversedWatch: ['Self-pity in the difficulty', 'Refusing the lesson the friction is offering', 'Drama that overstays its welcome'] },
  6:  { arc: 'recovery, return, generosity after the difficulty',
        uprightLean: ['Receiving help offered', 'Generosity that flows naturally', 'Trust restored after a rupture'],
        reversedWatch: ['Refusing the gift', 'Conditional giving', 'Failing to acknowledge who carried you'] },
  7:  { arc: 'reflection, holding ground, choices about direction',
        uprightLean: ['Defending what\'s yours when it\'s actually being attacked', 'Patience with mid-arc complexity', 'Wise selectivity'],
        reversedWatch: ['Defensive posture when no one\'s attacking', 'Indecision that costs', 'Self-deception about the situation'] },
  8:  { arc: 'mastery in motion, skill compounding',
        uprightLean: ['Practising the craft daily', 'Speed earned through repetition', 'Diligence that becomes effortless'],
        reversedWatch: ['Burnout from over-pushing', 'Skill stagnating', 'Working hard at the wrong thing'] },
  9:  { arc: 'near-completion, resilience, the last push',
        uprightLean: ['Steadiness near the finish', 'Wisdom earned through the journey', 'Solitude that grounds'],
        reversedWatch: ['Giving up just before the breakthrough', 'Defensiveness that keeps help out', 'Pride that prevents the final ask'] },
  10: { arc: 'completion of the suit\'s cycle, full expression for better or worse',
        uprightLean: ['Honouring what the cycle taught', 'Knowing when something is complete', 'Letting the next cycle begin'],
        reversedWatch: ['Holding past completion', 'Refusing closure', 'Repeating the cycle when graduation is offered'] },
  11: { arc: 'the eager beginner — Page-energy, fresh and curious in this realm',
        uprightLean: ['Curiosity over expertise', 'Letting yourself be a beginner', 'Studying the realm seriously'],
        reversedWatch: ['Immaturity that needs to grow up', 'Surface enthusiasm without depth', 'Unfocused energy'] },
  12: { arc: 'the bold actor — Knight-energy, riding fast in this realm\'s direction',
        uprightLean: ['Decisive movement', 'Courageous initiative', 'Energy directed at the right target'],
        reversedWatch: ['Recklessness without thought', 'Quitting partway through', 'Speed without aim'] },
  13: { arc: 'the wise carrier — Queen-energy, mature mastery of the realm\'s emotional wisdom',
        uprightLean: ['Depth and emotional intelligence', 'Holding others through the realm\'s territory', 'Mature receptivity'],
        reversedWatch: ['Emotional dysregulation', 'Manipulation through depth', 'Withholding wisdom that should flow'] },
  14: { arc: 'the elder authority — King-energy, full mastery and leadership',
        uprightLean: ['Earning authority through years of practice', 'Steadiness others rely on', 'Wisdom shared generously'],
        reversedWatch: ['Authority without grace', 'Tyranny over the domain', 'Cynicism from too much knowledge of the realm'] },
};

function buildMinorDetail(name: string, suit: Suit, rank: number, upright: string, reversed: string): TarotDetail {
  const suitEss = SUIT_ESSENCE[suit];
  const tmpl = RANK_TEMPLATES[rank];
  if (!tmpl) {
    return {
      title: name,
      essence: `A ${suit} card — the realm of ${suitEss.realm}.`,
      upright,
      reversed,
      uprightLeanInto: [],
      watchFor: [],
      practiceHint: '',
      vedicLens: suitEss.vedicLens,
    };
  }
  const courtSuffix = rank >= 11 ? ` This is a person-card — sometimes a literal person in your life, sometimes a quality you're being asked to embody.` : '';
  return {
    title: name,
    essence: `${name} — ${tmpl.arc}, in the realm of ${suitEss.realm}.`,
    upright: `${upright}${courtSuffix} The suit is ${suitEss.essence}.`,
    reversed: `${reversed}${courtSuffix ? ' Reversed, the person-card energy is shadow-side or out of balance.' : ''}`,
    uprightLeanInto: tmpl.uprightLean,
    watchFor: tmpl.reversedWatch,
    practiceHint: `Sit with the keyword "${upright.split(',')[0]?.toLowerCase()}." What does it mean for you, in your specific life, this week?`,
    vedicLens: suitEss.vedicLens,
  };
}

// ─── Public lookup ───────────────────────────────────────────────────────────

export function detailForCard(drawn: DrawnCard): TarotDetail {
  const card = drawn.card;
  if (card.arcana === 'major') {
    const m = MAJOR_DETAIL[card.name];
    if (m) return m;
  }
  if (card.arcana === 'minor' && card.suit && card.number != null) {
    return buildMinorDetail(card.name, card.suit, card.number, card.upright, card.reversed);
  }
  // Defensive fallback
  return {
    title: card.name,
    essence: card.upright,
    upright: card.upright,
    reversed: card.reversed,
    uprightLeanInto: [],
    watchFor: [],
    practiceHint: '',
    vedicLens: '',
  };
}
