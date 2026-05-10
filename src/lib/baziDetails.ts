/**
 * Plain-English deep content for the BaZi (Chinese astrology) tap surfaces.
 *
 * The Chinese astrology screen already has rich Day Master profiles for
 * each of the 10 stems. This module fills in the gaps:
 *
 *   1. ELEMENT_DEEP — for each of the 5 elements, what it represents in
 *      everyday life, what dominance / deficiency feels like, and concrete
 *      balance practices (foods, colours, directions, activities,
 *      careers).
 *
 *   2. LUCK_PILLAR_THEMES — interpretation per element pair (stem element
 *      + branch element) and life-stage framing. Each 10-year chapter
 *      asks something different of you depending on which element rules
 *      and which stage of life you're in.
 *
 * Composed deterministically — no API call. Pairs with AskGuruButton at
 * the bottom of each modal for follow-up questions.
 */

// ─── Five Element Deep Content ────────────────────────────────────────────

export interface ElementDeepDetail {
  /** A 1-2 sentence essence of what this element represents. */
  essence: string;
  /** What it shapes in everyday life. */
  shapes: string;
  /** What it feels like when this element is dominant in a chart. */
  whenDominant: string;
  /** What it feels like when this element is deficient or absent. */
  whenDeficient: string;
  /** Concrete supportive practices — foods, colours, activities. */
  balancePractices: string[];
  /** Career / vocational themes that resonate with this element. */
  careerThemes: string[];
  /** Direction (per Feng Shui) and season association. */
  direction: string;
  season: string;
  /** Relationship to the body — what organ/system this element governs. */
  bodyConnection: string;
  /** A short prompt for what to do when this element shows up strongly today. */
  practiceHint: string;
  /** Productive cycle — what this element creates / feeds. */
  generates: string;          // e.g. 'Fire' — Wood feeds Fire
  /** Productive cycle — what creates / feeds this element. */
  generatedBy: string;        // e.g. 'Water' — Water feeds Wood
  /** Destructive cycle — what this element controls / weakens. */
  controls: string;           // e.g. 'Earth' — Wood breaks Earth
  /** Destructive cycle — what controls / weakens this element. */
  controlledBy: string;       // e.g. 'Metal' — Metal cuts Wood
  /** Hours when this element naturally peaks during the day. */
  timeOfDayPeak: string;
  /** Months when this element naturally peaks during the year. */
  timeOfYearPeak: string;
  /** Animals (zodiac branches) carrying this element strongly. */
  animals: string[];
  /** A single-word archetype for this element. */
  archetype: string;
}

