import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

const FEATURES = [
  {
    id: 'palm',
    icon: '🖐',
    title: 'Palm Reading',
    subtitle: 'Hasta Samudrika Shastra',
    desc: 'AI-powered Vedic palmistry analysis from a photo of your hand',
    route: '/features/palm',
    premium: true,
    color: '#C9A84C',
  },
  {
    id: 'numerology',
    icon: '∑',
    title: 'Numerology',
    subtitle: 'Ankjyotish · Chaldean',
    desc: 'Life path, destiny, soul urge, and personality numbers decoded',
    route: '/features/numerology',
    premium: true,
    color: '#8B5CF6',
  },
  {
    id: 'chinese',
    icon: '☯',
    title: 'Chinese Astrology',
    subtitle: '四柱命理 · Chinese Astrology',
    desc: 'Animal zodiac, Year Pillar, elemental balance, yearly luck',
    route: '/features/chinese',
    premium: true,
    color: '#EF4444',
  },
  {
    id: 'lalkitab',
    icon: '📖',
    title: 'Lal Kitab',
    subtitle: 'लाल किताब · Remedies',
    desc: 'Powerful upay (remedies) to harmonize your planetary energies',
    route: '/features/lalkitab',
    premium: true,
    color: '#F59E0B',
  },
  {
    id: 'compatibility',
    icon: '♡',
    title: 'Compatibility',
    subtitle: 'Ashtakoot · BaZi · Synastry',
    desc: 'Vedic compatibility analysis blended with Chinese BaZi for relationships',
    route: '/features/compatibility',
    premium: true,
    color: '#EC4899',
  },
  {
    id: 'tarot',
    icon: '✦',
    title: 'Tarot',
    subtitle: 'Rider-Waite · Single & Three-Card',
    desc: 'Draw tarot cards interpreted in the light of your Vedic chart',
    route: '/features/tarot',
    premium: true,
    color: '#C4B5FD',
  },
];

interface LearnItem {
  icon: string;
  title: string;
  desc: string;
  content: string;
}

