/**
 * BaZi (八字) — Four Pillars of Destiny
 * Heavenly Stems, Earthly Branches, Five Elements, Day Master, Luck Pillars
 */

// ─── Core sequences ───────────────────────────────────────────────────────────

export const STEMS = [
  'Yang Wood', 'Yin Wood', 'Yang Fire', 'Yin Fire', 'Yang Earth',
  'Yin Earth', 'Yang Metal', 'Yin Metal', 'Yang Water', 'Yin Water',
];

export const STEM_CHARS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

export const BRANCHES = [
  'Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig',
];

export const BRANCH_CHARS = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// Main element of each stem
export const STEM_ELEMENT = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];

// Main element of each branch
export const BRANCH_ELEMENT = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];

// Yin/Yang of each stem (even index = Yang, odd = Yin)
export const STEM_YIN = [false,true,false,true,false,true,false,true,false,true];

// ─── Element metadata ─────────────────────────────────────────────────────────

export const ELEMENT_DATA: Record<string, { color: string; symbol: string; label: string; keywords: string[] }> = {
  Wood:  { color: '#4ADE80', symbol: '木', label: 'Wood',  keywords: ['Growth','Creativity','Compassion'] },
  Fire:  { color: '#F87171', symbol: '火', label: 'Fire',  keywords: ['Passion','Clarity','Energy'] },
  Earth: { color: '#D97706', symbol: '土', label: 'Earth', keywords: ['Stability','Nurture','Patience'] },
  Metal: { color: '#CBD5E1', symbol: '金', label: 'Metal', keywords: ['Precision','Integrity','Clarity'] },
  Water: { color: '#60A5FA', symbol: '水', label: 'Water', keywords: ['Wisdom','Flow','Intuition'] },
};

// ─── Four Pillars calculation ─────────────────────────────────────────────────

export interface Pillar {
  stem: string;
  branch: string;
  stemChar: string;
  branchChar: string;
  stemIndex: number;
  branchIndex: number;
  stemElement: string;
  branchElement: string;
}

/** Year pillar. Reference: 1984 = 甲子 (Yang Wood Rat). */
export function getYearPillar(year: number): Pillar {
  const si = ((year - 4) % 10 + 10) % 10;
  const bi = ((year - 4) % 12 + 12) % 12;
  return { stem: STEMS[si]!, branch: BRANCHES[bi]!, stemChar: STEM_CHARS[si]!, branchChar: BRANCH_CHARS[bi]!, stemIndex: si, branchIndex: bi, stemElement: STEM_ELEMENT[si]!, branchElement: BRANCH_ELEMENT[bi]! };
}

/**
 * Month pillar.
 * Branch: Tiger(2) = Feb, Rabbit(3) = Mar … Ox(1) = Jan.
 * Stem: Five Tiger Month formula based on year stem.
 */
export function getMonthPillar(month: number, yearStemIndex: number): Pillar {
  // Month branch: Jan=Ox(1) … Dec=Rat(0)
  const MONTH_BRANCH = [1,2,3,4,5,6,7,8,9,10,11,0];
  const bi = MONTH_BRANCH[month - 1] ?? 0;

  // Five Tiger Month: start stem for Tiger month, indexed by yearStemIndex % 5
  const TIGER_START = [2, 4, 6, 8, 0]; // 丙 戊 庚 壬 甲
  const distFromTiger = (bi - 2 + 12) % 12;
  const si = (TIGER_START[yearStemIndex % 5]! + distFromTiger) % 10;

  return { stem: STEMS[si]!, branch: BRANCHES[bi]!, stemChar: STEM_CHARS[si]!, branchChar: BRANCH_CHARS[bi]!, stemIndex: si, branchIndex: bi, stemElement: STEM_ELEMENT[si]!, branchElement: BRANCH_ELEMENT[bi]! };
}

/**
 * Day pillar.
 * Reference: 2000-01-01 = 己巳 (Yin Earth Snake) → stemIndex 5, branchIndex 5.
 */
export function getDayPillar(dateOfBirth: string): Pillar {
  const birth = new Date(dateOfBirth + 'T12:00:00Z');
  const ref   = new Date('2000-01-01T12:00:00Z');
  const days  = Math.round((birth.getTime() - ref.getTime()) / 86400000);
  const si = ((5 + days) % 10 + 10) % 10;
  const bi = ((5 + days) % 12 + 12) % 12;
  return { stem: STEMS[si]!, branch: BRANCHES[bi]!, stemChar: STEM_CHARS[si]!, branchChar: BRANCH_CHARS[bi]!, stemIndex: si, branchIndex: bi, stemElement: STEM_ELEMENT[si]!, branchElement: BRANCH_ELEMENT[bi]! };
}

