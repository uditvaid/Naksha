import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getNumerologyReading } from '@services/claude';
import { calculateLifePathNumber, calculateDestinyNumber, calculateSoulUrge, calculatePersonalityNumber } from '@utils/vedic';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

const NUMBER_MEANINGS: Record<number, { title: string; traits: string }> = {
  1: { title: 'The Leader', traits: 'Independent, pioneering, original, ambitious' },
  2: { title: 'The Diplomat', traits: 'Cooperative, sensitive, balanced, supportive' },
  3: { title: 'The Creator', traits: 'Creative, expressive, joyful, optimistic' },
  4: { title: 'The Builder', traits: 'Disciplined, reliable, practical, grounded' },
  5: { title: 'The Free Spirit', traits: 'Adventurous, versatile, freedom-loving, curious' },
  6: { title: 'The Nurturer', traits: 'Responsible, caring, harmonious, family-oriented' },
  7: { title: 'The Seeker', traits: 'Analytical, spiritual, introspective, wise' },
  8: { title: 'The Achiever', traits: 'Powerful, ambitious, business-minded, authoritative' },
  9: { title: 'The Humanitarian', traits: 'Compassionate, idealistic, generous, visionary' },
  11: { title: 'The Illuminator', traits: 'Intuitive, inspirational, spiritually evolved' },
  22: { title: 'The Master Builder', traits: 'Visionary, practical, powerful manifestor' },
  33: { title: 'The Master Teacher', traits: 'Compassionate, healing, divine service' },
};

export default function NumerologyScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);
  const [name, setName] = useState(user.birthData?.name ?? '');
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<Record<string, number> | null>(null);
  const [saved, setSaved] = useState(false);

  const calculate = async () => {
    if (!name.trim() || !user.birthData) return;
    setLoading(true);

    const lifePathNumber = calculateLifePathNumber(user.birthData.dateOfBirth);
    const destinyNumber = calculateDestinyNumber(name);
    const soulUrgeNumber = calculateSoulUrge(name);
    const rawBirthday = new Date(user.birthData.dateOfBirth).getDate();
    let birthdayNumber = rawBirthday;
    while (birthdayNumber > 9 && birthdayNumber !== 11 && birthdayNumber !== 22) {
      birthdayNumber = birthdayNumber.toString().split('').map(Number).reduce((a, b) => a + b, 0);
    }
    const personalityNumber = calculatePersonalityNumber(name);

    const nums = { lifePathNumber, destinyNumber, soulUrgeNumber, personalityNumber, birthdayNumber };
    setNumbers(nums);

    try {
      const result = await getNumerologyReading(user.birthData, name, nums);
      setReading(result);
      setSaved(false);
      saveReading({
        type: 'numerology',
        title: `Numerology — ${name}`,
        preview: result.slice(0, 120) + '…',
        content: result,
      });
    } catch {
      setReading('Unable to fetch reading. Your numbers are calculated above.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Numerology</Text>
          <Text style={styles.subtitle}>Ankjyotish · Pythagorean · Chaldean</Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>FULL NAME AT BIRTH</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full birth name…"
            placeholderTextColor={Colors.muted}
            autoCapitalize="words"
          />
          <Text style={styles.inputHint}>
            Date of birth: {user.birthData?.dateOfBirth ? new Date(user.birthData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
          </Text>
          <TouchableOpacity
            style={[styles.calcBtn, !name.trim() && styles.calcBtnDisabled]}
            onPress={calculate}
            disabled={!name.trim() || loading}
          >
            {loading ? <ActivityIndicator color={Colors.midnight} /> : <Text style={styles.calcBtnText}>Calculate ✦</Text>}
          </TouchableOpacity>
        </View>

        {/* Numbers Grid */}
        {numbers && (
          <View style={styles.numbersSection}>
            <Text style={styles.sectionTitle}>YOUR CORE NUMBERS</Text>
            <View style={styles.numbersGrid}>
              <NumberCard label="Life Path" number={numbers.lifePathNumber} isPrimary />
              <NumberCard label="Destiny" number={numbers.destinyNumber} />
              <NumberCard label="Soul Urge" number={numbers.soulUrgeNumber} />
              <NumberCard label="Personality" number={numbers.personalityNumber} />
              <NumberCard label="Birthday" number={numbers.birthdayNumber} />
            </View>

            {/* Life Path detail */}
            {NUMBER_MEANINGS[numbers.lifePathNumber] && (
              <View style={styles.primaryNumberDetail}>
                <Text style={styles.primaryNumberLabel}>LIFE PATH {numbers.lifePathNumber}</Text>
                <Text style={styles.primaryNumberTitle}>{NUMBER_MEANINGS[numbers.lifePathNumber].title}</Text>
                <Text style={styles.primaryNumberTraits}>{NUMBER_MEANINGS[numbers.lifePathNumber].traits}</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Reading */}
        {reading !== '' && (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>✦ NUMEROLOGY READING ✦</Text>
            <Text style={styles.readingText}>{reading}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NumberCard({ label, number, isPrimary }: { label: string; number: number; isPrimary?: boolean }) {
  return (
    <View style={[styles.numberCard, isPrimary && styles.numberCardPrimary]}>
      <Text style={[styles.numberLabel, isPrimary && styles.numberLabelPrimary]}>{label}</Text>
      <Text style={[styles.numberValue, isPrimary && styles.numberValuePrimary]}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  inputSection: { padding: Spacing.md },
  inputLabel: { fontSize: 9, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 8 },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, color: Colors.star, fontFamily: Fonts.crimson, fontSize: 16, marginBottom: 8 },
  inputHint: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginBottom: 14 },
  calcBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  calcBtnDisabled: { opacity: 0.4 },
  calcBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  numbersSection: { padding: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 12 },
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  numberCard: { width: '30%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, alignItems: 'center' },
  numberCardPrimary: { width: '100%', borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  numberLabel: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  numberLabelPrimary: { color: Colors.gold },
  numberValue: { fontSize: 28, fontFamily: Fonts.cinzel, color: Colors.star },
  numberValuePrimary: { fontSize: 48, color: Colors.gold },
  primaryNumberDetail: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  primaryNumberLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 6 },
  primaryNumberTitle: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 6 },
  primaryNumberTraits: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center', marginBottom: Spacing.md },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
});
