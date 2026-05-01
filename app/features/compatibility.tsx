import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getCompatibilityReading } from '@services/claude';
import { geocodePlace, generateChart, PlaceNotFoundError } from '@services/prokerala';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { getChineseCompatibility, ELEMENT_DATA, type ZodiacLevel } from '@utils/bazi';
import type { BirthData, ChartData } from '@store/userStore';

function chineseLevelGlyph(level: ZodiacLevel): string {
  switch (level) {
    case 'best':        return '✦';
    case 'good':        return '◇';
    case 'neutral':     return '◯';
    case 'challenging': return '⚡';
  }
}

function chineseLevelLabel(level: ZodiacLevel): string {
  switch (level) {
    case 'best':        return 'Strong Natural Match';
    case 'good':        return 'Workable Match';
    case 'neutral':     return 'Familiar Ground';
    case 'challenging': return 'Conscious Work Required';
  }
}

const PLACE_PART_RE = /^[\p{L}\s\.\-']+$/u;
type PlaceValidation = { ok: true } | { ok: false; message: string };
function validatePartnerPlace(raw: string): PlaceValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: 'Please enter your partner\'s place of birth (city and country).\n\nExamples: Delhi, India · Columbus, Ohio, USA · London, UK',
    };
  }
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts.length < 2) {
    return {
      ok: false,
      message: 'Please include both city and country, separated by a comma.\n\nExamples: Delhi, India · Columbus, Ohio, USA',
    };
  }
  for (const p of parts) {
    if (p.length < 2 || !PLACE_PART_RE.test(p)) {
      return {
        ok: false,
        message: 'Each part should be at least 2 letters and contain only letters, spaces, dots, hyphens, or apostrophes.',
      };
    }
  }
  return { ok: true };
}