const LEARNING: LearnItem[] = [
  {
    icon: '🪐',
    title: 'The 9 Grahas',
    desc: 'Understand each planet\'s nature, significations, and influence',
    content: `In Vedic astrology, nine celestial bodies — called Grahas — shape every dimension of life. Each rules specific themes, days, gemstones, and body parts.

☉  SUN (SURYA)
Soul, identity, authority, father, career, and vitality. Rules Leo. Exalted in Aries. The Sun shows who you are at your core and how you assert yourself in the world.

☽  MOON (CHANDRA)
Mind, emotions, mother, home, habits, and cycles. Rules Cancer. Exalted in Taurus. The Moon governs your inner emotional life and instinctive responses.

♂  MARS (MANGAL)
Energy, courage, ambition, siblings, property, and physical vitality. Rules Aries and Scorpio. Exalted in Capricorn. Mars gives you the drive to pursue what you want.

☿  MERCURY (BUDHA)
Intellect, communication, trade, wit, and adaptability. Rules Gemini and Virgo. Exalted in Virgo. Mercury shapes how you think, speak, write, and learn.

♃  JUPITER (GURU)
Wisdom, grace, expansion, children, teachers, and higher law. Rules Sagittarius and Pisces. Exalted in Cancer. Jupiter is the great benefic — it brings blessings and growth wherever it touches.

♀  VENUS (SHUKRA)
Love, beauty, creativity, pleasure, luxury, and relationships. Rules Taurus and Libra. Exalted in Pisces. Venus shows where you find joy, connection, and aesthetic pleasure.

♄  SATURN (SHANI)
Discipline, karma, patience, service, longevity, and hard lessons. Rules Capricorn and Aquarius. Exalted in Libra. Saturn is the greatest teacher — what you build under Saturn lasts.

☊  RAHU (NORTH NODE)
Ambition, desire, foreign elements, technology, illusion, and obsession. Rahu shows where you are driven to evolve — your edge of growth in this life.

☋  KETU (SOUTH NODE)
Spirituality, detachment, past-life wisdom, psychic depth, and liberation. Ketu shows what you have already mastered and are now ready to transcend.`,
  },
  {
    icon: '✦',
    title: '27 Nakshatras',
    desc: 'The lunar mansions — the deepest layer of Vedic astrology',
    content: `The Moon moves through 27 Nakshatras (lunar mansions) in its 27-day cycle. Each spans 13°20' of the zodiac and carries a distinct energy, planetary lord, and life theme. Your Moon Nakshatra at birth is among the most significant factors in your chart.

1.  Ashwini (Ketu) — Healing, speed, fresh starts. The cosmic physician.
2.  Bharani (Venus) — Bearing life's burdens, fertility, transformation. Gate of creation and death.
3.  Krittika (Sun) — Sharp clarity, purification, cutting away what is false.
4.  Rohini (Moon) — Beauty, fertility, growth, sensual creativity. Favourite of the Moon.
5.  Mrigashira (Mars) — Seeking, sensitivity, the eternal search for something better.
6.  Ardra (Rahu) — Storm before renewal. Tears that cleanse. Radical transformation.
7.  Punarvasu (Jupiter) — Return home, renewal, the light after the storm.
8.  Pushya (Saturn) — Nourishment, devotion, discipline in service. The most auspicious Nakshatra.
9.  Ashlesha (Mercury) — Serpent wisdom, coiling intelligence, hidden depths.
10. Magha (Ketu) — Ancestral throne, royalty, connection to lineage and legacy.
11. Purva Phalguni (Venus) — Rest, pleasure, creative expression, the hammock between peaks.
12. Uttara Phalguni (Sun) — Commitment, friendship, service grounded in warmth.
13. Hasta (Moon) — Skilled hands, craftsmanship, the power to bring things into form.
14. Chitra (Mars) — Brilliant architecture, dazzling beauty, the jewel of creation.
15. Swati (Rahu) — Independence, the wind that bends but never breaks.
16. Vishakha (Jupiter) — Fierce purpose, the arrow aimed at transformation.
17. Anuradha (Saturn) — Loyal friendship, determination, devotion across time.
18. Jyeshtha (Mercury) — The eldest, protective courage, hidden strength.
19. Mula (Ketu) — Roots, unravelling to the source, the courage to face the void.
20. Purva Ashadha (Venus) — Victory, purification through idealism and vision.
21. Uttara Ashadha (Sun) — Universal victory that endures, leadership without ego.
22. Shravana (Moon) — Listening, learning, sacred connection across distance.
23. Dhanishta (Mars) — Wealth, music, the rhythm that brings abundance.
24. Shatabhisha (Rahu) — A hundred medicines. Healing, mystery, the lone seeker.
25. Purva Bhadrapada (Jupiter) — Fierce transformation through fire. The two-faced sky.
26. Uttara Bhadrapada (Saturn) — Deep wisdom, steady rain, the elder who has seen it all.
27. Revati (Mercury) — Completion, nourishment, the safe harbour at the end of the journey.`,
  },
  {
    icon: '⬡',
    title: 'The 12 Houses',
    desc: 'What each of the 12 houses governs in your life',
    content: `In Whole Sign Houses — the system used by Naksha — the sign rising on the eastern horizon at your birth becomes the entire first house. Each subsequent sign forms one house. Every house governs a specific domain of your lived experience.

HOUSE 1 — LAGNA (Ascendant)
Body, physical appearance, personality, overall life direction, and the lens through which you experience everything. The most important house in the chart.

HOUSE 2 — Wealth & Speech
Financial resources, family of origin, food, accumulated possessions, values, and the quality of your voice and communication.

HOUSE 3 — Siblings & Courage
Younger siblings, short journeys, hands and arms, writing, everyday communication, and the courage needed for action.

HOUSE 4 — Home & Mother
Home, mother, emotional roots, land and property, vehicles, inner peace, and your sense of belonging.

HOUSE 5 — Intelligence & Children
Children, creative expression, romance, past-life merit (purva punya), intelligence, and the joy of play.

HOUSE 6 — Service & Health
Daily work, service, enemies, debts, disease, digestive system, and the discipline required to overcome obstacles.

HOUSE 7 — Partnership
Marriage, long-term partnerships, business relationships, public dealings, and how you relate to the "other."

HOUSE 8 — Transformation
Death, inheritance, hidden matters, longevity, occult knowledge, and profound personal transformation.

HOUSE 9 — Dharma & Fortune
Father, higher education, philosophy, religion, long journeys, luck, and the alignment with your life's higher purpose.

HOUSE 10 — Career & Status
Public life, career, government, authority, achievements, and how the world recognises you.

HOUSE 11 — Gains & Goals
Income from career, elder siblings, social networks, goals and aspirations, and the fulfilment of desires.

HOUSE 12 — Liberation & Loss
Foreign lands, hidden enemies, spiritual retreat, expenses, sleep, and ultimately — moksha (liberation from the cycle of birth and death).`,
  },
  {
    icon: '◉',
    title: 'Yoga Library',
    desc: 'Major planetary combinations and what they create',
    content: `A Yoga is a powerful planetary combination that amplifies results in a specific area of life — like a special chord in music. Some of the most significant:

GAJAKESARI YOGA
Forms when Moon and Jupiter are in angular houses from each other (1st, 4th, 7th, or 10th). Brings intelligence, good reputation, and the ability to positively impact many lives. One of the most auspicious combinations in Vedic astrology.

BUDHADITYA YOGA
Forms when Sun and Mercury occupy the same sign. Sharpens intellect, communication, and analytical ability. Those with this yoga are often gifted writers, speakers, and thinkers.

RAJ YOGA
Forms when lords of trikona houses (1st, 5th, 9th) and kendra houses (1st, 4th, 7th, 10th) conjoin or exchange signs. Creates authority, recognition, and worldly success.

DHARMA-KARMA YOGA
Forms when the 9th lord (dharma, higher purpose) and 10th lord (career, public life) connect meaningfully. Career and life purpose become aligned — work carries genuine spiritual significance.

NEECHA BHANGA RAJ YOGA
A debilitated planet has its fall cancelled by specific conditions (its dispositor is strong, or an exalted planet occupies the same house). Weakness, when overcome, becomes extraordinary strength.

PANCHA MAHAPURUSHA YOGAS
Five yogas formed when Mars, Mercury, Jupiter, Venus, or Saturn is in its own or exalted sign in a kendra (1, 4, 7, or 10). Each creates a "great person" in that planet's domain:
- Ruchaka (Mars) — Warrior, athlete, leader
- Bhadra (Mercury) — Scholar, communicator, merchant
- Hamsa (Jupiter) — Teacher, philosopher, spiritual guide
- Malavya (Venus) — Artist, lover, person of refined taste
- Shasha (Saturn) — Servant-leader, disciplinarian, builder of lasting structures

VIPARITA RAJ YOGA
Lords of the 6th, 8th, and 12th houses (the dusthana houses) mutually exchange or conjoin. Paradoxically creates success through crisis — the native rises through the very things that seem to destroy them.`,
  },
  {
    icon: '🧿',
    title: 'Dasha System',
    desc: 'How planetary periods shape the chapters of your life',
    content: `The Vimshottari Dasha system divides a human life into a 120-year cycle of planetary periods. The system begins from the Moon's nakshatra at the moment of birth — that nakshatra's ruling planet determines which Mahadasha you were born into, and how many years of it remain.

THE 9 MAHADASHA PERIODS

☋  Ketu       — 7 years  — Spirituality, release, past-life completion
♀  Venus      — 20 years — Love, relationships, creativity, material enjoyment
☉  Sun        — 6 years  — Identity, authority, career, father themes
☽  Moon       — 10 years — Emotions, mind, home, mother, inner life
♂  Mars       — 7 years  — Action, courage, property, siblings, vitality
☊  Rahu       — 18 years — Ambition, worldly expansion, disruption, foreign things
♃  Jupiter    — 16 years — Grace, wisdom, growth, teachers, good fortune
♄  Saturn     — 19 years — Discipline, karma, hard work, building for the long term
☿  Mercury    — 17 years — Intellect, communication, business, learning, adaptability

HOW IT WORKS
Each Mahadasha is sub-divided into nine Antardashas (sub-periods), one for each planet. The Antardasha planet's energy colours the Mahadasha — a Jupiter Mahadasha with a Saturn Antardasha will have a different flavour than the same Jupiter period during a Venus Antardasha.

Antardashas divide further into Pratyantarashas (sub-sub-periods), allowing very fine-grained timing of events.

THE KEY INSIGHT
The dasha system does not predict fixed events — it reveals the energetic themes available in a given period. What you do with those energies is always a matter of your own choices and dharmic effort.`,
  },
  {
    icon: '☽',
    title: 'Lunar Calendar',
    desc: 'Tithis, Nakshatras, and auspicious timings',
    content: `The Vedic lunar calendar (Panchanga) is the foundation of auspicious timing in Indian tradition. Every day is described by five qualities: Tithi, Vara, Nakshatra, Yoga, and Karana.

TITHI — LUNAR DAY
A Tithi is defined by every 12° of angular difference between Sun and Moon. There are 30 Tithis in a lunar month.

Shukla Paksha (Waxing Moon, 1st–15th) — energy builds; ideal for starting new things, planting seeds, making commitments.
Krishna Paksha (Waning Moon, 16th–30th) — energy recedes; ideal for releasing, completing, letting go, spiritual practice.

Auspicious Tithis: 2nd, 3rd, 5th, 7th, 10th, 11th (Ekadashi — sacred to Vishnu), 13th, 15th (Purnima, full moon).
Sensitive Tithis: 4th (Chaturthi), 8th (Ashtami), 9th (Navami), 14th (Chaturdashi), 30th (Amavasya, new moon).

VARA — WEEKDAY
Each day is ruled by a planet, which colours the energy available:
Sun (Sunday) — authority, self, solar work
Moon (Monday) — emotions, water, home
Mars (Tuesday) — action, surgery, beginnings
Mercury (Wednesday) — communication, trade, travel
Jupiter (Thursday) — learning, spiritual practice, honouring teachers
Venus (Friday) — relationships, creativity, pleasure
Saturn (Saturday) — discipline, service, completion

MUHURTA — AUSPICIOUS TIMING
Muhurta is the Vedic science of choosing the right moment for important actions — starting a business, getting married, signing contracts, beginning travel. A good Muhurta combines a favourable Tithi, Vara, and Nakshatra to align your actions with cosmic flow.

The simplest principle: begin important things during the waxing Moon (Shukla Paksha), on an auspicious Tithi, and avoid Rahu Kala (approximately 1.5 hours each day when Rahu's shadow falls).`,
  },
];