export const ELEMENT_DEEP: Record<string, ElementDeepDetail> = {
  Wood: {
    essence: "The element of growth, expansion, and new beginnings — the spring of life.",
    shapes: "How you initiate, how you adapt to change, your appetite for the new. Wood is the sapling pushing through the soil.",
    whenDominant: "You're a natural starter. Ideas flow, projects multiply, you're hard to keep down. The shadow: scattering across too many sprouts, never letting any tree grow tall. You may struggle with finishing or with environments that demand sitting still.",
    whenDeficient: "You may struggle to begin — projects stall, optimism feels forced, you feel stuck even when conditions are good. You may find it hard to imagine a different future or to take the first risky step. The body may run cold.",
    balancePractices: [
      'Time among living trees and gardens',
      'Green leafy foods, sour flavours (citrus, vinegar)',
      'Wear green or blue tones',
      'Stretching, yoga — Wood loves movement that lengthens',
      'Morning light and early-day creative work',
    ],
    careerThemes: [
      'Entrepreneurship and founding',
      'Education, teaching, mentoring',
      'Forestry, agriculture, ecology',
      'Writing, publishing, journalism',
      'Healthcare and growth-focused therapy',
    ],
    direction: 'East',
    season: 'Spring',
    bodyConnection: 'Liver and gallbladder — the organs of decision and detoxification.',
    practiceHint: "When Wood is strong today, start the thing you've been delaying. The first move is the gift.",
    generates: 'Fire',
    generatedBy: 'Water',
    controls: 'Earth',
    controlledBy: 'Metal',
    timeOfDayPeak: '3 AM – 7 AM (the unfurling hours)',
    timeOfYearPeak: 'February – April (spring)',
    animals: ['Tiger', 'Rabbit'],
    archetype: 'The Pioneer',
  },
  Fire: {
    essence: "The element of expression, joy, and visibility — the noon-day sun.",
    shapes: "How you radiate, how you connect with others, the warmth you bring to a room. Fire is celebration and contagious aliveness.",
    whenDominant: "You're magnetic. People are drawn to your warmth, your wit, your willingness to be seen. The shadow: burnout. You can run hot until there's nothing left, or perform vitality even when depleted. Beware of needing the audience to feel real.",
    whenDeficient: "You may feel invisible, unmotivated, or emotionally flat. Joy feels like work; visibility feels exposing. The body may run cold and circulation sluggish. Connection to others may feel effortful when it should feel easy.",
    balancePractices: [
      'Sunlight, candlelight, warm fires',
      'Spicy and bitter foods (chillies, dark greens, coffee)',
      'Wear red, orange, or warm pink tones',
      'Cardio, dance, anything that elevates the heart',
      'Social gatherings — be seen, not just present',
    ],
    careerThemes: [
      'Performing arts, public speaking',
      'Marketing, brand-building, media',
      'Hospitality and event design',
      'Sales — especially relational selling',
      'Anything where presence is the product',
    ],
    direction: 'South',
    season: 'Summer',
    bodyConnection: 'Heart, small intestine, and circulation. The mind and emotional life are also Fire-governed.',
    practiceHint: "When Fire is strong today, let yourself be visible. Send the message, post the thing, light up the room.",
    generates: 'Earth',
    generatedBy: 'Wood',
    controls: 'Metal',
    controlledBy: 'Water',
    timeOfDayPeak: '9 AM – 1 PM (the radiant hours)',
    timeOfYearPeak: 'May – July (early to peak summer)',
    animals: ['Snake', 'Horse'],
    archetype: 'The Performer',
  },
  Earth: {
    essence: "The element of grounding, nourishment, and steady reliability — late summer's harvest.",
    shapes: "How you take care of others and yourself, how you process and digest experience, your sense of home. Earth is the steady centre that everything else returns to.",
    whenDominant: "You're the rock — the friend everyone calls in a crisis, the steady presence in chaos. The shadow: you may carry too much for others, get stuck in routine, or smother the people you nurture. Change feels threatening because stability is your medicine.",
    whenDeficient: "You may feel ungrounded, anxious, scattered. Routines fall apart easily. You may be over-giving without genuine reserves, or struggle to feel rooted in your own home or body. Worry may dominate your mental life.",
    balancePractices: [
      'Walks on actual earth — barefoot if you can',
      'Sweet and root foods (squash, sweet potato, grains)',
      'Wear yellow, beige, or terracotta',
      'Cooking, gardening, building things with your hands',
      'Predictable routines — Earth thrives on rhythm',
    ],
    careerThemes: [
      'Real estate and property',
      'Construction and architecture',
      'Hospitality, food, agriculture',
      'Counselling, therapy, social work',
      'Operations, project management, anything that holds the centre',
    ],
    direction: 'Centre',
    season: 'Late summer / between seasons',
    bodyConnection: 'Spleen, stomach, and digestion. Worry lives here; so does the capacity to nourish.',
    practiceHint: "When Earth is strong today, slow down. Make a real meal. Tend something. The pause is the practice.",
    generates: 'Metal',
    generatedBy: 'Fire',
    controls: 'Water',
    controlledBy: 'Wood',
    timeOfDayPeak: '7 AM – 9 AM and 1 PM – 3 PM (transition hours)',
    timeOfYearPeak: 'The eighteen days at each season change (土用)',
    animals: ['Ox', 'Dragon', 'Sheep / Goat', 'Dog'],
    archetype: 'The Caretaker',
  },
  Metal: {
    essence: "The element of refinement, discernment, and letting go — autumn's clarity.",
    shapes: "How you set boundaries, what you keep and what you release, the precision with which you work. Metal is the blade that cuts away what's no longer needed.",
    whenDominant: "You're disciplined and discerning. Your standards are high, your work refined, your boundaries clear. The shadow: rigidity, perfectionism, grief that won't lift. You may cut away too much, including connection that needed time to ripen.",
    whenDeficient: "You may struggle to let go — of clutter, of relationships past their time, of grudges. Boundaries may be porous. You may feel inarticulate, foggy, or unable to refine what you produce. Grief may sit unmetabolised.",
    balancePractices: [
      'Decluttering — physical, digital, emotional',
      'Spicy, pungent foods (ginger, garlic, mustard)',
      'Wear white, grey, or metallic tones',
      'Breathing practices — Metal rules the lungs',
      'Cool autumnal walks, particularly in the morning',
    ],
    careerThemes: [
      'Law, finance, audit',
      'Editing, curating, archiving',
      'Surgery, dentistry — precision medical work',
      'Engineering, manufacturing, machining',
      'Anything requiring sharp, refined judgement',
    ],
    direction: 'West',
    season: 'Autumn',
    bodyConnection: 'Lungs and large intestine — the organs of receiving (breath) and releasing (waste). Skin too.',
    practiceHint: "When Metal is strong today, let something go. Empty a drawer, end a chapter, exhale what you've been holding.",
    generates: 'Water',
    generatedBy: 'Earth',
    controls: 'Wood',
    controlledBy: 'Fire',
    timeOfDayPeak: '3 PM – 7 PM (the harvest hours)',
    timeOfYearPeak: 'August – October (autumn)',
    animals: ['Monkey', 'Rooster'],
    archetype: 'The Refiner',
  },
  Water: {
    essence: "The element of depth, reflection, and quiet wisdom — winter's stillness.",
    shapes: "How you process, how you adapt under pressure, what you know without being able to say. Water shapes itself to its container while wearing down stone.",
    whenDominant: "You're deep, intuitive, observant. Your mind catches what others miss. The shadow: you may withdraw too much, ruminate, or freeze when action is called for. Fear may be a frequent companion. Connection takes effort because depth is your default and small talk feels hollow.",
    whenDeficient: "You may feel shallow, anxious, unable to slow down. Sleep may be poor. The body may run dry — joints, skin, hair. You may struggle to drop into your own depth, defaulting instead to noise and motion as a way to avoid it.",
    balancePractices: [
      'Time near actual water — baths, ocean, rivers',
      'Salty foods, dark beans, seafood',
      'Wear black, navy, or deep indigo',
      'Sleep is the most important medicine',
      'Solitude with no input — silence is Water-feeding',
    ],
    careerThemes: [
      'Research, academia, deep specialisation',
      'Therapy, psychoanalysis, psychiatry',
      'Investigation, intelligence, journalism',
      'Marine and water-related fields',
      'Anything that rewards depth and patience',
    ],
    direction: 'North',
    season: 'Winter',
    bodyConnection: 'Kidneys, bladder, and the deep reserve of vitality the Chinese call jing. Bones and ears too.',
    practiceHint: "When Water is strong today, go inward. Skip the meeting if you can. Sleep, dream, listen — the answer is below the surface.",
    generates: 'Wood',
    generatedBy: 'Metal',
    controls: 'Fire',
    controlledBy: 'Earth',
    timeOfDayPeak: '9 PM – 1 AM (the deep hours)',
    timeOfYearPeak: 'November – January (winter)',
    animals: ['Pig', 'Rat'],
    archetype: 'The Sage',
  },
};

