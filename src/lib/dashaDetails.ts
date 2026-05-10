/**
 * Plain-English content for the Mahadasha drill-down modal.
 *
 * The dashas tab on Chart shows planet-named periods with date ranges and
 * a progress bar — useful but hard to interpret. Tapping a row should
 * open a modal that explains: what this *kind* of period typically
 * brings, what to focus on, what to be careful with, and the active
 * sub-period (antardasha) inside it.
 *
 * No Sanskrit-explaining-Sanskrit. We use the words "Major Life Period"
 * for Mahadasha and "Sub-period" for Antardasha throughout the user UI;
 * Sanskrit names are kept in subtitles only.
 */

export interface DashaTheme {
  /** Friendly title for this period type, e.g. "Jupiter's chapter". */
  title: string;
  /** Sanskrit kept available for users learning the system. */
  sanskrit: string;
  /** One-line essence — what this period IS. */
  essence: string;
  /** What the period typically brings into a person's life. */
  whatItBrings: string;
  /** Areas of life this period tends to highlight. */
  areasOfFocus: string[];
  /** What's worth leaning into during this period. */
  leanInto: string[];
  /** What can quietly go wrong if not watched. */
  watchOutFor: string[];
  /** Total length in years (used in modal subtitle). */
  yearsTotal: number;
}

