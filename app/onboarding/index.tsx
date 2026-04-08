import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { generateChart, geocodePlace } from '@services/prokerala';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import type { BirthData } from '@store/userStore';

const { width } = Dimensions.get('window');

// Format date object → display string "June 4, 1989"
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Format date object → ISO string for API "1989-06-04"
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Format time object → "HH:MM"
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Format time → display "4:09 PM"
function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function OnboardingScreen() {
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);
  const setBirthData = useAppStore(s => s.setBirthData);
  const setChart = useAppStore(s => s.setChart);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Date picker state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateConfirmed, setDateConfirmed] = useState(false);

  // Time picker state
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(false);

  const goToStep = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ x: n * width, animated: true });
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === 1 && !name.trim()) {
      Alert.alert('Please enter your name'); return;
    }
    if (step === 2 && !dateConfirmed) {
      Alert.alert('Please select your date of birth'); return;
    }

    if (step === 4) {
      goToStep(5);
      setGenerating(true);

      try {
        const geo = await geocodePlace(place || 'New Delhi, India');
        const birthData: BirthData = {
          name: name.trim(),
          dateOfBirth: formatDateISO(selectedDate),
          timeOfBirth: selectedTime ? formatTime(selectedTime) : '12:00',
          placeOfBirth: place || 'New Delhi, India',
          latitude: geo.latitude,
          longitude: geo.longitude,
          timezone: geo.timezone,
        };

        const chart = await generateChart(birthData);
        setBirthData(birthData);
        setChart(chart);
        setOnboardingComplete();
        setGenerating(false);

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Small delay lets the navigation stack fully mount before replacing
        setTimeout(() => router.replace('/(tabs)'), 300);
      } catch (e) {
        setGenerating(false);
        goToStep(4);
        Alert.alert(
          'Chart Generation Failed',
          'Could not connect to the astrology server. Please check your internet connection and try again.',
        );
      }
      return;
    }

    goToStep(step + 1);
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 0: Welcome ── */}
        <View style={[styles.stepPage, { width }]}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeOm}>ॐ</Text>
            <Text style={styles.welcomeTitle}>Naksha</Text>
            <Text style={styles.welcomeTagline}>Your Complete Cosmic Blueprint</Text>
            <Text style={styles.welcomeDesc}>
              Vedic astrology · Chinese BaZi · Numerology · Palmistry · Lal Kitab{'\n\n'}
              Understand yourself deeply. Navigate life wisely. Discover your dharma.
            </Text>
            <View style={styles.featureList}>
              {[
                'AI Jyotish Guru available 24/7',
                'Personalized birth chart analysis',
                'Daily cosmic readings',
                'Lal Kitab remedies & upay',
              ].map(f => (
                <View key={f} style={styles.featureItem}>
                  <Text style={styles.featureDot}>✦</Text>
                  <Text style={styles.featureItemText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Step 1: Name ── */}
        <View style={[styles.stepPage, { width }]}>
          <Text style={styles.stepNumber}>1 of 4</Text>
          <Text style={styles.stepTitle}>What is your name?</Text>
          <Text style={styles.stepSubtitle}>The Guru will use this to address you personally</Text>
          <TextInput
            style={styles.bigInput}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={Colors.muted}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {/* ── Step 2: Date of Birth ── */}
        <View style={[styles.stepPage, { width }]}>
          <Text style={styles.stepNumber}>2 of 4</Text>
          <Text style={styles.stepTitle}>Date of Birth</Text>
          <Text style={styles.stepSubtitle}>Your Nakshatra and Dasha periods depend on this</Text>

          {/* Selected date display */}
          <TouchableOpacity
            style={[styles.dateDisplay, dateConfirmed && styles.dateDisplaySelected]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateDisplayLabel}>DATE OF BIRTH</Text>
            <Text style={[styles.dateDisplayValue, !dateConfirmed && { color: Colors.muted }]}>
              {dateConfirmed ? formatDateDisplay(selectedDate) : 'Tap to select'}
            </Text>
            <Text style={styles.dateDisplayIcon}>📅</Text>
          </TouchableOpacity>

          {/* iOS inline date picker */}
          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDateConfirmed(true);
                  }
                }}
                maximumDate={maxDate}
                minimumDate={new Date(1900, 0, 1)}
                textColor={Colors.star}
                themeVariant="dark"
              />
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => {
                  setDateConfirmed(true);
                  setShowDatePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.pickerDoneBtnText}>Confirm Date ✦</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showDatePicker && (
            <Text style={styles.inputHint}>Tap the field above to open the date picker</Text>
          )}
        </View>

        {/* ── Step 3: Time ── */}
        <View style={[styles.stepPage, { width }]}>
          <Text style={styles.stepNumber}>3 of 4</Text>
          <Text style={styles.stepTitle}>Time of Birth</Text>
          <Text style={styles.stepSubtitle}>The Lagna (Ascendant) shifts every 2 hours — precision matters</Text>

          {/* Selected time display */}
          <TouchableOpacity
            style={[styles.dateDisplay, selectedTime && !timeUnknown && styles.dateDisplaySelected]}
            onPress={() => {
              if (!timeUnknown) {
                setShowTimePicker(true);
                if (!selectedTime) setSelectedTime(new Date(2000, 0, 1, 12, 0));
              }
            }}
          >
            <Text style={styles.dateDisplayLabel}>TIME OF BIRTH</Text>
            <Text style={[styles.dateDisplayValue, !selectedTime && { color: Colors.muted }]}>
              {timeUnknown ? 'Unknown (using noon)' : selectedTime ? formatTimeDisplay(selectedTime) : 'Tap to select'}
            </Text>
            <Text style={styles.dateDisplayIcon}>🕐</Text>
          </TouchableOpacity>

          {showTimePicker && selectedTime && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) setSelectedTime(date);
                }}
                textColor={Colors.star}
                themeVariant="dark"
              />
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => {
                  setShowTimePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.pickerDoneBtnText}>Confirm Time ✦</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showTimePicker && (
            <TouchableOpacity
              style={[styles.unknownTimeBtn, timeUnknown && styles.unknownTimeBtnActive]}
              onPress={() => {
                setTimeUnknown(!timeUnknown);
                setShowTimePicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.unknownTimeBtnText, timeUnknown && { color: Colors.gold }]}>
                {timeUnknown ? '✓ Time unknown — using noon' : 'I don\'t know my birth time'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Step 4: Place ── */}
        <View style={[styles.stepPage, { width }]}>
          <Text style={styles.stepNumber}>4 of 4</Text>
          <Text style={styles.stepTitle}>Place of Birth</Text>
          <Text style={styles.stepSubtitle}>City or town where you were born</Text>
          <TextInput
            style={styles.bigInput}
            value={place}
            onChangeText={setPlace}
            placeholder="City, Country"
            placeholderTextColor={Colors.muted}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.inputHint}>e.g. Faridabad, India · Columbus, Ohio · London, UK</Text>
        </View>

        {/* ── Step 5: Generating ── */}
        <View style={[styles.stepPage, { width }]}>
          <View style={styles.generatingContent}>
            <Text style={styles.generatingOm}>ॐ</Text>
            <Text style={styles.generatingTitle}>Reading the Stars</Text>
            {generating ? (
              <>
                <ActivityIndicator color={Colors.gold} size="large" style={{ marginVertical: 20 }} />
                <Text style={styles.generatingStep}>Calculating Lagna & planetary positions…</Text>
                <Text style={styles.generatingStep}>Computing Vimshottari Dasha periods…</Text>
                <Text style={styles.generatingStep}>Identifying yogas & dignities…</Text>
                <Text style={styles.generatingStep}>Preparing your cosmic blueprint…</Text>
              </>
            ) : (
              <Text style={styles.generatingDone}>Your chart is ready ✦</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      {step < 5 && (
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <LinearGradient
              colors={['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextBtnGrad}
            >
              <Text style={styles.nextBtnText}>
                {step === 0 ? 'Begin ✦' : step === 4 ? 'Generate My Chart ✦' : 'Continue →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {step > 0 && step < 5 && (
            <TouchableOpacity onPress={() => goToStep(step - 1)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}

          {step === 3 && (
            <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  progressBar: { height: 2, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: Spacing.md, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 1 },
  stepPage: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, justifyContent: 'center' },

  // Welcome
  welcomeContent: { alignItems: 'center', gap: 16 },
  welcomeOm: { fontSize: 56, color: Colors.gold, marginBottom: 8 },
  welcomeTitle: { fontSize: 36, fontFamily: Fonts.cinzel, color: Colors.gold },
  welcomeTagline: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic, letterSpacing: 1 },
  welcomeDesc: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  featureList: { width: '100%', gap: 10, marginTop: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { color: Colors.gold, fontSize: 10 },
  featureItemText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson },

  // Steps
  stepNumber: { fontSize: 11, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 12 },
  stepTitle: { fontSize: 30, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: 10, lineHeight: 38 },
  stepSubtitle: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 22, marginBottom: 32 },

  // Name / Place input
  bigInput: {
    borderBottomWidth: 1, borderBottomColor: Colors.gold,
    paddingVertical: 14, fontSize: 22, fontFamily: Fonts.cinzel,
    color: Colors.star, marginBottom: 12, letterSpacing: 0.5,
  },
  inputHint: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic },

  // Date / Time display button
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.lg, padding: 18, marginBottom: 16,
  },
  dateDisplaySelected: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  dateDisplayLabel: {
    fontSize: 9, letterSpacing: 2, color: Colors.muted,
    fontFamily: Fonts.cinzel, position: 'absolute', top: 10, left: 18,
  },
  dateDisplayValue: { flex: 1, fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star, marginTop: 14 },
  dateDisplayIcon: { fontSize: 20 },

  // Picker
  pickerContainer: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 16,
  },
  pickerDoneBtn: {
    backgroundColor: Colors.gold, padding: 14, alignItems: 'center',
  },
  pickerDoneBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },

  // Unknown time
  unknownTimeBtn: {
    borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 12, alignSelf: 'flex-start',
    backgroundColor: Colors.card,
  },
  unknownTimeBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  unknownTimeBtnText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel },

  // Generating
  generatingContent: { alignItems: 'center', gap: 12 },
  generatingOm: { fontSize: 48, color: Colors.gold },
  generatingTitle: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  generatingStep: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  generatingDone: { fontSize: 18, color: Colors.emerald, fontFamily: Fonts.cinzel, marginTop: 16 },

  // Bottom buttons
  bottomSection: { padding: Spacing.lg, gap: 12 },
  nextBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  nextBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  backBtn: { alignItems: 'center' },
  backBtnText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cinzel },
  skipBtn: { alignItems: 'center' },
  skipBtnText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
});