/**
 * Hour pillar.
 * Each 2-hour block maps to a branch (Rat=23-1, Ox=1-3, …).
 * Hour stem: Five Rat Hour formula based on day stem.
 */
export function getHourPillar(timeOfBirth: string, dayStemIndex: number): Pillar | null {
  if (!timeOfBirth || timeOfBirth === '12:00') return null;
  const parts = timeOfBirth.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (isNaN(h)) return null;

  const mins = h * 60 + m;
  let bi: number;
  if (mins >= 23 * 60 || mins < 60) bi = 0;       // Rat  23:00–01:00
  else bi = Math.floor((mins + 60) / 120) % 12;

  // Five Rat Hour: start stem for Rat hour
  const RAT_START = [0, 2, 4, 6, 8]; // 甲 丙 戊 庚 壬
  const si = (RAT_START[dayStemIndex % 5]! + bi) % 10;

  return { stem: STEMS[si]!, branch: BRANCHES[bi]!, stemChar: STEM_CHARS[si]!, branchChar: BRANCH_CHARS[bi]!, stemIndex: si, branchIndex: bi, stemElement: STEM_ELEMENT[si]!, branchElement: BRANCH_ELEMENT[bi]! };
}

// ─── Five Elements balance ────────────────────────────────────────────────────

export interface ElementBalance {
  Wood: number; Fire: number; Earth: number; Metal: number; Water: number;
  strongest: string; weakest: string;
}

export function getElementBalance(pillars: (Pillar | null)[]): ElementBalance {
  const counts: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of pillars) {
    if (!p) continue;
    counts[p.stemElement] = (counts[p.stemElement] ?? 0) + 1;
    counts[p.branchElement] = (counts[p.branchElement] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    Wood: counts.Wood ?? 0, Fire: counts.Fire ?? 0, Earth: counts.Earth ?? 0,
    Metal: counts.Metal ?? 0, Water: counts.Water ?? 0,
    strongest: entries[0]?.[0] ?? 'Earth',
    weakest: entries[entries.length - 1]?.[0] ?? 'Water',
  };
}

// ─── Luck Pillars ─────────────────────────────────────────────────────────────

export interface LuckPillar extends Pillar {
  startAge: number;
  endAge: number;
  startYear: number;
}

/**
 * Generate 8 luck pillars.
 * Direction forward (顺) for Yang year male / Yin year female.
 * Since we don't store gender, we generate forward-sequence pillars
 * and note which direction applies.
 *
 * Start age ≈ 5 (simplified; precise calc needs solar term distances).
 * Each pillar lasts 10 years.
 */
export function getLuckPillars(monthPillar: Pillar, yearStemIndex: number, birthYear: number, approxStartAge = 5): LuckPillar[] {
  const isYangYear = yearStemIndex % 2 === 0;
  const pillars: LuckPillar[] = [];

  for (let i = 0; i < 8; i++) {
    // Forward direction: increment. Backward: decrement.
    // We show forward (Yang year / male convention) with a note.
    const offset = i + 1;
    const si = (monthPillar.stemIndex + offset) % 10;
    const bi = (monthPillar.branchIndex + offset) % 12;
    const startAge = approxStartAge + i * 10;
    pillars.push({
      stem: STEMS[si]!, branch: BRANCHES[bi]!, stemChar: STEM_CHARS[si]!, branchChar: BRANCH_CHARS[bi]!,
      stemIndex: si, branchIndex: bi,
      stemElement: STEM_ELEMENT[si]!, branchElement: BRANCH_ELEMENT[bi]!,
      startAge, endAge: startAge + 9,
      startYear: birthYear + startAge,
    });
  }
  return pillars;
}

// ─── Day Master personalities ─────────────────────────────────────────────────

export interface DayMasterProfile {
  title: string;
  char: string;
  element: string;
  nature: string;
  personality: string;
  relationships: string;
  career: string;
  challenge: string;
  usefulElements: string[];
}