export function elementDeep(name: string): ElementDeepDetail | null {
  return ELEMENT_DEEP[name] ?? null;
}

// ─── Day-Master relationship analyser ────────────────────────────────────
//
// Every element has a specific RELATIONSHIP with the Day Master element.
// In BaZi, this is the "ten gods" framework — six roles a non-Day-Master
// element can play, simplified here to four useful categories users
// can recognise without learning a vocabulary first.

export type DayMasterRelation = 'self' | 'supports' | 'drains' | 'controls' | 'controlledBy';

export interface DayMasterRelationDetail {
  /** Plain-English heading for the relationship. */
  label: string;
  /** What this means for the user. */
  meaning: string;
  /** Color tone for the section header. */
  tone: 'gold' | 'emerald' | 'amber' | 'star' | 'muted';
}

export function relationToDayMaster(element: string, dayMasterElement: string): DayMasterRelation {
  if (element === dayMasterElement) return 'self';
  const dm = ELEMENT_DEEP[dayMasterElement];
  if (!dm) return 'self';
  if (dm.generatedBy === element) return 'supports';   // element feeds Day Master
  if (dm.generates === element) return 'drains';       // Day Master feeds this element (output)
  if (dm.controlledBy === element) return 'controls';  // element controls Day Master (pressure)
  if (dm.controls === element) return 'controlledBy';  // Day Master controls this element (wealth/output)
  return 'self';
}

export function dayMasterRelationDetail(
  element: string,
  dayMasterElement: string,
): DayMasterRelationDetail | null {
  if (!ELEMENT_DEEP[element] || !ELEMENT_DEEP[dayMasterElement]) return null;
  const rel = relationToDayMaster(element, dayMasterElement);
  switch (rel) {
    case 'self':
      return {
        label: 'Same as your Day Master',
        meaning: `${element} is your Day Master element — this is the central energy of your chart. More of it generally strengthens your sense of self; too much can make you stubborn or insulated.`,
        tone: 'gold',
      };
    case 'supports':
      return {
        label: 'Supports your Day Master',
        meaning: `${element} feeds and strengthens ${dayMasterElement} (your Day Master). When this element is present in your chart, you have built-in support — confidence, vitality, and the resources to express your nature without effort.`,
        tone: 'emerald',
      };
    case 'drains':
      return {
        label: 'Channels your Day Master\'s energy',
        meaning: `Your Day Master ${dayMasterElement} produces ${element}. This is your "output" element — what you create, give, or express. Strong ${element} means you have natural creative or productive force; weak ${element} can feel like ideas stuck inside.`,
        tone: 'star',
      };
    case 'controls':
      return {
        label: 'Pressures your Day Master',
        meaning: `${element} controls ${dayMasterElement}. In the BaZi tradition this is the "pressure" element — challenges, authority figures, demands placed on you. Too much makes you feel ruled by external forces; balanced amounts build discipline and resilience.`,
        tone: 'amber',
      };
    case 'controlledBy':
      return {
        label: 'Your "wealth" element',
        meaning: `Your Day Master ${dayMasterElement} controls ${element}. This is classically your "wealth" element — what you can master, manage, accumulate. Strong presence often correlates with material success and capability; deficient ${element} suggests money / resources may need conscious cultivation.`,
        tone: 'muted',
      };
  }
}

