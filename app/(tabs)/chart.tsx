import { useState, useRef, memo, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, ActivityIndicator, SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useAppStore } from '@store/userStore';
import { router } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { PLANETS } from '@constants/astrology';
import { askGuru } from '@services/claude';

const { width } = Dimensions.get('window');
const CHART_SIZE = width - 40;

// ─── North Indian Chart ───────────────────────────────────────────────────────

const NorthIndianChart = memo(function NorthIndianChart({ planets }: { planets: any[] }) {
  const S = CHART_SIZE;
  const planetsByHouse: Record<number, string[]> = {};
  planets.forEach(p => {
    const h = p.house;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    const symbol = PLANETS.find(pl => pl.id === p.planet.toLowerCase())?.symbol ?? p.planet[0];
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
      <RNSafeAreaView style={modalStyles.container}>
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
      </RNSafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = ['Chart', 'Dashas', 'Yogas', 'Planets'] as const;
type Tab = typeof TABS[number];

const YOGA_DESCRIPTIONS: Record<string, string> = {
  'Gajakesari Yoga': 'Gajakesari Yoga forms when the Moon and Jupiter are in angles from each other. This is one of the most auspicious combinations in Vedic astrology — it brings intelligence, good reputation, and the ability to positively impact many people. You have a natural gift for wisdom and are likely respected in your community.',
  'Budhaditya Yoga': 'Budhaditya Yoga forms when the Sun and Mercury are together in the same sign. This sharpens intelligence, communication, and analytical ability significantly. People with this yoga are often excellent writers, speakers, or thinkers who can express complex ideas with clarity.',
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
  const user = useAppStore(s => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('Chart');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const planets = user.chart?.planets ?? [];
  const dashas = user.chart?.dashas ?? [];
  const yogas = user.chart?.yogas ?? [];
  const now = new Date();
  const isPremium = user.isPremium;
  const guruCacheRef = useRef<Record<string, string>>({});

  const openDasha = async (dasha: any) => {
    if (!isPremium) { router.push('/paywall'); return; }
    const info = DASHA_MEANINGS[dasha.planet];
    const start = new Date(dasha.startDate);
    const end = new Date(dasha.endDate);
    const cacheKey = `dasha-${dasha.planet}`;
    setModalTitle(`${dasha.planet} Period`);
    setModalSubtitle(`${start.getFullYear()} – ${end.getFullYear()} · ${dasha.years} years`);

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    // Show static info immediately while Guru loads
    const staticInfo = info
      ? `THEME: ${info.theme}\n\n${info.description}\n\nOPPORTUNITIES\n${info.opportunities}\n\nWATCH FOR\n${info.watch}`
      : `This is your ${dasha.planet} planetary period.`;
    setModalContent(staticInfo);
    setModalLoading(true);
    setModalVisible(true);

    try {
      if (!user.birthData) throw new Error('No birth data');
      const response = await askGuru(
        `I'm currently ${dasha.isActive ? 'in' : (now > end ? 'past' : 'approaching')} my ${dasha.planet} Mahadasha (${start.getFullYear()}–${end.getFullYear()}, ${dasha.years} years). Give me a deeply personal reading of what this planetary period means specifically for me based on my chart. Cover: the core theme and energy of this period in my life; how it interacts with my specific planetary placements; what opportunities I should look for; what challenges to be mindful of; and practical advice for navigating this period well. Explain in simple, clear English without jargon.`,
        [],
        user.birthData,
        user.chart
      );
      guruCacheRef.current[cacheKey] = response;
      setModalContent(response);
    } catch {
      // Keep the static info already shown
    } finally {
      setModalLoading(false);
    }
  };

  const openYoga = async (yoga: string) => {
    if (!isPremium) { router.push('/paywall'); return; }
    const cacheKey = `yoga-${yoga}`;
    setModalTitle(yoga);
    setModalSubtitle('Planetary combination in your chart');

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    // Show static description while Guru loads
    setModalContent(YOGA_DESCRIPTIONS[yoga] ?? `${yoga} is a meaningful planetary combination present in your birth chart.`);
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
      setModalContent(response);
    } catch {
      // Keep the static info already shown
    } finally {
      setModalLoading(false);
    }
  };

  const openPlanet = async (p: any) => {
    if (!isPremium) { router.push('/paywall'); return; }
    const cacheKey = `planet-${p.planet}-${p.sign}-${p.house}`;
    setModalTitle(`${p.planet} in ${p.sign}`);
    setModalSubtitle(`House ${p.house} · ${p.nakshatra} · ${p.isRetrograde ? 'Retrograde' : 'Direct'}`);

    if (guruCacheRef.current[cacheKey]) {
      setModalContent(guruCacheRef.current[cacheKey]);
      setModalLoading(false);
      setModalVisible(true);
      return;
    }

    setModalContent('');
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
      setModalContent(response);
    } catch {
      setModalContent(`Your ${p.planet} is placed in ${p.sign} in your ${p.house}th house. Ask the Guru below to get a personalised explanation of what this means for you.`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAskGuru = () => {
    setModalVisible(false);
    setTimeout(() => router.push('/(tabs)/guru'), 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Birth Chart</Text>
        <Text style={styles.subtitle}>
          {user.birthData
            ? `${new Date(user.birthData.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · ${user.birthData.placeOfBirth}`
            : 'Complete onboarding to see your chart'}
        </Text>
      </View>

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
                <View style={styles.lagnaCard}>
                  <Text style={styles.lagnaLabel}>RISING SIGN (ASCENDANT)</Text>
                  <Text style={styles.lagnaValue}>{user.chart.lagna}</Text>
                  <Text style={styles.lagnaNote}>This is the sign that was rising on the horizon at the moment of your birth — it shapes your personality and how you appear to the world.</Text>
                </View>
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
              dashas.map(dasha => {
                const start = new Date(dasha.startDate);
                const end = new Date(dasha.endDate);
                const total = end.getTime() - start.getTime();
                const elapsed = Math.min(now.getTime() - start.getTime(), total);
                const pct = Math.max(0, Math.min(1, elapsed / total));
                const planet = PLANETS.find(p => p.id === dasha.planet.toLowerCase());
                const info = DASHA_MEANINGS[dasha.planet];

                return (
                  <TouchableOpacity
                    key={dasha.planet + dasha.startDate}
                    style={[styles.dashaCard, dasha.isActive && styles.dashaCardActive]}
                    onPress={() => openDasha(dasha)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dashaHeader}>
                      <View style={styles.dashaLeft}>
                        <Text style={[styles.dashaSymbol, { color: planet?.color ?? Colors.gold }]}>
                          {planet?.symbol ?? '◉'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <View style={styles.dashaTopRow}>
                            <Text style={styles.dashaPlanet}>
                              {dasha.planet} Period
                            </Text>
                            {dasha.isActive && (
                              <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>NOW</Text>
                              </View>
                            )}
                          </View>
                          {info && <Text style={styles.dashaTheme}>{info.theme}</Text>}
                          <Text style={styles.dashaDates}>
                            {start.getFullYear()} – {end.getFullYear()} · {dasha.years} yrs
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dashaRight}>
                        {isPremium ? (
                          <Text style={styles.tapHint}>Tap →</Text>
                        ) : (
                          <Text style={styles.lockIcon}>✦</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.dashaTrack}>
                      <View style={[styles.dashaFill, {
                        width: `${pct * 100}%`,
                        backgroundColor: dasha.isActive ? Colors.gold : (planet?.color ?? Colors.gold),
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
                  {isPremium
                    ? <Text style={styles.tapHint}>→</Text>
                    : <Text style={styles.lockIcon}>✦ Pro</Text>
                  }
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
                const planetData = PLANETS.find(pl => pl.id === p.planet.toLowerCase());
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
                        {p.sign} · House {p.house}
                      </Text>
                      <Text style={styles.planetNak}>{p.nakshatra} nakshatra</Text>
                      {(p.isExalted || p.isDebilitated) && (
                        <Text style={[styles.dignityBadge, { color: p.isExalted ? Colors.emerald : Colors.amber }]}>
                          {p.isExalted ? '⬆ Strongest position' : '⬇ Challenged position'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.planetRight}>
                      {isPremium
                        ? <Text style={styles.tapHint}>Tap →</Text>
                        : <Text style={styles.lockIcon}>✦ Pro</Text>
                      }
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
        onClose={() => { setModalVisible(false); setModalContent(''); setModalLoading(false); }}
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
  tabsScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tabsContainer: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center', paddingVertical: 8 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  tabText: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.muted, letterSpacing: 0.5 },
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
  lagnaCard: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.lg, padding: 16 },
  lagnaLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 4 },
  lagnaValue: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 6 },
  lagnaNote: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18 },

  // Dashas
  dashaCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  dashaCardActive: { borderColor: Colors.gold, backgroundColor: 'rgba(201,168,76,0.06)' },
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
  amber: Colors.amber,

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
