import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getCompatibilityReading } from '@services/claude';
import { geocodePlace, generateChart } from '@services/prokerala';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import type { BirthData, ChartData } from '@store/userStore';

export default function CompatibilityScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);

  const [partnerName, setPartnerName] = useState('');
  const [partnerDate, setPartnerDate] = useState<Date>(new Date(1990, 0, 1));
  const [partnerTime, setPartnerTime] = useState<Date>(new Date(1990, 0, 1, 12, 0));
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [partnerPlace, setPartnerPlace] = useState('');
  const [reading, setReading] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

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
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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

    setLoading(true);
    setSaved(false);
    setScore(null);

    const place = partnerPlace.trim() || 'Delhi';
    let geo = { latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' };
    try {
      geo = await geocodePlace(place);
    } catch { /* use default */ }

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
    let partnerChart: ChartData | null = null;
    try {
      partnerChart = await generateChart(partnerData);
    } catch { /* proceed without chart */ }

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
    } catch {
      Alert.alert('Error', 'Unable to complete the analysis. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!reading) return;
    saveReading({
      type: 'compatibility',
      title: `You & ${partnerName}`,
      preview: reading.slice(0, 120) + '…',
      content: reading,
    });
    setSaved(true);
    Alert.alert('Saved ✦', 'This reading has been saved to your profile.');
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
              onPress={() => setShowTimePicker(!showTimePicker)}
            >
              <Text style={[styles.datePickerText, !timeConfirmed && { color: Colors.muted }]}>
                {timeConfirmed ? formatTimeDisplay(partnerTime) : 'Tap to select time'}
              </Text>
              <Text style={styles.datePickerIcon}>🕐</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={partnerTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, time) => {
                    if (time) {
                      setPartnerTime(time);
                      setTimeConfirmed(true);
                    }
                  }}
                  textColor={Colors.star}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setTimeConfirmed(true);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.confirmBtnText}>Confirm Time ✦</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Place field */}
            <Text style={styles.fieldLabel}>Place of Birth (optional)</Text>
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
              <View style={styles.readingHeader}>
                <Text style={styles.readingLabel}>YOUR COMPATIBILITY READING</Text>
                <TouchableOpacity
                  style={[styles.saveBtn, saved && styles.saveBtnSaved]}
                  onPress={handleSave}
                  disabled={saved}
                >
                  <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : '↓ Save'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.readingText}>{reading}</Text>

              {/* New reading */}
              <TouchableOpacity
                style={styles.newReadingBtn}
                onPress={() => {
                  setReading('');
                  setScore(null);
                  setPartnerName('');
                  setPartnerDate(new Date(1990, 0, 1));
                  setPartnerTime(new Date(1990, 0, 1, 12, 0));
                  setDateConfirmed(false);
                  setTimeConfirmed(false);
                  setPartnerPlace('');
                  setSaved(false);
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

  // Reading
  readingSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel },
  saveBtn: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnSaved: { backgroundColor: Colors.emerald + '22', borderColor: Colors.emerald },
  saveBtnText: { fontSize: 11, fontFamily: Fonts.cinzel, color: Colors.gold },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26, marginBottom: Spacing.md },
  newReadingBtn: { alignItems: 'center', paddingVertical: 8 },
  newReadingText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
});