// ─── Luck Pillar Life-Stage Framing ───────────────────────────────────────

/** Returns a plain-English life-stage descriptor based on age range. */
export function lifeStageForAges(startAge: number, endAge: number): { label: string; theme: string } {
  const mid = (startAge + endAge) / 2;
  if (mid < 18) return {
    label: 'Childhood & adolescence',
    theme: 'Foundations laid by family, schooling, early identity. The chart\'s themes show up as the colour of your formative years — what was easy, what was hard.',
  };
  if (mid < 28) return {
    label: 'Young adulthood',
    theme: 'Leaving the home, finding the work, the early relationships and choices that set the trajectory. Identity-forming years.',
  };
  if (mid < 38) return {
    label: 'Prime building years',
    theme: 'Career consolidation, partnership choices, often family expansion. The decisions of this decade compound for the rest of life.',
  };
  if (mid < 48) return {
    label: 'Mid-life integration',
    theme: 'What you\'ve built meets what still calls you. Reckonings, recommitments, sometimes pivots. The chapter where authority is genuinely earned.',
  };
  if (mid < 58) return {
    label: 'Mastery and influence',
    theme: 'Stewardship — of family, of teams, of legacy. The decade where what you know becomes more valuable than what you produce.',
  };
  if (mid < 68) return {
    label: 'Wisdom and transition',
    theme: 'Career winding, family dynamics shifting, attention turning toward what matters most. Often a decade of generosity and teaching.',
  };
  return {
    label: 'Elder years',
    theme: 'The harvest. Time for what was deferred, for what younger life never had room for. Legacy and meaning take centre stage.',
  };
}

// ─── Luck Pillar Element-Pair Framing ─────────────────────────────────────

export interface LuckPillarTheme {
  /** What the element pair says about this 10-year chapter's flavour. */
  flavour: string;
  /** What this chapter typically rewards. */
  rewards: string[];
  /** What to be careful of during this chapter. */
  cautions: string[];
}

/** Compose a luck-pillar theme from stem + branch elements. The pair
 *  generates one of 25 combinations; we describe each by combining the
 *  stem's flavour with the branch's modulation. */
export function luckPillarTheme(stemElement: string, branchElement: string): LuckPillarTheme {
  const stem = ELEMENT_DEEP[stemElement];
  const branch = ELEMENT_DEEP[branchElement];
  if (!stem || !branch) {
    return {
      flavour: 'A 10-year chapter — its specific colour depends on the elements and how they interact with your natal chart.',
      rewards: [],
      cautions: [],
    };
  }
  const same = stemElement === branchElement;
  return {
    flavour: same
      ? `A double-${stemElement.toLowerCase()} chapter — the energy is concentrated and unmistakable. Themes of ${stem.shapes.toLowerCase()} dominate.`
      : `${stem.shapes.split('.')[0]} (the ${stemElement.toLowerCase()} stem above) ${branchElement === 'Wood' || branchElement === 'Fire' ? 'energised' : branchElement === 'Earth' ? 'grounded' : branchElement === 'Metal' ? 'refined' : 'deepened'} by ${branchElement.toLowerCase()}'s ${branch.shapes.toLowerCase().split('.')[0]}.`,
    rewards: [
      `Activities that feed ${stemElement} — ${stem.balancePractices[0]?.toLowerCase() ?? ''}`,
      `Career moves aligned with ${stem.careerThemes[0]?.toLowerCase() ?? ''}`,
      `Direction: ${stem.direction} carries the chapter's energy`,
    ],
    cautions: [
      same ? `Imbalance from too much ${stemElement} — counter with the supportive elements your chart needs` : `Tension between ${stemElement} (above) and ${branchElement} (below) — read the cycle: do they generate or control each other?`,
      `${stem.whenDominant.split('.').slice(-2, -1)[0]?.trim() ?? "Watch for the shadow side of this element when it's overactive"}`,
    ],
  };
}