export const DAY_MASTER_PROFILES: Record<string, DayMasterProfile> = {
  'Yang Wood': {
    title: 'The Towering Oak', char: '甲', element: 'Wood',
    nature: 'Upright, idealistic, and direct',
    personality: 'You have the character of a great tree — strong, visionary, and always reaching toward the light. Natural leadership flows from your integrity rather than your authority. You commit fully to what you believe in and have little patience for compromise on core principles.',
    relationships: 'Loyal and protective but can be inflexible. You give deeply and expect others to match your honesty and commitment.',
    career: 'Leadership, entrepreneurship, pioneering work, law, or any path where you can operate as your own authority and stand for something.',
    challenge: 'Learning to bend without breaking. Flexibility and the ability to work within constraints you didn\'t set are the marks of a truly mature oak.',
    usefulElements: ['Water', 'Fire'],
  },
  'Yin Wood': {
    title: 'The Climbing Vine', char: '乙', element: 'Wood',
    nature: 'Adaptable, tenacious, and creatively persistent',
    personality: 'Like a vine, you navigate brilliantly around obstacles without losing your direction. You are quietly relentless — not through force but through patient, clever persistence. You have strong aesthetic sensitivity and an innate gift for healing, growing, and beautifying.',
    relationships: 'Warm, attentive, and devoted. Your challenge is over-accommodation — remember your own needs have equal weight.',
    career: 'Creative fields, healing, therapy, design, education, gardening, or any work that involves nurturing growth in people or ideas.',
    challenge: 'Trusting your own rooted sense of direction. The vine needs less support than it thinks.',
    usefulElements: ['Water', 'Earth'],
  },
  'Yang Fire': {
    title: 'The Blazing Sun', char: '丙', element: 'Fire',
    nature: 'Radiant, generous, and warmly magnetic',
    personality: 'Like the sun, you illuminate everything around you — warm, enthusiastic, and genuinely uplifting. People feel more energised and hopeful in your presence. You have natural clarity of vision and the gift of making others feel seen. You give freely without keeping account.',
    relationships: 'Romantic, generous, and expressive. You need appreciation in return — you can give endlessly but not without acknowledgment.',
    career: 'Leadership, performance, teaching, public speaking, sales, or any role where your radiant energy can inspire and illuminate others.',
    challenge: 'Protecting your own energy. The sun that gives to everything can burn out. Receiving is as important as giving.',
    usefulElements: ['Wood', 'Earth'],
  },
  'Yin Fire': {
    title: 'The Candle Flame', char: '丁', element: 'Fire',
    nature: 'Perceptive, intimate, and quietly illuminating',
    personality: 'Unlike the broad sun, you focus your light with precision and intensity. Your intuition is extraordinary — you perceive what is true beneath the surface of people and situations. You are most powerful in close, one-on-one connections where your perceptiveness can truly operate.',
    relationships: 'Deeply devoted and emotionally intelligent. You thrive in intimate relationships where your sensitivity is understood.',
    career: 'Counselling, psychology, healing, writing, research, or any work that involves perceiving and illuminating hidden truths.',
    challenge: 'Not allowing others\' winds to extinguish your flame. Your light is valuable — share it deliberately.',
    usefulElements: ['Wood', 'Metal'],
  },
  'Yang Earth': {
    title: 'The Mountain', char: '戊', element: 'Earth',
    nature: 'Stable, vast, and deeply trustworthy',
    personality: 'You have the character of a great mountain — solid, reliable, and genuinely still at the centre when everything around you moves. Your patience is legendary. You think in terms of years and decades and build accordingly. Others seek you out in crises because you simply don\'t lose your head.',
    relationships: 'Slow to commit but immovable once you do. Your challenge is expressing your rich inner emotional landscape to those who love you.',
    career: 'Property, finance, construction, management, agriculture, or any long-term endeavour requiring reliability and structural thinking.',
    challenge: 'Movement and emotional expression. Mountains are magnificent but still. Your growth comes through learning to flow.',
    usefulElements: ['Fire', 'Wood'],
  },
  'Yin Earth': {
    title: 'The Fertile Soil', char: '己', element: 'Earth',
    nature: 'Nurturing, detail-oriented, and quietly essential',
    personality: 'Like rich soil, you receive everything and help it flourish. You are deeply caring, methodical, and have extraordinary capacity for patient tending — of projects, relationships, and people. Your attentiveness to detail means nothing falls through the cracks on your watch.',
    relationships: 'Warm, attentive, and remembering. You make people feel genuinely cared for. Boundaries are your growth work.',
    career: 'Healthcare, nutrition, therapy, teaching, hospitality, or any careful tending role where your nurturing creates lasting results.',
    challenge: 'Boundaries and replenishment. Soil that gives everything eventually loses its fertility. Learning to receive nourishment is essential.',
    usefulElements: ['Fire', 'Metal'],
  },
  'Yang Metal': {
    title: 'The Sword', char: '庚', element: 'Metal',
    nature: 'Direct, principled, and incorruptibly honest',
    personality: 'You have the character of a fine sword — strong, precise, and honest to the point of bluntness. Your greatest gift is your integrity: what you say is what you mean, and what you commit to you honour. You cut through confusion and dishonesty with a clarity that can be uncomfortable for those who prefer vagueness.',
    relationships: 'Loyal and intensely honest. Partners either love your directness or find it too sharp. Your challenge is emotional warmth alongside your truthfulness.',
    career: 'Law, military, medicine, engineering, any role demanding decisive action and incorruptible honesty, or leadership requiring hard decisions.',
    challenge: 'Flexibility and warmth. The sword is magnificent, but not every moment calls for cutting. Learning when to sheathe is wisdom.',
    usefulElements: ['Earth', 'Water'],
  },
  'Yin Metal': {
    title: 'The Jewel', char: '辛', element: 'Metal',
    nature: 'Refined, aesthetic, and precisely perceptive',
    personality: 'Like a precious gem, you are most valuable when carefully polished and precisely placed. You perceive quality, beauty, and fine distinctions that others miss entirely. You have high standards — for yourself especially — and the environment affects you more deeply than it affects most people.',
    relationships: 'Selective and perceptive. You notice everything — which makes you a deeply attentive partner and a sensitive friend. High standards are your gift and sometimes your isolation.',
    career: 'Design, editing, jewellery, finance, law, quality management, or any work where precision and aesthetic excellence intersect.',
    challenge: 'Resilience in imperfect conditions. Gems can be brittle. Your growth is learning to function beautifully even in rough environments.',
    usefulElements: ['Earth', 'Water'],
  },
  'Yang Water': {
    title: 'The Ocean', char: '壬', element: 'Water',
    nature: 'Vast, deeply intelligent, and powerfully adaptable',
    personality: 'Like the ocean, you are more vast and powerful than your surface suggests. You have rare intelligence that connects ideas across distant domains, sees patterns in systems, and navigates complex, shifting situations with natural skill. Your adaptability is matched only by your depth.',
    relationships: 'Intellectually magnetic but emotionally guarded. Few people truly know you. You need partners who can meet your depth without needing to control it.',
    career: 'Philosophy, strategy, research, writing, diplomacy, or any work involving navigating complex, fluid situations and thinking several moves ahead.',
    challenge: 'Focus and emotional presence. The ocean that spreads everywhere loses its depth. Learning to concentrate your vast energy is your work.',
    usefulElements: ['Metal', 'Wood'],
  },
  'Yin Water': {
    title: 'The Morning Dew', char: '癸', element: 'Water',
    nature: 'Intuitive, sensitive, and quietly nourishing',
    personality: 'Like morning dew, you nourish what is around you with precision and care — not through force but through quiet, sensitive presence. Your intuition is finely attuned to what people and situations truly need. You receive impressions that others don\'t even notice.',
    relationships: 'Deeply empathetic and emotionally resonant. Others\' moods reach you. This is both your greatest gift and your greatest vulnerability.',
    career: 'Healing, music, art, spiritual guidance, poetry, or any path where deep sensitivity is a tool rather than a liability to manage.',
    challenge: 'Boundaries and self-replenishment. Dew evaporates without renewal. Protecting your sensitivity and knowing when to withdraw is essential.',
    usefulElements: ['Metal', 'Wood'],
  },
};