export default function CompatibilityScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);

  const [partnerName, setPartnerName] = useState('');
  const [partnerDate, setPartnerDate] = useState<Date>(new Date(1990, 0, 1));
  const [partnerTime, setPartnerTime] = useState<Date>(new Date(1990, 0, 1, 12, 0));
  // partnerPickerTime holds the spinner's in-flight value; copied to partnerTime only on Confirm.
  // Prevents iOS spinner's spurious onChange-on-mount from clobbering partnerTime with device time.
  const [partnerPickerTime, setPartnerPickerTime] = useState<Date>(new Date(1990, 0, 1, 12, 0));
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [partnerPlace, setPartnerPlace] = useState('');
  const [reading, setReading] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnerChartFailed, setPartnerChartFailed] = useState(false);

  // Local Chinese / BaZi match — instantly computed once partner DOB is confirmed.
  // No API call; deterministic from year branch + day stem of both DOBs.
  const chineseMatch = useMemo(() => {
    if (!user.birthData?.dateOfBirth || !dateConfirmed) return null;
    const partnerISO = (() => {
      const y = partnerDate.getUTCFullYear();
      const m = String(partnerDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(partnerDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    try {
      return getChineseCompatibility(user.birthData.dateOfBirth, partnerISO);
    } catch {
      return null;
    }
  }, [user.birthData?.dateOfBirth, dateConfirmed, partnerDate]);

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <Text style={{ fontSize: 48 }}>♡</Text>
          <Text style={{ fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center' }}>Compatibility</Text>
          <Text style={{ fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22 }}>
            Discover your Ashtakoota compatibility score out of 36 — a deep Vedic analysis of how your charts align across love, temperament, and destiny.
          </Text>
          <TouchableOpacity style={{ backgroundColor: Colors.gold, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 }} onPress={() => router.push('/paywall')}>
            <Text style={{ fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight }}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  const formatDateISO = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatTime24 = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatTimeDisplay = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const analyze = async () => {
    if (!partnerName.trim()) {
      Alert.alert('Missing Name', 'Please enter your partner\'s name.');
      return;
    }
    if (!dateConfirmed) {
      Alert.alert('Missing Date', 'Please select your partner\'s date of birth.');
      return;
    }
    if (!user.birthData) {
      Alert.alert('Missing Your Info', 'Please complete your birth details first.');
      return;
    }

    const placeCheck = validatePartnerPlace(partnerPlace);
    if (!placeCheck.ok) {
      Alert.alert('Partner\'s Place of Birth', placeCheck.message);
      return;
    }

    setLoading(true);
    setScore(null);

    const place = partnerPlace.trim();
    let geo;
    try {
      geo = await geocodePlace(place);
    } catch (e) {
      setLoading(false);
      if (e instanceof PlaceNotFoundError) {
        Alert.alert(
          'Place Not Found',
          'We couldn\'t find that location. Please enter a more specific place with both city and country.',
        );
      } else {
        Alert.alert('Network Error', 'Could not reach the location service. Please check your connection and try again.');
      }
      return;
    }

    const partnerData: BirthData = {
      name: partnerName.trim(),
      dateOfBirth: formatDateISO(partnerDate),
      timeOfBirth: timeConfirmed ? formatTime24(partnerTime) : '12:00',
      placeOfBirth: place,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
    };

    // Generate partner's chart
    setPartnerChartFailed(false);
    let partnerChart: ChartData | null = null;
    try {
      partnerChart = await generateChart(partnerData);
    } catch {
      setPartnerChartFailed(true);
    }

    try {
      const result = await getCompatibilityReading(
        { birthData: user.birthData, chart: user.chart },
        { birthData: partnerData, chart: partnerChart }
      );
      // Extract score from response (Guru includes it as "SCORE: X/36")
      const scoreMatch = result.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*36/i);
      if (scoreMatch) {
        setScore(parseFloat(scoreMatch[1]));
      }
      setReading(result);
      saveReading({
        type: 'compatibility',
        title: `You & ${partnerName.trim()}`,
        preview: result.slice(0, 120) + '…',
        content: result,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unable to complete the analysis. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const myInitial = user.birthData?.name?.[0]?.toUpperCase() ?? 'U';
  const partnerInitial = partnerName?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Compatibility</Text>
            <Text style={styles.subtitle}>Vedic relationship reading</Text>
          </View>

          {/* Profile cards */}
          <View style={styles.profilesRow}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{myInitial}</Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {user.birthData?.name ?? 'You'}
              </Text>
              <Text style={styles.profileDetail}>
                {user.chart?.lagna ? `${user.chart.lagna} Rising` : 'Your chart'}
              </Text>
            </View>

            <View style={styles.heartCenter}>
              <Text style={styles.heartIcon}>♡</Text>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={styles.profileCard}>
              <View style={[styles.avatar, styles.avatarPartner]}>
                <Text style={styles.avatarText}>{partnerInitial}</Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {partnerName || 'Partner'}
              </Text>
              <Text style={styles.profileDetail}>
                {dateConfirmed ? formatDateDisplay(partnerDate).split(',')[0] : 'Add details below'}
              </Text>
            </View>
          </View>

          {/* Partner form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>PARTNER'S DETAILS</Text>

            {/* Name field */}
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder="Enter their full name"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />

            {/* Date of birth — native picker */}
            <Text style={styles.fieldLabel}>Date of Birth *</Text>
            <TouchableOpacity
              style={[styles.datePickerBtn, dateConfirmed && styles.datePickerBtnFilled]}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={[styles.datePickerText, !dateConfirmed && { color: Colors.muted }]}>
                {dateConfirmed ? formatDateDisplay(partnerDate) : 'Tap to select date'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={partnerDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) {
                      setPartnerDate(date);
                      setDateConfirmed(true);
                    }
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  textColor={Colors.star}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setDateConfirmed(true);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.confirmBtnText}>Confirm Date ✦</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Time of birth */}
            <Text style={styles.fieldLabel}>Time of Birth (for accurate chart)</Text>
            <TouchableOpacity
              style={[styles.datePickerBtn, timeConfirmed && styles.datePickerBtnFilled]}
              onPress={() => {
                setPartnerPickerTime(partnerTime);
                setShowTimePicker(!showTimePicker);
              }}
            >
              <Text style={[styles.datePickerText, !timeConfirmed && { color: Colors.muted }]}>
                {timeConfirmed ? formatTimeDisplay(partnerTime) : 'Tap to select time'}
              </Text>
              <Text style={styles.datePickerIcon}>🕐</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={partnerPickerTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, time) => {
                    if (time) setPartnerPickerTime(time);
                  }}
                  textColor={Colors.star}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setPartnerTime(partnerPickerTime);
                    setTimeConfirmed(true);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.confirmBtnText}>Confirm Time ✦</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Place field */}
            <Text style={styles.fieldLabel}>Place of Birth *</Text>
            <TextInput
              style={styles.input}
              value={partnerPlace}
              onChangeText={setPartnerPlace}
              placeholder="City, Country"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />

            {/* Analyze button */}
            <TouchableOpacity
              style={[
                styles.analyzeBtn,
                (!partnerName.trim() || !dateConfirmed || loading) && styles.analyzeBtnDisabled,
              ]}
              onPress={analyze}
              disabled={!partnerName.trim() || !dateConfirmed || loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.midnight} />
                : <Text style={styles.analyzeBtnText}>✦ Analyze Compatibility</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Chinese / BaZi match — appears once partner DOB is confirmed.
              Pure local compute; complements the Vedic reading below. */}
          {chineseMatch && (
            <View style={[styles.chineseCard, styles[`chinese_${chineseMatch.zodiacLevel}` as const]]}>
              <Text style={styles.chineseLabel}>CHINESE ASTROLOGY MATCH</Text>
              <View style={styles.chineseZodiacRow}>
                <View style={styles.chineseZodiacBox}>
                  <Text style={styles.chineseZodiacChar}>{chineseMatch.yourZodiacChar}</Text>
                  <Text style={styles.chineseZodiacName}>{chineseMatch.yourZodiac}</Text>
                  <Text style={[styles.chineseElementBadge, { color: ELEMENT_DATA[chineseMatch.yourDayElement]?.color ?? Colors.gold }]}>
                    {ELEMENT_DATA[chineseMatch.yourDayElement]?.symbol ?? ''} {chineseMatch.yourDayElement}
                  </Text>
                </View>
                <Text style={styles.chineseConnector}>{chineseLevelGlyph(chineseMatch.zodiacLevel)}</Text>
                <View style={styles.chineseZodiacBox}>
                  <Text style={styles.chineseZodiacChar}>{chineseMatch.partnerZodiacChar}</Text>
                  <Text style={styles.chineseZodiacName}>{chineseMatch.partnerZodiac}</Text>
                  <Text style={[styles.chineseElementBadge, { color: ELEMENT_DATA[chineseMatch.partnerDayElement]?.color ?? Colors.gold }]}>
                    {ELEMENT_DATA[chineseMatch.partnerDayElement]?.symbol ?? ''} {chineseMatch.partnerDayElement}
                  </Text>
                </View>
              </View>
              <Text style={styles.chineseLevel}>{chineseLevelLabel(chineseMatch.zodiacLevel)}</Text>
              <Text style={styles.chineseSummary}>{chineseMatch.summary}</Text>
              <Text style={styles.chineseInterplay}>{chineseMatch.elementInterplayDescription}</Text>
            </View>
          )}

          {/* Score display */}
          {reading !== '' && score === null && (
            <View style={styles.scoreSection}>
              <Text style={styles.scoreDesc}>Ashtakoota score not available — see reading below for compatibility insights.</Text>
            </View>
          )}
          {score !== null && (
            <View style={styles.scoreSection}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{score}</Text>
                <Text style={styles.scoreTotal}>/36</Text>
              </View>
              <Text style={styles.scoreLabel}>ASHTAKOOTA SCORE</Text>
              <Text style={styles.scoreDesc}>
                {score >= 28 ? 'Excellent match — deep natural harmony'
                  : score >= 21 ? 'Very good match — strong compatibility'
                  : score >= 15 ? 'Good match — some areas need attention'
                  : 'Challenging match — requires understanding and effort'}
              </Text>
            </View>
          )}

          {/* Reading result */}
          {reading !== '' && (
            <View style={styles.readingSection}>
              <Text style={styles.readingLabel}>YOUR COMPATIBILITY READING</Text>
              {partnerChartFailed && (
                <Text style={styles.chartWarning}>
                  Note: Your partner's birth chart could not be generated. This reading uses birth data only and may have reduced precision.
                </Text>
              )}
              <Text style={styles.readingText}>{reading}</Text>

              {/* New reading */}
              <TouchableOpacity
                style={styles.newReadingBtn}
                onPress={() => {
                  setReading('');
                  setScore(null);
                  setPartnerChartFailed(false);
                  setPartnerName('');
                  setPartnerDate(new Date(1990, 0, 1));
                  setPartnerTime(new Date(1990, 0, 1, 12, 0));
                  setPartnerPickerTime(new Date(1990, 0, 1, 12, 0));
                  setDateConfirmed(false);
                  setTimeConfirmed(false);
                  setPartnerPlace('');
                }}
              >
                <Text style={styles.newReadingText}>Start a New Reading</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },

  // Profiles
  profilesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  profileCard: { flex: 1, alignItems: 'center', gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.goldDim, borderWidth: 2, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarPartner: { borderColor: Colors.violet },
  avatarText: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  profileName: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star, textAlign: 'center', maxWidth: 100 },
  profileDetail: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center' },
  heartCenter: { alignItems: 'center', paddingHorizontal: 10, gap: 2 },
  heartIcon: { fontSize: 22, color: Colors.gold },
  vsText: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 2 },

  // Form
  formSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 16 },
  fieldLabel: { fontSize: 11, letterSpacing: 1, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 16,
    marginBottom: 12,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  datePickerBtnFilled: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  datePickerText: { fontSize: 16, fontFamily: Fonts.crimson, color: Colors.star, flex: 1 },
  datePickerIcon: { fontSize: 18 },
  pickerWrap: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  confirmBtn: { backgroundColor: Colors.gold, padding: 14, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  analyzeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },

  // Score
  scoreSection: { alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.xl, padding: Spacing.lg },
  scoreCircle: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  scoreValue: { fontSize: 48, fontFamily: Fonts.cinzel, color: Colors.gold },
  scoreTotal: { fontSize: 20, fontFamily: Fonts.cinzel, color: Colors.muted, marginLeft: 2 },
  scoreLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 6 },
  scoreDesc: { fontSize: 13, color: Colors.star, fontFamily: Fonts.cormorantItalic, textAlign: 'center' },

  // Chinese match card
  chineseCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  chinese_best:        { borderColor: Colors.gold },
  chinese_good:        { borderColor: Colors.cardBorder },
  chinese_neutral:     { borderColor: Colors.mutedDark },
  chinese_challenging: { borderColor: Colors.amber },
  chineseLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 12, textAlign: 'center' },
  chineseZodiacRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chineseZodiacBox: { flex: 1, alignItems: 'center', gap: 4 },
  chineseZodiacChar: { fontSize: 36, color: Colors.gold, fontFamily: Fonts.cinzel },
  chineseZodiacName: { fontSize: 13, color: Colors.star, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  chineseElementBadge: { fontSize: 11, fontFamily: Fonts.crimson, marginTop: 2 },
  chineseConnector: { fontSize: 22, color: Colors.gold, paddingHorizontal: Spacing.md },
  chineseLevel: { fontSize: 12, letterSpacing: 1.5, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center', marginBottom: 8 },
  chineseSummary: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, textAlign: 'center', marginBottom: 6 },
  chineseInterplay: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 18, textAlign: 'center' },

  // Reading
  readingSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel },
  chartWarning: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginBottom: 10, lineHeight: 18 },
  saveBtn: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnSaved: { backgroundColor: Colors.emerald + '22', borderColor: Colors.emerald },
  saveBtnText: { fontSize: 11, fontFamily: Fonts.cinzel, color: Colors.gold },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26, marginBottom: Spacing.md },
  newReadingBtn: { alignItems: 'center', paddingVertical: 8 },
  newReadingText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
});
