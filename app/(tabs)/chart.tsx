import { useState, useRef, memo, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useAppStore } from '@store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { PLANETS_BY_ID } from '@constants/astrology';
import { askGuru } from '@services/claude';
import { generateChart } from '@services/prokerala';
import { findActiveDasha } from '@utils/vedic';

// ─── Lagna (Rising Sign) descriptions ────────────────────────────────────────

const LAGNA_DATA: Record<string, {
  ruler: string; rulerNote: string;
  traits: string[]; lifeFocus: string;
  strength: string; growthEdge: string; bodyPart: string;
}> = {
  Aries: {
    ruler: 'Mars', rulerNote: 'Mars as your chart ruler gives you energy, directness, and a pioneering spirit. Mars\'s sign and house in your chart strongly colours your overall personality.',
    traits: ['Bold and initiative-taking — you act before others have finished thinking', 'Natural leader who inspires through courage, not hierarchy', 'Honest to the point of bluntness; you say exactly what you mean', 'Competitive energy that drives you to be first, best, or most original'],
    lifeFocus: 'Self, identity, personal initiative, and the courage to begin. Your first house of self is your domain — how you present to the world and how you start things defines you.',
    strength: 'Courage to start what others won\'t. Your directness and willingness to lead are forces others rely on.',
    growthEdge: 'Patience and follow-through. The Aries fire ignites brilliantly — the practice is sustaining the flame through the less exciting middle.',
    bodyPart: 'Head, face, and brain',
  },
  Taurus: {
    ruler: 'Venus', rulerNote: 'Venus as your chart ruler gives you an appreciation for beauty, comfort, and the finer things. Your Venus placement shapes how you attract and what you deeply value.',
    traits: ['Patient and steady — you build slowly but you build to last', 'Sensually aware, drawn to beauty, good food, music, and physical comfort', 'Deeply loyal once you\'ve committed — your word is your bond', 'Practical and grounded; you trust what you can see and touch'],
    lifeFocus: 'Stability, material security, your relationship with the physical world, and the values you live by. Wealth, beauty, and the pleasures of embodied life are central themes.',
    strength: 'Permanence and reliability. You create things that endure — relationships, businesses, homes — because you don\'t cut corners.',
    growthEdge: 'Flexibility and releasing what has passed its time. The Taurus grip on security can resist change that is actually necessary.',
    bodyPart: 'Throat, neck, and voice',
  },
  Gemini: {
    ruler: 'Mercury', rulerNote: 'Mercury as your chart ruler makes communication, intellect, and mental agility central to your identity. Your Mercury placement reveals how your mind works and where your curiosity leads.',
    traits: ['Curious and quick — you gather information the way others breathe', 'Adaptable: comfortable moving between very different worlds and people', 'Witty and communicative — you learn through conversation and connection', 'Restless energy that craves variety and resists repetition'],
    lifeFocus: 'Communication, learning, short journeys, siblings, and the exchange of ideas. The world of the mind and connection is your playground.',
    strength: 'Versatility and communication. You can connect with almost anyone, explain almost anything, and adapt to almost any situation.',
    growthEdge: 'Depth and commitment. The gift of breadth benefits from occasionally going very deep in one direction rather than sampling everything.',
    bodyPart: 'Hands, arms, lungs, and nervous system',
  },
  Cancer: {
    ruler: 'Moon', rulerNote: 'The Moon as your chart ruler makes your emotional life, home, and sense of belonging central to everything. Your Moon\'s sign and placement is especially significant — it colours your entire experience.',
    traits: ['Deeply feeling and emotionally intuitive — you sense what others feel before they say it', 'The natural nurturer — genuinely fulfilled by caring for others', 'Sensitive to atmosphere, mood, and the emotional undercurrents in any room', 'Home and family are the axis around which your world turns'],
    lifeFocus: 'Home, family, emotional security, roots, and caring for others. Your private inner world is often richer and more real to you than the public one.',
    strength: 'Empathy and nurturing. Your capacity to sense what others need and provide it is extraordinary — a rare and precious gift in the world.',
    growthEdge: 'Emotional boundaries and letting go. The Cancer tendency to hold on — to people, to old feelings, to the past — benefits from learning when to release.',
    bodyPart: 'Chest, breasts, and stomach',
  },
  Leo: {
    ruler: 'Sun', rulerNote: 'The Sun as your chart ruler makes self-expression, life purpose, and creative radiance central to who you are. Your Sun\'s sign and house is especially significant for your overall vitality and direction.',
    traits: ['Warm, generous, and naturally magnetic — people are drawn to your energy', 'Born to lead — you inspire through presence and genuine heart, not just authority', 'Creative and expressive; you have a gift for bringing life and drama to any situation', 'Pride and dignity — you carry yourself with natural royalty'],
    lifeFocus: 'Self-expression, creativity, children, romance, and leadership. Your unique light and contribution to the world is the central theme of your life.',
    strength: 'Magnetism and heart. Your warmth, generosity, and ability to inspire others with your enthusiasm are genuinely powerful forces.',
    growthEdge: 'Ego and approval-seeking. Your light is real whether others acknowledge it or not — learning this is the Leo journey.',
    bodyPart: 'Heart and spine',
  },
  Virgo: {
    ruler: 'Mercury', rulerNote: 'Mercury as your chart ruler makes analysis, discernment, and practical skill central to your identity. For Virgo rising, Mercury\'s influence is more grounded and methodical than for Gemini.',
    traits: ['Analytical and observant — you notice what everyone else misses', 'Quietly competent; you make difficult things look easy through careful preparation', 'Service-oriented — genuinely fulfilled by being useful and doing things well', 'High standards that you apply to yourself more than anyone else'],
    lifeFocus: 'Service, craft, health, daily routines, and the refinement of skills. Excellence in the practical domain is your calling.',
    strength: 'Mastery and discernment. Your eye for what is off, your ability to improve systems, and your commitment to getting things right are genuinely rare qualities.',
    growthEdge: 'Self-compassion and trust. The Virgo inner critic, while professionally sharp, needs to be gentled when turned inward.',
    bodyPart: 'Intestines and digestive system',
  },
  Libra: {
    ruler: 'Venus', rulerNote: 'Venus as your chart ruler makes beauty, relationships, balance, and harmony central to how you move through the world. Your Venus placement reveals your aesthetic sensibility and your relational nature.',
    traits: ['Socially gifted, charming, and naturally diplomatic — you ease tension in any room', 'Deep sense of fairness; injustice disturbs you more than it disturbs most people', 'Aesthetic sensibility is strong — beauty, art, and elegance are not luxuries but necessities', 'Partnership-oriented: you naturally think in terms of "we" more than "I"'],
    lifeFocus: 'Relationships, beauty, justice, partnership, and the art of harmony between people and ideas. Your great life themes play out through your connections with others.',
    strength: 'Grace and diplomacy. Your ability to see every side, to mediate, and to bring beauty and balance into any situation is a genuine gift.',
    growthEdge: 'Decisiveness and your own centre. Libra\'s gift for seeing all perspectives can become difficulty knowing what you yourself actually want.',
    bodyPart: 'Kidneys and lower back',
  },
  Scorpio: {
    ruler: 'Mars', rulerNote: 'Mars as your chart ruler gives you extraordinary depth, willpower, and penetrating insight. Your Mars placement shapes the intensity and focus of your essential nature.',
    traits: ['Intensely perceptive — you read people and situations at a depth others don\'t even know exists', 'Private and self-protective, even while being powerfully magnetic to others', 'All-or-nothing in your commitments — you go deep or you don\'t go at all', 'Drawn to what is hidden, transformative, and beneath the surface of things'],
    lifeFocus: 'Transformation, depth, shared resources, power, and the hidden dimensions of life. You are drawn to what lies beneath — in people, in situations, in yourself.',
    strength: 'Depth and regeneration. Your capacity for profound transformation, your psychological insight, and your intensity of commitment are formidable powers.',
    growthEdge: 'Trust and release. The Scorpio grip on control, on old wounds, on power — benefits from learning that true strength includes vulnerability.',
    bodyPart: 'Reproductive organs and elimination system',
  },
  Sagittarius: {
    ruler: 'Jupiter', rulerNote: 'Jupiter as your chart ruler gives you natural optimism, expansiveness, and a philosophical orientation toward life. Your Jupiter placement reveals where and how you seek meaning and growth.',
    traits: ['Philosophical and always searching for the deeper meaning behind experience', 'In love with freedom — you resist confinement of body or mind with your whole being', 'Honest to a fault; sometimes blunt in a way you didn\'t intend to be', 'Adventurous and drawn toward foreign places, cultures, philosophies, and people'],
    lifeFocus: 'Higher learning, philosophy, travel, freedom, and the search for truth and meaning. You are happiest when you are growing, exploring, and following the horizon.',
    strength: 'Vision and optimism. Your ability to see possibility where others see problems, and to inspire with your enthusiasm, is a genuine power.',
    growthEdge: 'Follow-through and tact. The Sagittarian energy fires arrows everywhere — the practice is aiming, and remembering that honesty without warmth is just bluntness.',
    bodyPart: 'Hips, thighs, and liver',
  },
  Capricorn: {
    ruler: 'Saturn', rulerNote: 'Saturn as your chart ruler gives you seriousness, ambition, and a deep relationship with time, discipline, and legacy. Your Saturn placement reveals your karmic challenges and your path to mastery.',
    traits: ['Disciplined and ambitious — you are oriented toward long-term achievement above short-term gain', 'Responsible and reliable; you take your commitments more seriously than most people take anything', 'Reserved in expression but deeply capable in action — you lead by example', 'You respect earned mastery and have little patience for those who haven\'t done the work'],
    lifeFocus: 'Career, public reputation, long-term achievement, and the patient building of something of lasting value. Time is your greatest ally.',
    strength: 'Perseverance and earned mastery. Your ability to work steadily toward a distant goal and to build something real is genuinely rare.',
    growthEdge: 'Playfulness and worth beyond achievement. Learning that you are enough without the achievement is the Capricorn journey.',
    bodyPart: 'Knees, bones, and joints',
  },
  Aquarius: {
    ruler: 'Saturn', rulerNote: 'Saturn as your chart ruler gives you both structure and the drive to disrupt it. You operate within systems in order to ultimately transform them.',
    traits: ['Independent and original — you were ahead of your time before you knew what that meant', 'Deeply interested in ideas, humanity, and the future rather than the personal and immediate', 'Friendly to everyone but emotionally close to very few', 'Driven by a vision of how things could be better — for people, for society, for the future'],
    lifeFocus: 'Community, humanity, innovation, and the contribution of original ideas to the collective. You are here to help things evolve.',
    strength: 'Originality and vision. Your ability to see what could be, to think outside every convention, and to bring people together around an idea is a genuine power.',
    growthEdge: 'Personal intimacy and emotional presence. The Aquarian tendency to live in ideas can benefit from grounding in the personal and felt.',
    bodyPart: 'Ankles, calves, and circulatory system',
  },
  Pisces: {
    ruler: 'Jupiter', rulerNote: 'Jupiter as your chart ruler gives you compassion, spiritual sensitivity, and a porous, absorptive quality. Your Jupiter placement shapes how your idealism and spirituality express.',
    traits: ['Deeply empathetic — you feel what others feel, sometimes more vividly than your own experience', 'Spiritually oriented and naturally drawn to mystical, creative, or transcendent experiences', 'Rich inner life: imaginative, dreamy, and attuned to subtle dimensions others don\'t notice', 'Compassionate to the point of sometimes losing yourself in others\' needs'],
    lifeFocus: 'Spirituality, compassion, imagination, creative expression, and the dissolution of ego boundaries. Your life is a spiritual journey whether you frame it that way or not.',
    strength: 'Compassion and spiritual sensitivity. Your capacity for love, imagination, and mystical experience is extraordinary — a gift to yourself and to those around you.',
    growthEdge: 'Boundaries and discernment. The Pisces tendency to dissolve into others or into escapism benefits from learning when to hold yourself separate and how to choose wisely.',
    bodyPart: 'Feet and lymphatic system',
  },
};