// ─── Compatibility ────────────────────────────────────────────────────────────

export const BAZI_COMPATIBILITY: Record<string, { best: string[]; challenging: string[] }> = {
  Rat:     { best: ['Dragon','Monkey','Ox'],    challenging: ['Horse','Rabbit','Goat'] },
  Ox:      { best: ['Rat','Snake','Rooster'],   challenging: ['Horse','Goat','Dragon'] },
  Tiger:   { best: ['Horse','Dog','Pig'],       challenging: ['Monkey','Snake'] },
  Rabbit:  { best: ['Goat','Pig','Dog'],        challenging: ['Rat','Dragon','Rooster'] },
  Dragon:  { best: ['Rat','Tiger','Monkey'],    challenging: ['Dog','Rabbit','Ox'] },
  Snake:   { best: ['Ox','Rooster'],            challenging: ['Tiger','Pig','Monkey'] },
  Horse:   { best: ['Tiger','Goat','Dog'],      challenging: ['Rat','Ox'] },
  Goat:    { best: ['Rabbit','Horse','Pig'],    challenging: ['Ox','Dog'] },
  Monkey:  { best: ['Rat','Dragon'],            challenging: ['Tiger','Pig'] },
  Rooster: { best: ['Ox','Snake','Dragon'],     challenging: ['Rabbit','Dog','Rooster'] },
  Dog:     { best: ['Tiger','Rabbit','Horse'],  challenging: ['Dragon','Goat','Ox'] },
  Pig:     { best: ['Rabbit','Goat','Tiger'],   challenging: ['Snake','Monkey','Pig'] },
};

