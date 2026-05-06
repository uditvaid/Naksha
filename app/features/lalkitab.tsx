import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getLalKitabReading } from '@services/claude';
import { LAL_KITAB_REMEDIES } from '@constants/astrology';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

// Strip light markdown defensively. Haiku tends to emit `## headers` and
// `**bold**` in prose readings even when the system prompt asks for flowing
// prose; we render text as-is so the literal characters would otherwise show.
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

const PLANET_COLORS: Record<string, string> = {
  Sun: '#F59E0B', Moon: '#CBD5E1', Mars: '#EF4444',
  Mercury: '#10B981', Jupiter: '#F59E0B', Venus: '#EC4899',
  Saturn: '#6366F1', Rahu: '#8B5CF6', Ketu: '#A78BFA',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export default function LalKitabScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReading = async () => {
    if (!user.birthData) {
      Alert.alert('Birth Details Required', 'Please complete your birth details in onboarding before requesting a reading.', [
        { text: 'Set Up', onPress: () => router.replace('/onboarding') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const raw = await getLalKitabReading(user.birthData, user.chart, selectedPlanet ?? undefined);
      const result = stripMarkdown(raw);
      setReading(result);
      saveReading({
        type: 'lalkitab',
        title: selectedPlanet ? `Lal Kitab · ${selectedPlanet}` : 'Lal Kitab Reading',
        preview: result.slice(0, 120),
        content: result,
      });
    } catch (e: any) {
      if (__DEV__) console.error('[LalKitab] fetchReading error:', e);
      setError(e?.message ?? 'Could not fetch the reading. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lockedState}>
          <Text style={styles.lockedIcon}>📖</Text>
          <Text style={styles.lockedTitle}>Lal Kitab</Text>
          <Text style={styles.lockedText}>Unlock personalized Lal Kitab remedies (upay) — simple, powerful actions to harmonize your planetary energies.</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/paywall')}>
            <Text style={styles.unlockBtnText}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const planets = Object.keys(LAL_KITAB_REMEDIES);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Lal Kitab</Text>
          <Text style={styles.subtitle}>लाल किताब · Planetary Remedies</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Lal Kitab offers simple, powerful remedies (upay) to pacify malefic planets and strengthen benefics. These are practical actions — no rituals required.
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Lal Kitab is a recognized 19th-century Urdu astrological text within the Vedic tradition. The remedies listed here are drawn directly from that source and are cultural and spiritual in nature — not medical prescriptions. The personalized analysis is AI-generated based on your chart and this tradition; interpretation may vary between practitioners. Consult a qualified professional for health, legal, or financial decisions.
        </Text>

        {/* Planet selector */}
        <View style={styles.planetSection}>
          <Text style={styles.sectionTitle}>SELECT A PLANET FOR SPECIFIC REMEDIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planetScroll}>
            <TouchableOpacity
              style={[styles.planetChip, !selectedPlanet && styles.planetChipActive]}
              onPress={() => setSelectedPlanet(null)}
            >
              <Text style={[styles.planetChipText, !selectedPlanet && styles.planetChipTextActive]}>All</Text>
            </TouchableOpacity>
            {planets.map(planet => (
              <TouchableOpacity
                key={planet}
                style={[styles.planetChip, selectedPlanet === planet && styles.planetChipActive, { borderColor: PLANET_COLORS[planet] + '60' }]}
                onPress={() => setSelectedPlanet(planet)}
              >
                <Text style={{ color: PLANET_COLORS[planet], fontSize: 14 }}>{PLANET_SYMBOLS[planet]}</Text>
                <Text style={[styles.planetChipText, selectedPlanet === planet && styles.planetChipTextActive]}>{planet}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick remedies */}
        <View style={styles.remediesSection}>
          <Text style={styles.sectionTitle}>
            {selectedPlanet ? `${selectedPlanet.toUpperCase()} REMEDIES` : 'DAILY REMEDIES'}
          </Text>
          {(selectedPlanet ? [selectedPlanet] : ['Sun', 'Moon', 'Saturn']).map(planet => (
            <View key={planet} style={styles.planetRemediesCard}>
              <View style={styles.planetRemediesHeader}>
                <View style={[styles.planetIconWrap, { backgroundColor: PLANET_COLORS[planet] + '20' }]}>
                  <Text style={[styles.planetIcon, { color: PLANET_COLORS[planet] }]}>{PLANET_SYMBOLS[planet]}</Text>
                </View>
                <Text style={[styles.planetRemediesTitle, { color: PLANET_COLORS[planet] }]}>{planet}</Text>
              </View>
              {LAL_KITAB_REMEDIES[planet]?.slice(0, 3).map((remedy, i) => (
                <View key={i} style={styles.remedyRow}>
                  <Text style={styles.remedyDot}>◈</Text>
                  <Text style={styles.remedyText}>{remedy}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* AI reading */}
        {reading === '' && !loading && (
          <>
            <TouchableOpacity style={styles.readingBtn} onPress={fetchReading}>
              <Text style={styles.readingBtnText}>✦ Get My Personalized Lal Kitab Analysis ✦</Text>
            </TouchableOpacity>
            {error !== '' && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </>
        )}

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={styles.loadingText}>The Guru reads Lal Kitab…</Text>
          </View>
        )}

        {reading !== '' && (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>✦ YOUR LAL KITAB ANALYSIS ✦{'\n'}AI-Generated Analysis</Text>
            <Text style={styles.readingText}>{reading}</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setReading('')}>
              <Text style={styles.resetBtnText}>Get New Reading</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  intro: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  introText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 22 },
  disclaimer: { fontSize: 11, color: Colors.mutedDark, fontFamily: Fonts.cormorantItalic, lineHeight: 17, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  planetSection: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, paddingHorizontal: Spacing.md, marginBottom: 10 },
  planetScroll: { paddingHorizontal: Spacing.md },
  planetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  planetChipActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  planetChipText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel },
  planetChipTextActive: { color: Colors.gold },
  remediesSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  planetRemediesCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 10 },
  planetRemediesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  planetIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  planetIcon: { fontSize: 18 },
  planetRemediesTitle: { fontSize: 16, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  remedyRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  remedyDot: { fontSize: 12, color: Colors.gold, marginTop: 3 },
  remedyText: { flex: 1, fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20 },
  readingBtn: { marginHorizontal: Spacing.md, backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginBottom: Spacing.md },
  readingBtnText: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5, textAlign: 'center' },
  loadingState: { padding: Spacing.xl, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, flex: 1 },
  saveBtn: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnSaved: { backgroundColor: Colors.emerald + '22', borderColor: Colors.emerald },
  saveBtnText: { fontSize: 11, fontFamily: Fonts.cinzel, color: Colors.gold },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
  resetBtn: { marginTop: Spacing.md, alignItems: 'center' },
  resetBtnText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  errorText: { fontSize: 13, color: Colors.ruby, fontFamily: Fonts.crimson, textAlign: 'center', marginHorizontal: Spacing.md, marginTop: 8, lineHeight: 20 },
  lockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  lockedIcon: { fontSize: 56 },
  lockedTitle: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  lockedText: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  unlockBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  unlockBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
});
