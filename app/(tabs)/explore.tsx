import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
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
    premium: false,
    color: '#8B5CF6',
  },
  {
    id: 'chinese',
    icon: '☯',
    title: 'Chinese Astrology',
    subtitle: '四柱命理 · BaZi',
    desc: 'Animal zodiac, Four Pillars, elemental balance, yearly luck',
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
    subtitle: 'Ashtakoot · Synastry',
    desc: 'Vedic compatibility analysis for relationships and partnerships',
    route: '/features/compatibility',
    premium: false,
    color: '#EC4899',
  },
  {
    id: 'guru',
    icon: '🔱',
    title: 'Jyotish Guru',
    subtitle: 'AI-Powered Guidance',
    desc: 'Ask anything — your personal Vedic guide answers based on your chart',
    route: '/(tabs)/guru',
    premium: false,
    color: '#10B981',
  },
];

const LEARNING = [
  { icon: '🪐', title: 'The 9 Grahas', desc: 'Understand each planet\'s nature, significations, and influence' },
  { icon: '✦', title: '27 Nakshatras', desc: 'The lunar mansions — the deepest layer of Vedic astrology' },
  { icon: '⬡', title: 'House System', desc: 'What each of the 12 houses governs in your life' },
  { icon: '◉', title: 'Yoga Library', desc: 'Major planetary combinations and what they mean' },
  { icon: '🧿', title: 'Dasha System', desc: 'How planetary periods shape the chapters of your life' },
  { icon: '☽', title: 'Lunar Calendar', desc: 'Tithis, Nakshatras, and auspicious timings (Muhurta)' },
];

export default function ExploreScreen() {
  const user = useAppStore(s => s.user);

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
                onPress={() => router.push(feature.route as any)}
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
        <View style={styles.learnList}>
          {LEARNING.map(item => (
            <TouchableOpacity key={item.title} style={styles.learnCard}>
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
  learnList: { paddingHorizontal: Spacing.md, gap: 8 },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14 },
  learnIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  learnText: { flex: 1 },
  learnTitle: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  learnDesc: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  learnArrow: { fontSize: 16, color: Colors.muted },
});