// ─── Lucky attributes ─────────────────────────────────────────────────────────

export const LUCKY_ATTRIBUTES: Record<string, { numbers: string; colors: string[]; direction: string; season: string }> = {
  Rat:     { numbers: '2 & 3',   colors: ['Blue','Gold','Green'],       direction: 'North',          season: 'Winter' },
  Ox:      { numbers: '1 & 4',   colors: ['Yellow','White','Jade'],     direction: 'Northeast',      season: 'Late Winter' },
  Tiger:   { numbers: '1, 3 & 4',colors: ['Blue','Grey','Orange'],      direction: 'East',           season: 'Spring' },
  Rabbit:  { numbers: '3, 4 & 6',colors: ['Red','Pink','Purple'],       direction: 'East',           season: 'Spring' },
  Dragon:  { numbers: '1, 6 & 7',colors: ['Gold','Silver','White'],     direction: 'East & Southeast',season: 'Spring' },
  Snake:   { numbers: '2, 8 & 9',colors: ['Black','Red','Yellow'],      direction: 'South',          season: 'Summer' },
  Horse:   { numbers: '2, 3 & 7',colors: ['Yellow','Green','Purple'],   direction: 'South',          season: 'Summer' },
  Goat:    { numbers: '2 & 7',   colors: ['Brown','Red','Purple'],      direction: 'Southwest',      season: 'Late Summer' },
  Monkey:  { numbers: '4 & 9',   colors: ['White','Blue','Gold'],       direction: 'Northwest',      season: 'Autumn' },
  Rooster: { numbers: '5, 7 & 8',colors: ['Gold','Brown','Yellow'],     direction: 'West',           season: 'Autumn' },
  Dog:     { numbers: '3, 4 & 9',colors: ['Green','Red','Purple'],      direction: 'East & Southeast',season: 'Late Autumn' },
  Pig:     { numbers: '2, 5 & 8',colors: ['Yellow','Grey','Gold'],      direction: 'Northeast',      season: 'Winter' },
};

// ─── Element balancing recommendations ───────────────────────────────────────

export const ELEMENT_BALANCE_TIPS: Record<string, { deficient: string; excess: string }> = {
  Wood:  { deficient: 'Spend time in nature, wear green, face East, eat leafy greens, cultivate creative projects.', excess: 'Ground with Earth activities, work with Metal (structure, precision), be wary of overextension.' },
  Fire:  { deficient: 'Socialise more, wear red or orange, face South, practice joyful movement, let yourself be seen.', excess: 'Cool with Water (rest, reflection), seek structure from Metal, avoid overcommitting.' },
  Earth: { deficient: 'Create routine, spend time at home, wear yellow or brown, nourish yourself with warming foods.', excess: 'Move more, stimulate with Wood (creativity), avoid stagnation in work or relationships.' },
  Metal: { deficient: 'Organise your space, wear white or silver, face West, practice precision in at least one area of life.', excess: 'Soften with Water (flow, rest), nourish with Earth (stability), avoid excessive self-criticism.' },
  Water: { deficient: 'Rest more, spend time near water, wear black or dark blue, face North, practice stillness.', excess: 'Ground with Earth, take action (Wood/Fire), avoid overthinking and excessive withdrawal.' },
};

// ─── Compatibility (between two people) ───────────────────────────────────────

// 5-element generating cycle: A produces / nurtures B
const ELEMENT_GENERATES: Record<string, string> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};

// 5-element controlling cycle: A controls / restrains B
const ELEMENT_CONTROLS: Record<string, string> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};

export type ZodiacLevel = 'best' | 'good' | 'neutral' | 'challenging';
export type ElementInterplay =
  | 'mirroring'   // same element
  | 'nurturing'   // your element generates partner's
  | 'received'    // partner's element generates yours
  | 'controlling' // your element controls partner's
  | 'controlled'  // partner's element controls yours
  | 'neutral';

