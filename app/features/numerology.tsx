import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getNumerologyReading } from '@services/claude';
import { calculateLifePathNumber, calculateDestinyNumber, calculateSoulUrge, calculatePersonalityNumber } from '@utils/vedic';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { KIND_LENS, profileForNumber, type NumberKind } from '@lib/numerologyDetails';
import { AskGuruButton } from '@components/AskGuruButton';

// Defensive markdown strip — Haiku occasionally emits headers / bold even
// when the system prompt asks for plain prose, and this screen renders raw.
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

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
  const [selectedNumber, setSelectedNumber] = useState<{ kind: NumberKind; value: number } | null>(null);

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <Text style={{ fontSize: 48 }}>∑</Text>
          <Text style={{ fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center' }}>Numerology</Text>
          <Text style={{ fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22 }}>
            Discover your life path, destiny, and soul urge numbers through Vedic and Pythagorean numerology — personalized to your name and birth date.
          </Text>
          <TouchableOpacity style={{ backgroundColor: Colors.gold, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 }} onPress={() => router.push('/paywall')}>
            <Text style={{ fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight }}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const calculate = async () => {
    if (!name.trim() || !user.birthData) return;
    setLoading(true);

    const lifePathNumber = calculateLifePathNumber(user.birthData.dateOfBirth);
    const destinyNumber = calculateDestinyNumber(name);
    const soulUrgeNumber = calculateSoulUrge(name);
    const rawBirthday = new Date(user.birthData.dateOfBirth).getUTCDate();
    let birthdayNumber = rawBirthday;
    while (birthdayNumber > 9 && birthdayNumber !== 11 && birthdayNumber !== 22) {
      birthdayNumber = birthdayNumber.toString().split('').map(Number).reduce((a, b) => a + b, 0);
    }
    const personalityNumber = calculatePersonalityNumber(name);

    const nums = { lifePathNumber, destinyNumber, soulUrgeNumber, personalityNumber, birthdayNumber };
    setNumbers(nums);

    try {
      const raw = await getNumerologyReading(user.birthData, name, nums);
      const result = stripMarkdown(raw);
      setReading(result);
      saveReading({
        type: 'numerology',
        title: `Numerology — ${name}`,
        preview: result.slice(0, 120) + '…',
        content: result,
      });
    } catch (e: any) {
      setReading(`Unable to fetch reading: ${e?.message ?? 'Your numbers are calculated above.'}`);
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
            Date of birth: {user.birthData?.dateOfBirth ? new Date(user.birthData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Not set'}
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
            <Text style={styles.tapHint}>Tap any number for plain-English context →</Text>
            <View style={styles.numbersGrid}>
              <NumberCard label="Life Path" number={numbers.lifePathNumber} isPrimary onPress={() => setSelectedNumber({ kind: 'lifePath', value: numbers.lifePathNumber })} />
              <NumberCard label="Destiny" number={numbers.destinyNumber} onPress={() => setSelectedNumber({ kind: 'destiny', value: numbers.destinyNumber })} />
              <NumberCard label="Soul Urge" number={numbers.soulUrgeNumber} onPress={() => setSelectedNumber({ kind: 'soulUrge', value: numbers.soulUrgeNumber })} />
              <NumberCard label="Personality" number={numbers.personalityNumber} onPress={() => setSelectedNumber({ kind: 'personality', value: numbers.personalityNumber })} />
              <NumberCard label="Birthday" number={numbers.birthdayNumber} onPress={() => setSelectedNumber({ kind: 'birthday', value: numbers.birthdayNumber })} />
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
            <Text style={styles.readingLabel}>✦ NUMEROLOGY READING ✦{'\n'}AI-Generated Analysis</Text>
            <Text style={styles.readingText}>{reading}</Text>
            <AskGuruButton
              seed={`I just read my numerology profile (Life Path ${numbers?.lifePathNumber}, Destiny ${numbers?.destinyNumber}, Soul Urge ${numbers?.soulUrgeNumber}). Help me understand `}
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Per-number detail modal — opens when any NumberCard is tapped.
          Combines the number's universal profile (1-9, 11/22/33) with
          the slot-specific lens (lifePath / destiny / etc.) so the same
          5 reads differently as a Life Path vs a Soul Urge. */}
      <Modal
        visible={selectedNumber !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedNumber(null)}
      >
        {selectedNumber && (() => {
          const lens = KIND_LENS[selectedNumber.kind];
          const profile = profileForNumber(selectedNumber.value);
          return (
            <SafeAreaView style={styles.detailModalContainer}>
              <View style={styles.detailModalHeader}>
                <Text style={styles.detailModalLabel}>{lens.label} · {selectedNumber.value}</Text>
                <TouchableOpacity onPress={() => setSelectedNumber(null)} style={styles.detailModalClose}>
                  <Text style={styles.detailModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
                <Text style={styles.detailModalTitle}>{profile.title}</Text>
                <Text style={styles.detailModalTraits}>{profile.traits}</Text>

                <Text style={styles.detailModalSectionTitle}>WHAT THIS SLOT TRACKS</Text>
                <Text style={styles.detailModalParagraph}>{lens.oneLiner}</Text>

                <Text style={styles.detailModalSectionTitle}>ABOUT NUMBER {selectedNumber.value}</Text>
                <Text style={styles.detailModalParagraph}>{profile.description}</Text>
                <Text style={styles.detailModalParagraph}>
                  {lens.framingOpen} this is the energy that runs through {selectedNumber.kind === 'lifePath' ? 'your soul\'s journey' : selectedNumber.kind === 'destiny' ? 'what you\'re here to build' : selectedNumber.kind === 'soulUrge' ? 'what you most deeply want' : selectedNumber.kind === 'personality' ? 'how others first read you' : 'a natural gift from your birthday'}.
                </Text>

                {profile.strengths.length > 0 && (
                  <>
                    <Text style={styles.detailModalSectionTitle}>STRENGTHS</Text>
                    {profile.strengths.map((s, i) => (
                      <View key={`s-${i}`} style={styles.detailModalBulletRow}>
                        <Text style={[styles.detailModalBulletDot, { color: Colors.gold }]}>·</Text>
                        <Text style={styles.detailModalBulletText}>{s}</Text>
                      </View>
                    ))}
                  </>
                )}

                {profile.challenges.length > 0 && (
                  <>
                    <Text style={styles.detailModalSectionTitle}>CHALLENGES TO WATCH</Text>
                    {profile.challenges.map((c, i) => (
                      <View key={`c-${i}`} style={styles.detailModalBulletRow}>
                        <Text style={[styles.detailModalBulletDot, { color: Colors.amber }]}>·</Text>
                        <Text style={styles.detailModalBulletText}>{c}</Text>
                      </View>
                    ))}
                  </>
                )}

                {profile.leanInto && (
                  <>
                    <Text style={styles.detailModalSectionTitle}>LEAN INTO</Text>
                    <Text style={styles.detailModalLeanInto}>{profile.leanInto}</Text>
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

function NumberCard({ label, number, isPrimary, onPress }: { label: string; number: number; isPrimary?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.numberCard, isPrimary && styles.numberCardPrimary]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <Text style={[styles.numberLabel, isPrimary && styles.numberLabelPrimary]}>{label}</Text>
      <Text style={[styles.numberValue, isPrimary && styles.numberValuePrimary]}>{number}</Text>
    </TouchableOpacity>
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
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, flex: 1 },
  saveBtn: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnSaved: { backgroundColor: Colors.emerald + '22', borderColor: Colors.emerald },
  saveBtnText: { fontSize: 11, fontFamily: Fonts.cinzel, color: Colors.gold },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
  tapHint: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cormorantItalic, opacity: 0.85, marginBottom: 10 },

  // Detail modal — opened by tapping a NumberCard
  detailModalContainer: { flex: 1, backgroundColor: Colors.midnight },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  detailModalLabel: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 2 },
  detailModalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  detailModalCloseText: { fontSize: 18, color: Colors.muted },
  detailModalTitle: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center', marginTop: 4 },
  detailModalTraits: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
  detailModalSectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 10 },
  detailModalParagraph: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 24, marginBottom: 6 },
  detailModalBulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  detailModalBulletDot: { fontSize: 16, marginTop: 1 },
  detailModalBulletText: { flex: 1, fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, opacity: 0.9 },
  detailModalLeanInto: { fontSize: 15, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 24, marginBottom: 6 },
});
