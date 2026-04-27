import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getChineseReading } from '@services/claude';
import { getChineseZodiac } from '@utils/vedic';
import { CHINESE_ZODIAC } from '@constants/astrology';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

const ANIMAL_EMOJIS: Record<string, string> = {
  Rat: '🐭', Ox: '🐂', Tiger: '🐯', Rabbit: '🐰', Dragon: '🐲',
  Snake: '🐍', Horse: '🐴', Goat: '🐐', Monkey: '🐒', Rooster: '🐓', Dog: '🐕', Pig: '🐷',
};

const ELEMENT_COLORS: Record<string, string> = {
  Metal: '#CBD5E1', Water: '#60A5FA', Wood: '#4ADE80',
  Fire: '#F87171', Earth: '#D97706',
};

export default function ChineseScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lockedState}>
          <Text style={styles.lockedIcon}>☯</Text>
          <Text style={styles.lockedTitle}>Chinese Astrology</Text>
          <Text style={styles.lockedText}>Unlock your Chinese astrology Year Pillar, animal sign analysis, elemental balance, and yearly luck cycles.</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/paywall')}>
            <Text style={styles.unlockBtnText}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const birthYear = user.birthData ? new Date(user.birthData.dateOfBirth).getUTCFullYear() : 1989;
  const { animal, element } = getChineseZodiac(birthYear);
  const zodiacData = CHINESE_ZODIAC.find(z => z.name === animal);
  const elementColor = ELEMENT_COLORS[element.split(' ')[1] ?? 'Metal'] ?? Colors.gold;

  // Year pillar is reliable from birth year. Month/Day/Hour pillars need a full ephemeris
  // and exact birth time, which we don't compute in-app — the AI reading interprets the year pillar
  // and the animal/element signature, which is what free-tier BaZi typically covers.
  const baziPillars = `Year pillar: ${element} ${animal}`;

  const fetchReading = async () => {
    if (!user.birthData) return;
    setLoading(true);
    try {
      const result = await getChineseReading(user.birthData, animal, element, baziPillars);
      setReading(result);
      saveReading({
        type: 'chinese',
        title: `${element} ${animal}`,
        preview: result.slice(0, 120),
        content: result,
      });
    } catch (e: any) {
      setReading(`Unable to fetch reading: ${e?.message ?? 'Please check your connection and try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentAnimal = getChineseZodiac(currentYear).animal;
  const currentElement = getChineseZodiac(currentYear).element;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chinese Astrology</Text>
          <Text style={styles.subtitle}>四柱命理 · Chinese Astrology</Text>
        </View>

        {/* Animal Sign Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.animalEmoji}>{ANIMAL_EMOJIS[animal] ?? '🐉'}</Text>
          <Text style={styles.animalName}>{element} {animal}</Text>
          <Text style={styles.birthYear}>Born {birthYear}</Text>
          <View style={[styles.elementBadge, { borderColor: elementColor }]}>
            <Text style={[styles.elementBadgeText, { color: elementColor }]}>
              {element.split(' ')[1]} Element
            </Text>
          </View>
        </View>

        {/* Traits */}
        {zodiacData && (
          <View style={styles.traitsSection}>
            <Text style={styles.sectionTitle}>CORE TRAITS</Text>
            <View style={styles.traitsGrid}>
              {zodiacData.traits.map(trait => (
                <View key={trait} style={styles.traitChip}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Current Year */}
        <View style={styles.currentYearCard}>
          <Text style={styles.sectionTitle}>CURRENT YEAR {currentYear}</Text>
          <Text style={styles.currentYearAnimal}>{ANIMAL_EMOJIS[currentAnimal] ?? '☯'} {currentElement} {currentAnimal} Year</Text>
          <Text style={styles.currentYearText}>
            The {currentAnimal} year brings specific energies that interact with your {animal} nature. Your AI reading below will explain how this year's energy affects you personally.
          </Text>
        </View>

        {/* Year Pillar */}
        <View style={styles.baziSection}>
          <Text style={styles.sectionTitle}>YEAR PILLAR · 年柱</Text>
          <View style={styles.pillarsRow}>
            <View style={styles.pillarCard}>
              <Text style={styles.pillarLabel}>Heavenly Stem</Text>
              <Text style={styles.pillarValue}>{element.split(' ')[0] ?? ''}</Text>
              <Text style={styles.pillarAnimal}>{(element.split(' ')[1] ?? '').toLowerCase()}</Text>
            </View>
            <View style={styles.pillarCard}>
              <Text style={styles.pillarLabel}>Earthly Branch</Text>
              <Text style={styles.pillarValue}>{ANIMAL_EMOJIS[animal] ?? '☯'}</Text>
              <Text style={styles.pillarAnimal}>{animal}</Text>
            </View>
          </View>
          <Text style={styles.baziNote}>Your Year Pillar anchors your Chinese astrology chart. The AI reading interprets how its energy shapes you.</Text>
        </View>

        {/* AI Reading button */}
        {reading === '' && !loading && (
          <TouchableOpacity style={styles.readingBtn} onPress={fetchReading}>
            <Text style={styles.readingBtnText}>✦ Get My Full Chinese Reading ✦</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={styles.loadingText}>Consulting the Chinese cosmic calendar…</Text>
          </View>
        )}

        {reading !== '' && (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>✦ YOUR CHINESE ASTROLOGY READING ✦{'\n'}AI-Generated Analysis</Text>
            <Text style={styles.readingText}>{reading}</Text>
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
  heroCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  animalEmoji: { fontSize: 64 },
  animalName: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  birthYear: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorant },
  elementBadge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  elementBadgeText: { fontSize: 12, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  traitsSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10 },
  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitChip: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  traitText: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson },
  currentYearCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  currentYearAnimal: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 8 },
  currentYearText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20 },
  baziSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  pillarsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pillarCard: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 4 },
  pillarLabel: { fontSize: 9, letterSpacing: 1, color: Colors.muted, fontFamily: Fonts.cinzel },
  pillarValue: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold },
  pillarAnimal: { fontSize: 16, color: Colors.star, fontFamily: Fonts.cinzel },
  baziNote: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center' },
  readingBtn: { marginHorizontal: Spacing.md, backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginBottom: Spacing.md },
  readingBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  loadingState: { padding: Spacing.xl, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center', marginBottom: Spacing.md },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
  lockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  lockedIcon: { fontSize: 56 },
  lockedTitle: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  lockedText: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  unlockBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  unlockBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
});