const INTERPLAY_DESCRIPTIONS: Record<ElementInterplay, string> = {
  mirroring:   'You mirror each other deeply — instant ease, but watch for stagnation when neither pushes the other to grow.',
  nurturing:   'You naturally nurture and support them. Your steady presence helps them flourish.',
  received:    'They naturally nurture and support you. Their presence helps you flourish.',
  controlling: 'You bring shape and direction to their world — productive when they welcome it, friction when they don\'t.',
  controlled:  'They bring shape and direction to yours — productive when you welcome it, friction when you don\'t.',
  neutral:     'A polite, balanced dynamic — neither destabilizing nor especially energising. Friendship more than fire.',
};

export interface ChineseCompatibility {
  yourZodiac: string;
  yourZodiacChar: string;
  yourDayMaster: string;
  yourDayMasterChar: string;
  yourDayElement: string;
  partnerZodiac: string;
  partnerZodiacChar: string;
  partnerDayMaster: string;
  partnerDayMasterChar: string;
  partnerDayElement: string;
  zodiacLevel: ZodiacLevel;
  elementInterplay: ElementInterplay;
  elementInterplayDescription: string;
  summary: string;
}

function classifyZodiacMatch(yours: string, partners: string): ZodiacLevel {
  if (yours === partners) {
    // Same animal: usually steady but can lack spark
    return 'neutral';
  }
  const compat = BAZI_COMPATIBILITY[yours];
  if (!compat) return 'neutral';
  if (compat.best.includes(partners)) return 'best';
  if (compat.challenging.includes(partners)) return 'challenging';
  return 'good';
}

function classifyElementInterplay(a: string, b: string): ElementInterplay {
  if (a === b) return 'mirroring';
  if (ELEMENT_GENERATES[a] === b) return 'nurturing';
  if (ELEMENT_GENERATES[b] === a) return 'received';
  if (ELEMENT_CONTROLS[a] === b) return 'controlling';
  if (ELEMENT_CONTROLS[b] === a) return 'controlled';
  return 'neutral';
}

const ZODIAC_SUMMARIES: Record<ZodiacLevel, string> = {
  best:        'A naturally harmonious match — your animals are in one of the classic supportive triads.',
  good:        'A workable match — no inherent friction, room to build something solid.',
  neutral:     'You share the same animal — comfort and understanding, but you may need to seek growth elsewhere.',
  challenging: 'A traditionally tense pairing — meaningful relationships happen here, but require more conscious work.',
};

/**
 * Computes Chinese / BaZi compatibility between two people from their birth dates.
 * Pure function — no network, no I/O. Uses year branch (zodiac animal) for the
 * social-level match and the day master (day stem) for the deeper element interplay.
 *
 * dateOfBirth strings are expected in 'YYYY-MM-DD' form.
 */
export function getChineseCompatibility(
  yourDOB: string,
  partnerDOB: string,
): ChineseCompatibility {
  const yourYear = new Date(yourDOB + 'T12:00:00Z').getUTCFullYear();
  const partnerYear = new Date(partnerDOB + 'T12:00:00Z').getUTCFullYear();

  const yourYearPillar = getYearPillar(yourYear);
  const partnerYearPillar = getYearPillar(partnerYear);
  const yourDayPillar = getDayPillar(yourDOB);
  const partnerDayPillar = getDayPillar(partnerDOB);

  const zodiacLevel = classifyZodiacMatch(yourYearPillar.branch, partnerYearPillar.branch);
  const elementInterplay = classifyElementInterplay(
    yourDayPillar.stemElement,
    partnerDayPillar.stemElement,
  );

  return {
    yourZodiac: yourYearPillar.branch,
    yourZodiacChar: yourYearPillar.branchChar,
    yourDayMaster: yourDayPillar.stem,
    yourDayMasterChar: yourDayPillar.stemChar,
    yourDayElement: yourDayPillar.stemElement,
    partnerZodiac: partnerYearPillar.branch,
    partnerZodiacChar: partnerYearPillar.branchChar,
    partnerDayMaster: partnerDayPillar.stem,
    partnerDayMasterChar: partnerDayPillar.stemChar,
    partnerDayElement: partnerDayPillar.stemElement,
    zodiacLevel,
    elementInterplay,
    elementInterplayDescription: INTERPLAY_DESCRIPTIONS[elementInterplay],
    summary: ZODIAC_SUMMARIES[zodiacLevel],
  };
}