export default function ExploreScreen() {
  const user = useAppStore(s => s.user);
  const [selectedLearn, setSelectedLearn] = useState<LearnItem | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>All systems · All insights</Text>
        </View>

        {/* Premium banner */}
        {!user.isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/paywall')}>
            <Text style={styles.premiumBannerIcon}>✦</Text>
            <View style={styles.premiumBannerText}>
              <Text style={styles.premiumBannerTitle}>Unlock Premium</Text>
              <Text style={styles.premiumBannerSub}>Palm reading, Lal Kitab, Chinese astrology & more</Text>
            </View>
            <Text style={styles.premiumBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Features grid */}
        <Text style={styles.sectionTitle}>FEATURES</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map(feature => {
            const locked = feature.premium && !user.isPremium;
            return (
              <TouchableOpacity
                key={feature.id}
                style={[styles.featureCard, { borderColor: feature.color + '30' }]}
                onPress={() => router.push((locked ? '/paywall' : feature.route) as any)}
              >
                <View style={styles.featureCardTop}>
                  <View style={[styles.featureIconWrap, { backgroundColor: feature.color + '15' }]}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                  </View>
                  {locked && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Learn section */}
        <Text style={styles.sectionTitle}>LEARN ASTROLOGY</Text>
        <Text style={styles.learnIntro}>
          Tap any topic to explore the foundational knowledge behind your chart.
        </Text>
        <View style={styles.learnList}>
          {LEARNING.map(item => (
            <TouchableOpacity
              key={item.title}
              style={styles.learnCard}
              onPress={() => setSelectedLearn(item)}
              activeOpacity={0.75}
            >
              <Text style={styles.learnIcon}>{item.icon}</Text>
              <View style={styles.learnText}>
                <Text style={styles.learnTitle}>{item.title}</Text>
                <Text style={styles.learnDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.learnArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Learn Astrology Modal */}
      <Modal
        visible={selectedLearn !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLearn(null)}
      >
        <SafeAreaView style={modalStyles.container}>
          <View style={modalStyles.header}>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={() => setSelectedLearn(null)}>
              <Text style={modalStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={modalStyles.headerCenter}>
              <Text style={modalStyles.headerIcon}>{selectedLearn?.icon}</Text>
              <Text style={modalStyles.headerTitle}>{selectedLearn?.title}</Text>
              <Text style={modalStyles.headerDesc}>{selectedLearn?.desc}</Text>
            </View>
          </View>
          <ScrollView
            style={modalStyles.scroll}
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={modalStyles.content}>{selectedLearn?.content ?? ''}</Text>
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  title: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 4 },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.lg, padding: Spacing.md },
  premiumBannerIcon: { fontSize: 20, color: Colors.gold },
  premiumBannerText: { flex: 1 },
  premiumBannerTitle: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.gold },
  premiumBannerSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  premiumBannerArrow: { fontSize: 16, color: Colors.gold },
  sectionTitle: { fontSize: 10, letterSpacing: 2.5, color: Colors.muted, fontFamily: Fonts.cinzel, paddingHorizontal: Spacing.md, marginBottom: 12 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.xl },
  featureCard: { width: '47%', backgroundColor: Colors.card, borderWidth: 1, borderRadius: Radius.xl, padding: 14, gap: 6 },
  featureCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  featureIconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  featureIcon: { fontSize: 22 },
  lockBadge: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold + '60', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  lockBadgeText: { fontSize: 8, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1 },
  featureTitle: { fontSize: 14, fontFamily: Fonts.cinzel },
  featureSubtitle: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  featureDesc: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18, marginTop: 2 },
  learnIntro: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, paddingHorizontal: Spacing.md, marginBottom: 12, marginTop: -4 },
  learnList: { paddingHorizontal: Spacing.md, gap: 8 },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14 },
  learnIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  learnText: { flex: 1 },
  learnTitle: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  learnDesc: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  learnArrow: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  closeBtn: { alignSelf: 'flex-end', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: Colors.muted },
  headerCenter: { alignItems: 'center', paddingBottom: 4 },
  headerIcon: { fontSize: 36, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center' },
  headerDesc: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  content: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
});