export const DASHA_THEME: Record<string, DashaTheme> = {
  Sun: {
    title: "Sun's chapter — identity & recognition",
    sanskrit: 'Surya Mahadasha',
    essence: "A 6-year chapter about stepping into your own authority and being seen for who you actually are.",
    whatItBrings: "Recognition often arrives during this period — promotions, public-facing roles, leadership opportunities. So does pressure: the Sun reveals you, which means it also reveals what's been hidden. People with strong Suns thrive here; those still finding their voice can feel exposed.",
    areasOfFocus: ['Career visibility and leadership', 'Identity, self-expression', 'Relationship with father / authority figures', 'Physical vitality and confidence'],
    leanInto: ['Saying yes to roles where you\'re seen', 'Creative or expressive work', 'Tending your physical health — your vitality is your asset here', 'Speaking up in rooms where you\'d normally stay quiet'],
    watchOutFor: ['Ego inflation when recognition arrives', 'Overworking to prove worth', 'Conflict with authority figures from old patterns', 'Burning brightly without rest'],
    yearsTotal: 6,
  },
  Moon: {
    title: "Moon's chapter — emotion & nourishment",
    sanskrit: 'Chandra Mahadasha',
    essence: "A 10-year chapter about your emotional life, your home, and what genuinely nourishes you.",
    whatItBrings: "Inner life takes the foreground. Family, mother, home, and emotional patterns become more important — and often more visible. People often start or grow families during this period, move homes, or do significant inner-world work.",
    areasOfFocus: ['Home, family, and roots', 'Emotional health and mental well-being', 'Relationship with mother / nurturing figures', 'Intuition, dreams, the inner life'],
    leanInto: ['Building a home that feels like one', 'Therapy or any deep emotional work — it lands now', 'Nurturing relationships and being nurtured back', 'Trusting your gut more than usual'],
    watchOutFor: ['Mood swings that come and go in waves', 'Emotional eating or other comfort patterns', 'Over-attachment to family expectations', 'Letting other people\'s moods become yours'],
    yearsTotal: 10,
  },
  Mars: {
    title: "Mars's chapter — drive & action",
    sanskrit: 'Mangala Mahadasha',
    essence: "A 7-year chapter about courage, decisive action, and what you're willing to fight for.",
    whatItBrings: "Energy is high. Things move fast. Conflicts that have been brewing tend to come to a head. Many people change careers, take physical risks, or finally end relationships that should have ended years earlier during this period.",
    areasOfFocus: ['Career changes and bold moves', 'Physical fitness and athleticism', 'Property, real estate, land', 'Conflict resolution — finally'],
    leanInto: ['Starting the thing you\'ve been delaying', 'Physical practice — your body wants to move', 'Direct conversations you\'ve avoided', 'Taking calculated risks'],
    watchOutFor: ['Anger that arrives without warning', 'Accidents or rushed decisions', 'Burning bridges in moments of impatience', 'Working yourself into injury'],
    yearsTotal: 7,
  },
  Mercury: {
    title: "Mercury's chapter — mind & communication",
    sanskrit: 'Budha Mahadasha',
    essence: "A 17-year chapter about learning, communication, and clever, varied work.",
    whatItBrings: "The mind is sharp. Education, writing, business deals, networking — all amplified. Many people start side businesses, write books, change schools, or become recognised for their thinking during this period.",
    areasOfFocus: ['Education and learning', 'Communication, writing, speaking', 'Business deals and negotiations', 'Siblings and peers'],
    leanInto: ['Studying something that\'s long interested you', 'Writing — it lands now in a way it might not otherwise', 'Networking and connecting people', 'Diversifying income across multiple streams'],
    watchOutFor: ['Spreading too thin across many projects', 'Anxiety from a busy mind', 'Communication missteps from speaking too quickly', 'Getting clever with finances in ways you regret'],
    yearsTotal: 17,
  },
  Jupiter: {
    title: "Jupiter's chapter — expansion & wisdom",
    sanskrit: 'Guru Mahadasha',
    essence: "A 16-year chapter about expansion, wisdom, and trusting the bigger arc of your life.",
    whatItBrings: "One of the most genuinely benevolent periods in the cycle. Marriage, children, advanced education, spiritual growth, foreign travel, mentorship — these typical themes. Things tend to grow. Optimism is justified.",
    areasOfFocus: ['Marriage and family expansion', 'Higher education and teaching', 'Spiritual growth and philosophy', 'Travel and broadening worldview'],
    leanInto: ['Big commitments you\'ve been considering', 'Teaching what you know', 'Travel that genuinely changes you', 'Generosity — it pays back during this period'],
    watchOutFor: ['Overconfidence — Jupiter\'s gift can become hubris', 'Weight gain and excess in any form', 'Commitments made without thinking through the cost', 'Coasting on the period\'s natural good fortune'],
    yearsTotal: 16,
  },
  Venus: {
    title: "Venus's chapter — love, beauty & sweetness",
    sanskrit: 'Shukra Mahadasha',
    essence: "A 20-year chapter about love, beauty, art, and what makes life feel sweet.",
    whatItBrings: "The longest chapter in the cycle, and often one of the most enjoyable. Relationships, marriage, creative work, the arts, comfortable living, financial enjoyment — these themes amplify. Many people meet partners, build wealth, or develop artistic mastery here.",
    areasOfFocus: ['Romantic relationships and marriage', 'Art, music, design, creative pursuits', 'Wealth and material enjoyment', 'Beauty, fashion, refinement'],
    leanInto: ['Investing in relationships that matter', 'Creative practice or artistic development', 'Spending on quality experiences and things you love', 'Cultivating taste and sensual presence'],
    watchOutFor: ['Indulgence that becomes a problem', 'Avoiding hard truths to keep the peace', 'Letting comfort make you lazy', 'Vanity or status-driven decisions'],
    yearsTotal: 20,
  },
  Saturn: {
    title: "Saturn's chapter — discipline & mastery",
    sanskrit: 'Shani Mahadasha',
    essence: "A 19-year chapter about discipline, mastery, and what time is asking of you.",
    whatItBrings: "The hardest period for many — and the most rewarding for those willing to do the work. Saturn strips what's superficial and leaves what's earned. Career mastery, long-term wealth building, deep psychological growth all happen here. Easy comforts often pause.",
    areasOfFocus: ['Career mastery and reputation', 'Long-term financial planning', 'Discipline, structure, and routine', 'Hard psychological work, shadow integration'],
    leanInto: ['Slow, sustained effort on what matters', 'Honest accounting of what is and isn\'t working', 'Discipline as a daily practice, not a sprint', 'Patience with the slow accumulation'],
    watchOutFor: ['Despair when results are slow', 'Isolation that becomes loneliness', 'Reading delays as failure (they\'re usually not)', 'Health issues from chronic over-work'],
    yearsTotal: 19,
  },
  Rahu: {
    title: "Rahu's chapter — ambition & the unconventional",
    sanskrit: 'Rahu Mahadasha',
    essence: "An 18-year chapter about ambition, the unconventional path, and chasing what feels new and electric.",
    whatItBrings: "Sudden changes are typical. Foreign places, technology, fame, unconventional careers, or radically different life paths often appear during Rahu. People do things in this period that surprise everyone, including themselves. The energy is intoxicating but unstable.",
    areasOfFocus: ['Career pivots and unconventional paths', 'Foreign lands or different cultures', 'Technology, innovation, the new', 'Recognition and fame'],
    leanInto: ['Saying yes to opportunities outside your comfort zone', 'Technology and emerging fields', 'Bold career moves you wouldn\'t have made before', 'Letting yourself be seen at scale'],
    watchOutFor: ['Obsession or compulsive ambition', 'Confusion and unclear thinking', 'Chasing things that look glamorous but aren\'t aligned', 'Sudden gains that disappear as fast as they came'],
    yearsTotal: 18,
  },
  Ketu: {
    title: "Ketu's chapter — release & inner work",
    sanskrit: 'Ketu Mahadasha',
    essence: "A 7-year chapter about release, inner work, and unfinished karma settling.",
    whatItBrings: "An unusual period — outwardly less can happen, but inwardly a lot does. Many people withdraw, do deep spiritual work, end relationships or careers that no longer fit, or experience a kind of \"why am I doing all this?\" reckoning. It's not a punishment; it's a clearing.",
    areasOfFocus: ['Spiritual practice and inner work', 'Letting go of what doesn\'t fit anymore', 'Solitude and silence', 'Past patterns finally finishing'],
    leanInto: ['Meditation, retreat, and contemplative practice', 'Saying no to what no longer aligns', 'Therapy or shadow work — old material surfaces to clear', 'Trust the apparent quiet — something is composting'],
    watchOutFor: ['Sudden withdrawal that worries family', 'Confusion about identity or direction', 'Health flares from old issues', 'Feelings of disconnection or drift'],
    yearsTotal: 7,
  },
};

export function dashaTheme(planet: string): DashaTheme | null {
  return DASHA_THEME[planet] ?? null;
}