const { width } = Dimensions.get('window');
const CHART_SIZE = width - 40;

// ─── North Indian Chart ───────────────────────────────────────────────────────

const NorthIndianChart = memo(function NorthIndianChart({ planets }: { planets: any[] }) {
  const S = CHART_SIZE;
  const planetsByHouse: Record<number, string[]> = {};
  planets.forEach(p => {
    const h = p.house;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    const symbol = PLANETS_BY_ID.get(p.planet.toLowerCase())?.symbol ?? p.planet[0];
    planetsByHouse[h].push(`${symbol}${p.isRetrograde ? '℞' : ''}`);
  });

  const centers: Record<number, [number, number]> = {
    1: [S*0.5, S*0.14], 2: [S*0.8, S*0.12], 3: [S*0.88, S*0.37],
    4: [S*0.88, S*0.63], 5: [S*0.8, S*0.88], 6: [S*0.5, S*0.88],
    7: [S*0.2, S*0.88], 8: [S*0.12, S*0.63], 9: [S*0.12, S*0.37],
    10: [S*0.2, S*0.12], 11: [S*0.41, S*0.38], 12: [S*0.41, S*0.62],
  };

  return (
    <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Rect width={S} height={S} fill="rgba(13,18,32,0.8)" rx="8" />
      <Rect x={8} y={8} width={S-16} height={S-16} fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth={1} />
      <Rect x={S*0.33} y={S*0.25} width={S*0.34} height={S*0.5} fill="none" stroke="rgba(201,168,76,0.25)" strokeWidth={0.5} />
      <Line x1={8} y1={8} x2={S*0.33} y2={S*0.25} stroke="rgba(201,168,76,0.3)" strokeWidth={0.5} />
      <Line x1={S-8} y1={8} x2={S*0.67} y2={S*0.25} stroke="rgba(201,168,76,0.3)" strokeWidth={0.5} />
      <Line x1={S-8} y1={S-8} x2={S*0.67} y2={S*0.75} stroke="rgba(201,168,76,0.3)" strokeWidth={0.5} />
      <Line x1={8} y1={S-8} x2={S*0.33} y2={S*0.75} stroke="rgba(201,168,76,0.3)" strokeWidth={0.5} />
      <Line x1={S*0.5} y1={8} x2={S*0.5} y2={S*0.25} stroke="rgba(201,168,76,0.2)" strokeWidth={0.5} />
      <Line x1={S-8} y1={S*0.5} x2={S*0.75} y2={S*0.5} stroke="rgba(201,168,76,0.2)" strokeWidth={0.5} />
      <Line x1={S*0.5} y1={S-8} x2={S*0.5} y2={S*0.75} stroke="rgba(201,168,76,0.2)" strokeWidth={0.5} />
      <Line x1={8} y1={S*0.5} x2={S*0.25} y2={S*0.5} stroke="rgba(201,168,76,0.2)" strokeWidth={0.5} />
      <Line x1={S*0.33} y1={S*0.25} x2={S*0.67} y2={S*0.75} stroke="rgba(201,168,76,0.15)" strokeWidth={0.5} />
      <Line x1={S*0.67} y1={S*0.25} x2={S*0.33} y2={S*0.75} stroke="rgba(201,168,76,0.15)" strokeWidth={0.5} />
      <SvgText x={S*0.5} y={S*0.52} textAnchor="middle" fill="rgba(201,168,76,0.35)" fontSize="22" fontFamily="serif">ॐ</SvgText>
      {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => {
        const [cx, cy] = centers[h] ?? [S*0.5, S*0.5];
        const planetsHere = planetsByHouse[h] ?? [];
        const isLagna = h === 1;
        return (
          <G key={String(h)}>
            <SvgText x={cx} y={cy - 8} textAnchor="middle"
              fill={isLagna ? 'rgba(201,168,76,0.9)' : 'rgba(245,240,232,0.3)'}
              fontSize={9} fontFamily="Cinzel, serif">{String(h)}</SvgText>
            {planetsHere.map((sym, i) => (
              <SvgText key={i} x={cx} y={cy + 6 + i * 14} textAnchor="middle"
                fill={isLagna ? '#E8C96A' : 'rgba(245,240,232,0.85)'}
                fontSize={11} fontFamily="serif">{sym}</SvgText>
            ))}
          </G>
        );
      })}
    </Svg>
  );
});

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  visible, title, subtitle, content, loading, isPremium,
  onClose, onAskGuru,
}: {
  visible: boolean; title: string; subtitle: string;
  content: string; loading: boolean; isPremium: boolean;
  onClose: () => void; onAskGuru: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={modalStyles.headerText}>
            <Text style={modalStyles.title}>{title}</Text>
            <Text style={modalStyles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
          {content ? (
            <Text style={modalStyles.content}>{content}</Text>
          ) : null}
          {loading && (
            <View style={modalStyles.loadingState}>
              <ActivityIndicator color={Colors.gold} size="small" />
              <Text style={modalStyles.loadingText}>The Guru is personalising this for you…</Text>
            </View>
          )}

          {/* Ask Guru button */}
          <TouchableOpacity
            style={[modalStyles.guruBtn, !isPremium && modalStyles.guroBtnLocked]}
            onPress={isPremium ? onAskGuru : () => { onClose(); router.push('/paywall'); }}
          >
            <Text style={modalStyles.guruBtnText}>
              {isPremium ? '🔱 Ask the Guru a Question' : '✦ Unlock with Premium'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = ['Chart', 'Dashas', 'Yogas', 'Planets'] as const;
type Tab = typeof TABS[number];

const YOGA_DESCRIPTIONS: Record<string, string> = {
  'Gajakesari Yoga': 'Gajakesari Yoga forms when the Moon and Jupiter are in angles from each other. This is one of the most auspicious combinations in Vedic astrology — it brings intelligence, good reputation, and the ability to positively impact many people. You have a natural gift for wisdom and are likely respected in your community.',
  'Budhaditya Yoga': 'Budhaditya Yoga forms when the Sun and Mercury are together in the same sign. This sharpens intelligence, communication, and analytical ability significantly. People with this yoga are often excellent writers, speakers, or thinkers who can express complex ideas with clarity.',
  'Chandra-Mangala Yoga': 'Chandra-Mangala forms when the Moon and Mars come together. It sharpens drive and emotional intensity — you act on what you feel rather than getting stuck in deliberation. Often associated with material success and the courage to advocate for yourself, but the energy needs healthy outlets to avoid friction with others.',
  'Lakshmi Yoga': 'Lakshmi Yoga centres on Venus — the planet of grace, beauty, and abundance — being well-placed in your chart. It indicates ease in attracting comfort, relationships, and the finer things in life. People with this yoga often have a refined aesthetic sense and a magnetic, inviting quality.',
  'Hamsa Yoga': 'Hamsa Yoga (Swan) is one of the five Pancha Mahapurusha yogas — it forms when Jupiter is strong in a kendra (angular house) in its own or exalted sign. It marks a person of wisdom, virtue, and good fortune — naturally respected, drawn to learning and teaching.',
  'Malavya Yoga': 'Malavya Yoga (Pancha Mahapurusha) forms when Venus is strong in a kendra in its own or exalted sign. It indicates beauty, refinement, artistic gift, and material comfort. Relationships and aesthetic sensibility are central to your life path.',
  'Sasha Yoga': 'Sasha Yoga (Pancha Mahapurusha) forms when Saturn is strong in a kendra in its own or exalted sign. It marks a person of patience, discipline, and lasting achievement — slower to start but extraordinarily durable, often rising to positions of authority through sustained work.',
  'Ruchaka Yoga': 'Ruchaka Yoga (Pancha Mahapurusha) forms when Mars is strong in a kendra in its own or exalted sign. It marks courage, leadership, and physical vitality — natural warriors who lead from the front and accomplish what others won\'t attempt.',
  'Bhadra Yoga': 'Bhadra Yoga (Pancha Mahapurusha) forms when Mercury is strong in a kendra in its own or exalted sign. It sharpens intellect, communication, and business acumen — gifted with words, ideas, and the ability to turn knowledge into success.',
  'Dharma Karmadhipati Yoga': 'This yoga forms when the rulers of the 9th house (dharma/higher purpose) and 10th house (career/public life) connect in a meaningful way. It suggests your career and your life purpose are aligned — your work in the world is likely to carry real meaning and spiritual significance.',
};

const DASHA_MEANINGS: Record<string, { theme: string; description: string; opportunities: string; watch: string }> = {
  Sun: { theme: 'Identity & Authority', description: 'The Sun period brings focus to your sense of self, your relationship with authority figures, your father, and your public reputation. This is a time to step into leadership and clarify who you truly are.', opportunities: 'Career advancement, recognition, government or leadership roles, strengthening your health and vitality.', watch: 'Ego conflicts, overconfidence, issues with authority figures.' },
  Moon: { theme: 'Emotions & Inner World', description: 'The Moon period turns attention inward — to your emotions, your home life, your relationship with your mother, and your sense of belonging. The mind is more active and sensitive during this time.', opportunities: 'Deepening relationships, home improvements, creative and intuitive work, emotional healing.', watch: 'Mood fluctuations, over-sensitivity, making decisions from fear rather than clarity.' },
  Mars: { theme: 'Action & Courage', description: 'The Mars period is one of energy, ambition, and direct action. It activates themes around property, siblings, physical vitality, and the courage to pursue what you want.', opportunities: 'Starting new ventures, physical training, property matters, asserting your needs clearly.', watch: 'Impulsiveness, conflict, accidents from moving too fast. Channel the energy, don\'t suppress it.' },
  Mercury: { theme: 'Mind & Communication', description: 'The Mercury period sharpens intellect, business sense, and communication. Travel, learning, writing, and networking tend to flourish. This is an excellent period for developing new skills.', opportunities: 'Study, business, writing, short trips, skill development, networking.', watch: 'Over-analysis, spreading yourself too thin, nervous energy from doing too many things at once.' },
  Jupiter: { theme: 'Growth & Wisdom', description: 'The Jupiter period is often considered the most auspicious of all planetary periods. It brings expansion, grace, wisdom, and a genuine sense that life is opening up. Teachers, mentors, and fortunate opportunities tend to appear.', opportunities: 'Education, spiritual growth, marriage, children, financial expansion, finding meaningful purpose.', watch: 'Overexpansion, making promises you can\'t keep, taking good fortune for granted.' },
  Venus: { theme: 'Love & Creativity', description: 'The Venus period places the heart at the centre of life. Relationships, beauty, creativity, and material comfort become primary themes. This is often a period of deep pleasure and connection.', opportunities: 'Romantic relationships, creative projects, artistic expression, financial prosperity, enjoying life.', watch: 'Overindulgence, attachment, neglecting practical responsibilities in favour of pleasure.' },
  Saturn: { theme: 'Discipline & Legacy', description: 'The Saturn period is the great teacher. It asks for patience, hard work, and confronting whatever has been avoided. Though it can feel heavy, what you build during Saturn\'s period is built to last a lifetime.', opportunities: 'Long-term career building, developing discipline, resolving old karmas, creating something enduring.', watch: 'Depression, isolation, feeling burdened. Remember: Saturn rewards consistent effort over time.' },
  Rahu: { theme: 'Ambition & Transformation', description: 'The Rahu period is one of rapid change, worldly ambition, and sometimes confusion. It pushes you toward unfamiliar territory and can bring sudden opportunities or disruptions. Foreign places, technology, and unconventional paths tend to feature.', opportunities: 'Career breakthroughs, foreign connections, material expansion, stepping into new identities.', watch: 'Illusion, obsession, overreaching. Discernment is essential — not every opportunity is what it appears.' },
  Ketu: { theme: 'Spirituality & Release', description: 'The Ketu period turns attention away from the material world and toward the spiritual. It is a time of detachment, inner inquiry, and completing old cycles. Things you\'ve outgrown tend to naturally fall away.', opportunities: 'Spiritual practice, meditation, healing, research, uncovering hidden talents from past lives.', watch: 'Confusion about direction, feeling unmoored or detached from life. Anchor yourself in spiritual practice.' },
};

export default function ChartScreen() {
  const { birthData, chart, isPremiumFlag, setChart } = useAppStore(useShallow(s => ({
    birthData: s.user.birthData,
    chart: s.user.chart,
    isPremiumFlag: s.user.isPremium,
    setChart: s.setChart,
  })));
  const setPendingGuruContext = useAppStore(s => s.setPendingGuruContext);
  const [activeTab, setActiveTab] = useState<Tab>('Chart');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [refreshingChart, setRefreshingChart] = useState(false);
  const [showApproxNotice, setShowApproxNotice] = useState(false);
  const user = { birthData, chart, isPremium: isPremiumFlag };

  const refreshChart = useCallback(async () => {
    if (!birthData || refreshingChart) return;
    setRefreshingChart(true);
    try {
      const fresh = await generateChart(birthData);
      setChart(fresh);
      setShowApproxNotice(false);
    } catch (e) {
      if (__DEV__) console.warn('[ChartScreen] chart refresh failed:', e);
    } finally {
      setRefreshingChart(false);
    }
  }, [birthData, refreshingChart, setChart]);

  // Silent background retry — up to 3 attempts before showing a quiet notice.
  useEffect(() => {
    if (!chart?.isApproximate || !birthData) return;
    let cancelled = false;

    const run = async () => {
      const delays = [4000, 8000];
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        if (attempt > 0) await new Promise(r => setTimeout(r, delays[attempt - 1] ?? 8000));
        if (cancelled) return;
        try {
          const fresh = await generateChart(birthData);
          if (!cancelled) { setChart(fresh); setShowApproxNotice(false); }
          return;
        } catch { /* try next attempt */ }
      }
      if (!cancelled) setShowApproxNotice(true);
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartPlanets = chart?.planets;
  const chartDashas = chart?.dashas;
  const chartYogas = chart?.yogas;
  const planets = useMemo(() => chartPlanets ?? [], [chartPlanets]);
  const dashas = useMemo(() => chartDashas ?? [], [chartDashas]);
  const yogas = useMemo(() => chartYogas ?? [], [chartYogas]);
  // `nowTick` advances on screen focus (and on dasha update) so progress bars and
  // past/active/future labels stay correct without trusting the persisted
  // `dasha.isActive` flag, which freezes at chart-generation time.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useFocusEffect(useCallback(() => { setNowTick(Date.now()); }, []));
  const now = useMemo(() => new Date(nowTick), [nowTick]);

  const dashaRows = useMemo(() => {
    const t = now.getTime();
    return dashas.map(dasha => {
      const start = new Date(dasha.startDate);
      const end = new Date(dasha.endDate);
      const total = end.getTime() - start.getTime();
      const elapsed = Math.min(t - start.getTime(), total);
      const pct = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
      const planet = PLANETS_BY_ID.get(dasha.planet.toLowerCase());
      const info = DASHA_MEANINGS[dasha.planet];
      const isActive = start.getTime() <= t && t < end.getTime();
      const isPast = !isActive && t >= end.getTime();
      const isFuture = !isActive && t < start.getTime();
      return { dasha, start, end, pct, planet, info, isActive, isPast, isFuture };
    });
  }, [dashas, now]);
  const isPremium = user.isPremium;
  const guruCacheRef = useRef<Record<string, string>>({});
  const guruContextRef = useRef<string>('');
  // Increments whenever the modal is closed/reopened. Async handlers compare against
  // their captured token before applying state, preventing late responses from
  // overwriting content for a different (or already-closed) modal session.
  const requestTokenRef = useRef(0);

  const openDasha = useCallback(async (dasha: any, isActive: boolean, isPast: boolean, isFuture: boolean) => {
    const start = new Date(dasha.startDate);
    const end = new Date(dasha.endDate);

    // Future periods are premium-only
    if (isFuture && !isPremium) { router.push('/paywall'); return; }

    const info = DASHA_MEANINGS[dasha.planet];
    const cacheKey = `dasha-${dasha.planet}-${isPast ? 'past' : isActive ? 'active' : 'future'}`;
    setModalTitle(`${dasha.planet} Period`);
    setModalSubtitle(`${start.getFullYear()} – ${end.getFullYear()} · ${dasha.years} years`);
    guruContextRef.current = `I'm ${isActive ? 'currently in' : isPast ? 'reflecting on' : 'preparing for'} my ${dasha.planet} Mahadasha (${start.getFullYear()}–${end.getFullYear()}):`;

    const staticInfo = info
      ? `THEME: ${info.theme}\n\n${info.description}\n\nOPPORTUNITIES\n${info.opportunities}\n\nWATCH FOR\n${info.watch}`
      : `This is your ${dasha.planet} planetary period.`;

    const token = ++requestTokenRef.current;

    // Current/future dasha — free users get static + upsell, premium gets AI reading
    if (!isPast && !isPremium) {
      setModalContent(staticInfo + '\n\n─────────────────\n✦ Subscribe to unlock your personalised reading for this period.');
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    setModalContent(staticInfo);
    setModalLoading(true);
    setModalVisible(true);

    let prompt: string;
    if (isPast) {
      prompt = `I went through my ${dasha.planet} Mahadasha from ${start.getFullYear()} to ${end.getFullYear()} (${dasha.years} years) — this period has now passed. Reflecting on it through the lens of my birth chart: what were the defining themes, life lessons, and karmic patterns that this period would have brought for me specifically? How would my particular planetary placements have coloured this period? What was being resolved or revealed? Give me a meaningful retrospective reading. Explain in simple, clear English.`;
    } else if (isActive) {
      prompt = `I'm currently in my ${dasha.planet} Mahadasha (${start.getFullYear()}–${end.getFullYear()}, ${dasha.years} years). Give me a deeply personal reading of what this planetary period means specifically for me based on my chart. Cover: the core theme and energy of this period in my life; how it interacts with my specific planetary placements; what opportunities I should look for; what challenges to be mindful of; and practical advice for navigating this period well. Explain in simple, clear English without jargon.`;
    } else {
      prompt = `I will enter my ${dasha.planet} Mahadasha from ${start.getFullYear()} to ${end.getFullYear()} (${dasha.years} years) in the future. Based on my specific birth chart, how should I prepare for this period? What themes, opportunities, and challenges can I expect? Which areas of my life will this period most strongly activate? What can I do now to make the most of it when it arrives? Explain in simple, clear English without jargon.`;
    }

    try {
      if (!user.birthData) throw new Error('No birth data');
      const response = await askGuru(prompt, [], user.birthData, user.chart);
      guruCacheRef.current[cacheKey] = response;
      if (token === requestTokenRef.current) setModalContent(response);
    } catch (e: any) {
      if (token === requestTokenRef.current) {
        setModalContent(prev => prev + `\n\n[AI reading unavailable: ${e?.message ?? 'Please try again.'}]`);
      }
    } finally {
      if (token === requestTokenRef.current) setModalLoading(false);
    }
  }, [isPremium, user.birthData, user.chart]);

  const openYoga = useCallback(async (yoga: string) => {
    const cacheKey = `yoga-${yoga}`;
    setModalTitle(yoga);
    setModalSubtitle('Planetary combination in your chart');

    const staticDesc = YOGA_DESCRIPTIONS[yoga] ?? `${yoga} is a meaningful planetary combination present in your birth chart.`;
    guruContextRef.current = `I have ${yoga} in my birth chart:`;

    const token = ++requestTokenRef.current;

    if (!isPremium) {
      setModalContent(staticDesc + '\n\n─────────────────\n✦ Subscribe to unlock your personalised reading for this yoga.');
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    setModalContent(staticDesc);
    setModalLoading(true);
    setModalVisible(true);

    try {
      if (!user.birthData) throw new Error('No birth data');
      const response = await askGuru(
        `I have ${yoga} in my birth chart. Give me a deeply personal reading of what this yoga means specifically for me based on my chart. Cover: what this yoga is and which planets form it in my chart; how it manifests in my personality, talents, and life path; what areas of life it most strongly influences; how my current Mahadasha period interacts with this yoga; and practical advice for making the most of this combination. Explain in simple, clear English without jargon.`,
        [],
        user.birthData,
        user.chart
      );
      guruCacheRef.current[cacheKey] = response;
      if (token === requestTokenRef.current) setModalContent(response);
    } catch (e: any) {
      if (token === requestTokenRef.current) {
        setModalContent(prev => prev + `\n\n[AI reading unavailable: ${e?.message ?? 'Please try again.'}]`);
      }
    } finally {
      if (token === requestTokenRef.current) setModalLoading(false);
    }
  }, [isPremium, user.birthData, user.chart]);

  const openPlanet = useCallback(async (p: any) => {
    const cacheKey = `planet-${p.planet}-${p.sign}-${p.house}`;
    setModalTitle(`${p.planet} in ${p.sign}`);
    setModalSubtitle(`${p.degree.toFixed(2)}° ${p.sign} · House ${p.house} · ${p.nakshatra} · ${p.isRetrograde ? 'Retrograde ℞' : 'Direct'}`);
    guruContextRef.current = `About my ${p.planet} in ${p.sign} (House ${p.house}, ${p.nakshatra}${p.isRetrograde ? ', retrograde' : ''}):`;

    const staticDesc = `${p.planet} is placed in ${p.sign} in your ${p.house}th house, in the nakshatra ${p.nakshatra}${p.isRetrograde ? ' and is currently retrograde' : ''}.\n\n${p.sign} colours the expression of ${p.planet}'s energy — the ${p.house}th house shows which area of life this plays out most strongly. The nakshatra ${p.nakshatra} adds a further layer of nuance to how this placement manifests in your personality and life path.`;

    const token = ++requestTokenRef.current;

    if (!isPremium) {
      setModalContent(staticDesc + '\n\n─────────────────\n✦ Subscribe to unlock your personalised reading for this placement.');
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    setModalContent(staticDesc);
    setModalLoading(true);
    setModalVisible(true);

    try {
      if (!user.birthData) throw new Error('No birth data');
      const response = await askGuru(
        `Tell me about my ${p.planet} placement in ${p.sign} in my ${p.house}th house in ${p.nakshatra} nakshatra${p.isRetrograde ? ', which is retrograde' : ''}. What does this mean for my personality, life themes, and how this planet specifically applies to me? Explain in simple, clear English without jargon.`,
        [],
        user.birthData,
        user.chart
      );
      guruCacheRef.current[cacheKey] = response;
      if (token === requestTokenRef.current) setModalContent(response);
    } catch (e: any) {
      if (token === requestTokenRef.current) {
        setModalContent(prev => prev + `\n\n[AI reading unavailable: ${e?.message ?? 'Please try again.'}]`);
      }
    } finally {
      if (token === requestTokenRef.current) setModalLoading(false);
    }
  }, [isPremium, user.birthData, user.chart]);

  const handleAskGuru = useCallback(() => {
    const context = guruContextRef.current;
    setModalVisible(false);
    if (context) setPendingGuruContext(context);
    setTimeout(() => router.push('/(tabs)/guru'), 300);
  }, [setPendingGuruContext]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Birth Chart</Text>
        <Text style={styles.subtitle}>
          {user.birthData
            ? `${new Date(user.birthData.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} · ${user.birthData.placeOfBirth}`
            : 'Complete onboarding to see your chart'}
        </Text>
      </View>

      {/* Approximate-mode banner — visible across every tab, not just Chart,
          so users on the Dashas/Yogas/Planets tabs know the data isn't authoritative. */}
      {chart?.isApproximate && showApproxNotice && (
        <TouchableOpacity onPress={refreshChart} style={styles.approxBanner} disabled={refreshingChart}>
          <Text style={styles.approxBannerText}>
            {refreshingChart
              ? 'Refreshing chart…'
              : '✦ Positions estimated — live data unavailable. Tap to retry.'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Chart tab ── */}
        {activeTab === 'Chart' && (
          <View style={styles.section}>
            {user.chart ? (
              <>
                <View style={styles.chartWrap}>
                  <NorthIndianChart planets={planets} />
                </View>

                {/* Rising Sign — expanded */}
                {(() => {
                  const lagna = user.chart.lagna;
                  const data = LAGNA_DATA[lagna];
                  return (
                    <View style={styles.lagnaCard}>
                      <Text style={styles.lagnaLabel}>RISING SIGN (ASCENDANT)</Text>
                      <Text style={styles.lagnaValue}>{lagna}</Text>
                      {data ? (
                        <>
                          <Text style={styles.lagnaRuler}>Ruled by {data.ruler} · {data.bodyPart}</Text>
                          <Text style={styles.lagnaRulerNote}>{data.rulerNote}</Text>

                          <View style={styles.lagnaDivider} />

                          <Text style={styles.lagnaSubLabel}>HOW YOU APPEAR TO THE WORLD</Text>
                          {data.traits.map((t, i) => (
                            <View key={i} style={styles.lagnaTraitRow}>
                              <Text style={styles.lagnaTraitDot}>◈</Text>
                              <Text style={styles.lagnaTraitText}>{t}</Text>
                            </View>
                          ))}

                          <View style={styles.lagnaDivider} />

                          <Text style={styles.lagnaSubLabel}>LIFE FOCUS</Text>
                          <Text style={styles.lagnaBodyText}>{data.lifeFocus}</Text>

                          <View style={styles.lagnaDivider} />

                          <View style={styles.lagnaStrengthRow}>
                            <View style={styles.lagnaStrengthCard}>
                              <Text style={styles.lagnaStrengthLabel}>YOUR STRENGTH</Text>
                              <Text style={styles.lagnaStrengthText}>{data.strength}</Text>
                            </View>
                            <View style={[styles.lagnaStrengthCard, { borderColor: Colors.amber + '50' }]}>
                              <Text style={[styles.lagnaStrengthLabel, { color: Colors.amber }]}>GROWTH EDGE</Text>
                              <Text style={styles.lagnaStrengthText}>{data.growthEdge}</Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.lagnaNote}>
                          {lagna} was the sign rising on the horizon at the moment of your birth — it shapes your personality and how you appear to the world.
                        </Text>
                      )}
                    </View>
                  );
                })()}

                <TouchableOpacity style={styles.refreshChartBtn} onPress={refreshChart} disabled={refreshingChart}>
                  {refreshingChart
                    ? <ActivityIndicator color={Colors.gold} size="small" />
                    : <Text style={styles.refreshChartBtnText}>↻ Refresh Chart</Text>
                  }
                </TouchableOpacity>
                {!user.chart.isApproximate
                  ? <Text style={styles.methodologyBadge}>Swiss Ephemeris · Lahiri Ayanamsha · Whole Sign Houses</Text>
                  : showApproxNotice
                    ? <TouchableOpacity onPress={refreshChart} style={styles.approxNoticeRow}>
                        <Text style={styles.approxNoticeText}>Positions estimated — live data unavailable. Tap to retry.</Text>
                      </TouchableOpacity>
                    : null
                }
              </>
            ) : (
              <View style={styles.noChartState}>
                <Text style={styles.noChartIcon}>⬡</Text>
                <Text style={styles.noChartText}>Complete your birth details to generate your chart</Text>
                <TouchableOpacity style={styles.setupBtn} onPress={() => router.push('/onboarding')}>
                  <Text style={styles.setupBtnText}>Set Up My Chart →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Dashas tab ── */}
        {activeTab === 'Dashas' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR PLANETARY PERIODS</Text>
            <Text style={styles.sectionSubtitle}>
              Your life unfolds in chapters, each ruled by a planet. Tap any period to learn what it means for you.
            </Text>
            {dashas.length === 0 ? (
              <Text style={styles.emptyText}>Generate your chart to see your planetary periods.</Text>
            ) : (
              dashaRows.map(({ dasha, start, end, pct, planet, info, isActive, isPast, isFuture }) => {
                const locked = isFuture && !isPremium;
                return (
                  <TouchableOpacity
                    key={dasha.planet + dasha.startDate}
                    style={[styles.dashaCard, isActive && styles.dashaCardActive, isPast && styles.dashaCardPast]}
                    onPress={() => openDasha(dasha, isActive, isPast, isFuture)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dashaHeader}>
                      <View style={styles.dashaLeft}>
                        <Text style={[styles.dashaSymbol, { color: isPast ? Colors.muted : (planet?.color ?? Colors.gold) }]}>
                          {planet?.symbol ?? '◉'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <View style={styles.dashaTopRow}>
                            <Text style={[styles.dashaPlanet, isPast && { color: Colors.muted }]}>
                              {dasha.planet} Period
                            </Text>
                            {isActive && (
                              <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>NOW</Text>
                              </View>
                            )}
                            {isPast && (
                              <Text style={styles.pastBadge}>PAST</Text>
                            )}
                          </View>
                          {info && <Text style={[styles.dashaTheme, isPast && { color: Colors.muted }]}>{info.theme}</Text>}
                          <Text style={styles.dashaDates}>
                            {start.getFullYear()} – {end.getFullYear()} · {dasha.years} yrs
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dashaRight}>
                        {locked ? (
                          <Text style={styles.lockIcon}>✦</Text>
                        ) : (
                          <Text style={styles.tapHint}>Tap →</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.dashaTrack}>
                      <View style={[styles.dashaFill, {
                        width: `${pct * 100}%`,
                        backgroundColor: isActive ? Colors.gold : (isPast ? Colors.muted : (planet?.color ?? Colors.gold)),
                      }]} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ── Yogas tab ── */}
        {activeTab === 'Yogas' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPECIAL COMBINATIONS IN YOUR CHART</Text>
            <Text style={styles.sectionSubtitle}>
              Yogas are special planetary combinations that create distinct patterns in your life. Tap any yoga to learn what it means for you.
            </Text>
            {yogas.length === 0 ? (
              <Text style={styles.emptyText}>Your yogas will appear once your chart is generated.</Text>
            ) : (
              yogas.map(yoga => (
                <TouchableOpacity
                  key={yoga}
                  style={styles.yogaCard}
                  onPress={() => openYoga(yoga)}
                  activeOpacity={0.75}
                >
                  <View style={styles.yogaLeft}>
                    <Text style={styles.yogaDot}>✦</Text>
                    <View>
                      <Text style={styles.yogaName}>{yoga}</Text>
                      <Text style={styles.yogaHint}>Tap to learn what this means for you</Text>
                    </View>
                  </View>
                  <Text style={styles.tapHint}>→</Text>
                </TouchableOpacity>
              ))
            )}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What are yogas?</Text>
              <Text style={styles.infoText}>
                Yogas are powerful planetary combinations — like a special chord in music. When specific planets align in particular ways in your chart, they create amplified results in certain areas of life: wealth, intelligence, fame, spiritual growth, or relationship success. Some yogas make you particularly gifted in specific areas. Others bring challenges that, when worked through, become your greatest strengths.
              </Text>
            </View>
          </View>
        )}

        {/* ── Planets tab ── */}
        {activeTab === 'Planets' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR PLANETS</Text>
            <Text style={styles.sectionSubtitle}>
              Each planet occupies a specific area of your chart and influences that part of your life. Tap any planet to get a personalised explanation.
            </Text>
            {planets.length === 0 ? (
              <Text style={styles.emptyText}>Generate your chart to see your planetary positions.</Text>
            ) : (
              planets.map(p => {
                const planetData = PLANETS_BY_ID.get(p.planet.toLowerCase());
                return (
                  <TouchableOpacity
                    key={p.planet}
                    style={styles.planetCard}
                    onPress={() => openPlanet(p)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.planetIcon, { backgroundColor: (planetData?.color ?? Colors.gold) + '22' }]}>
                      <Text style={[styles.planetSym, { color: planetData?.color ?? Colors.gold }]}>
                        {planetData?.symbol ?? p.planet[0]}
                      </Text>
                    </View>
                    <View style={styles.planetInfo}>
                      <Text style={styles.planetName}>
                        {p.planet}{p.isRetrograde ? ' ℞' : ''}
                      </Text>
                      <Text style={styles.planetPosition}>
                        {p.degree.toFixed(2)}° {p.sign} · House {p.house}
                      </Text>
                      <Text style={styles.planetNak}>{p.nakshatra} nakshatra · Pada {p.pada}</Text>
                      {(p.isExalted || p.isDebilitated) && (
                        <Text style={[styles.dignityBadge, { color: p.isExalted ? Colors.emerald : Colors.amber }]}>
                          {p.isExalted ? '⬆ Strongest position' : '⬇ Challenged position'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.planetRight}>
                      <Text style={styles.tapHint}>Tap →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Detail Modal */}
      <DetailModal
        visible={modalVisible}
        title={modalTitle}
        subtitle={modalSubtitle}
        content={modalContent}
        loading={modalLoading}
        isPremium={isPremium}
        onClose={() => {
          requestTokenRef.current += 1;
          setModalVisible(false);
          setModalContent('');
          setModalLoading(false);
          setModalTitle('');
          setModalSubtitle('');
        }}
        onAskGuru={handleAskGuru}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 3 },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, flexGrow: 0 },
  tabsContainer: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center', paddingVertical: 12 },
  // Explicit height + flex-center the text. The previous version relied on
  // paddingVertical to size the tab, but iOS clipped Cinzel's tall ascenders
  // when fontSize was small. Anchoring the touchable to a known height and
  // centering the text inside avoids the line-box height-calc that was clipping.
  tab: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  tabText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.cinzel,
    color: Colors.muted,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  tabTextActive: { color: Colors.gold },
  scrollContent: { paddingBottom: 20 },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20, marginBottom: 16 },
  emptyText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center', paddingVertical: 40 },

  // Chart
  chartWrap: { alignItems: 'center', marginBottom: Spacing.md },
  noChartState: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: 12 },
  noChartIcon: { fontSize: 48, color: Colors.muted },
  noChartText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorant, textAlign: 'center' },
  setupBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: 24, paddingVertical: 12 },
  setupBtnText: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.midnight },
  methodologyBadge: { fontSize: 10, color: Colors.mutedDark, fontFamily: Fonts.cormorantItalic, textAlign: 'center', marginTop: 8, letterSpacing: 0.5 },
  approxNoticeRow: { marginTop: 8, alignSelf: 'center' },
  approxNoticeText: { fontSize: 11, color: Colors.amber, fontFamily: Fonts.cormorantItalic, textAlign: 'center', textDecorationLine: 'underline' },
  approxBanner: { backgroundColor: Colors.goldDim, borderBottomWidth: 1, borderBottomColor: Colors.gold, paddingVertical: 8, paddingHorizontal: Spacing.md },
  approxBannerText: { fontSize: 12, lineHeight: 18, color: Colors.amber, fontFamily: Fonts.cormorantItalic, textAlign: 'center' },

  lagnaCard: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8 },
  lagnaLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 4 },
  lagnaValue: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 4 },
  lagnaNote: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20 },
  lagnaRuler: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, letterSpacing: 0.5, marginBottom: 6 },
  lagnaRulerNote: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20 },
  lagnaDivider: { height: 1, backgroundColor: 'rgba(201,168,76,0.2)', marginVertical: 14 },
  lagnaSubLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 10 },
  lagnaTraitRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  lagnaTraitDot: { fontSize: 10, color: Colors.gold, marginTop: 3 },
  lagnaTraitText: { flex: 1, fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20 },
  lagnaBodyText: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 21 },
  lagnaStrengthRow: { flexDirection: 'row', gap: 8 },
  lagnaStrengthCard: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: Radius.md, padding: 10 },
  lagnaStrengthLabel: { fontSize: 8, letterSpacing: 1.5, color: Colors.emerald, fontFamily: Fonts.cinzel, marginBottom: 6 },
  lagnaStrengthText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18 },
  refreshChartBtn: { marginTop: 12, alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12, minWidth: 44, alignItems: 'center' },
  refreshChartBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel },

  // Dashas
  dashaCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  dashaCardActive: { borderColor: Colors.gold, backgroundColor: 'rgba(201,168,76,0.06)' },
  dashaCardPast: { opacity: 0.65 },
  dashaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dashaLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dashaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  dashaSymbol: { fontSize: 26, marginTop: 2 },
  dashaPlanet: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.star },
  dashaTheme: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cormorantItalic, marginBottom: 2 },
  dashaDates: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson },
  dashaRight: { paddingLeft: 8 },
  activeBadge: { backgroundColor: Colors.emerald + '22', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  activeBadgeText: { fontSize: 9, color: Colors.emerald, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  pastBadge: { fontSize: 9, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  dashaTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  dashaFill: { height: '100%', borderRadius: 2 },

  // Yogas
  yogaCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 14, marginBottom: 8 },
  yogaLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  yogaDot: { color: Colors.gold, fontSize: 14, marginTop: 2 },
  yogaName: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  yogaHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  infoCard: { marginTop: 8, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold + '40', borderRadius: Radius.lg, padding: Spacing.md },
  infoTitle: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: 8 },
  infoText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 21 },

  // Planets
  planetCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 14, marginBottom: 8 },
  planetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planetSym: { fontSize: 20 },
  planetInfo: { flex: 1 },
  planetName: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  planetPosition: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  planetNak: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cormorantItalic, marginTop: 1 },
  dignityBadge: { fontSize: 10, fontFamily: Fonts.crimson, marginTop: 3 },
  planetRight: { alignItems: 'flex-end' },

  // Shared
  tapHint: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel },
  lockIcon: { fontSize: 10, color: Colors.gold, fontFamily: Fonts.cinzel },

});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: 12 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: Colors.muted },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 3 },
  body: { flex: 1, padding: Spacing.md },
  loadingState: { paddingVertical: 60, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  content: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26, marginBottom: Spacing.xl },
  guruBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginTop: 8 },
  guroBtnLocked: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold },
  guruBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },
});
