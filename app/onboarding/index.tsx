import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Path, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { generateChart, geocodePlace, PlaceNotFoundError, GeoResult } from '@services/prokerala';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import type { BirthData } from '@store/userStore';
import { validatePlace, PLACE_FORMAT_EXAMPLES } from '@utils/placeValidation';

const { width } = Dimensions.get('window');

// Format date object → display string "June 4, 1989"
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Format date object → ISO string for API "1989-06-04"
// iOS DateTimePicker returns midnight UTC for the selected calendar day, while
// Android returns local-midnight. Pick the appropriate accessors per platform so
// the calendar day the user actually chose is preserved on both.
function formatDateISO(date: Date): string {
  const useUtc = Platform.OS === 'ios';
  const y = useUtc ? date.getUTCFullYear() : date.getFullYear();
  const m = String((useUtc ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
  const d = String(useUtc ? date.getUTCDate() : date.getDate()).padStart(2, '0');
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

function shortenResolvedName(name: string): string {
  return name.split(',').map(p => p.trim()).filter(Boolean).slice(0, 3).join(', ');
}

function formatCoords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}

// validatePlace lives in @utils/placeValidation — shared with the
// compatibility partner-input flow so both places enforce the same
// City, State, Country format.

// ─── Astrological Zodiac Wheel ────────────────────────────────────────────────

const ZODIAC = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const WHEEL_SIZE = 210;
const CX = 105;
const CY = 105;
const R_OUTER = 100;
const R_INNER = 68;
const R_SYMBOL = 84;
const R_CENTER = 36;

function ZodiacWheel() {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // 12 divider lines at 0°, 30°, 60°, … (from top = -90°)
  const dividers = Array.from({ length: 12 }, (_, i) => {
    const a = toRad(i * 30 - 90);
    return {
      x1: CX + R_INNER * Math.cos(a),  y1: CY + R_INNER * Math.sin(a),
      x2: CX + R_OUTER * Math.cos(a),  y2: CY + R_OUTER * Math.sin(a),
      dx: CX + R_OUTER * Math.cos(a),  dy: CY + R_OUTER * Math.sin(a),
    };
  });

  // 12 zodiac symbol positions — center of each 30° segment
  const symbols = ZODIAC.map((sym, i) => {
    const a = toRad(i * 30 - 75); // -90 + 15 = -75° for Aries
    return {
      sym,
      x: CX + R_SYMBOL * Math.cos(a),
      y: CY + R_SYMBOL * Math.sin(a) + 5, // +5 to optically center glyph
    };
  });

  // 8-pointed star path for center
  const starPath = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 8; i++) {
      const outerA = toRad(i * 45 - 90);
      const innerA = toRad(i * 45 - 90 + 22.5);
      const ro = 20;
      const ri = 9;
      pts.push(`${i === 0 ? 'M' : 'L'} ${CX + ro * Math.cos(outerA)} ${CY + ro * Math.sin(outerA)}`);
      pts.push(`L ${CX + ri * Math.cos(innerA)} ${CY + ri * Math.sin(innerA)}`);
    }
    return pts.join(' ') + ' Z';
  })();

  // Small accent dots between segments on outer ring (at segment mid-angle)
  const accentDots = Array.from({ length: 12 }, (_, i) => {
    const a = toRad(i * 30 - 75);
    const r = R_OUTER + 0; // sit on the outer ring
    return { x: CX + R_OUTER * Math.cos(a), y: CY + R_OUTER * Math.sin(a) };
  });

  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      {/* Faint outer glow ring */}
      <Circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none" stroke="#C9A84C" strokeWidth={0.4} strokeOpacity={0.2} />

      {/* Outer band fill */}
      <Circle cx={CX} cy={CY} r={R_OUTER} fill="#0A0E1A" stroke="#C9A84C" strokeWidth={1.5} />

      {/* Band between inner and outer — slightly lighter fill */}
      <Circle cx={CX} cy={CY} r={R_INNER} fill="#080B14" stroke="#C9A84C" strokeWidth={0.8} strokeOpacity={0.5} />

      {/* Center circle */}
      <Circle cx={CX} cy={CY} r={R_CENTER} fill="#0D1120" stroke="#C9A84C" strokeWidth={1} strokeOpacity={0.6} />

      {/* 12 segment dividers */}
      {dividers.map((d, i) => (
        <Line key={`div-${i}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
          stroke="#C9A84C" strokeWidth={0.8} strokeOpacity={0.55} />
      ))}

      {/* Dot at each divider on outer ring */}
      {dividers.map((d, i) => (
        <Circle key={`odot-${i}`} cx={d.dx} cy={d.dy} r={2} fill="#C9A84C" fillOpacity={0.75} />
      ))}

      {/* Zodiac glyphs */}
      {symbols.map(({ sym, x, y }, i) => (
        <SvgText key={`sym-${i}`} x={x} y={y} textAnchor="middle"
          fontSize={13} fill="#C9A84C" fillOpacity={0.9}>
          {sym}
        </SvgText>
      ))}

      {/* 8-pointed star in center */}
      <Path d={starPath} fill="#C9A84C" fillOpacity={0.18} stroke="#C9A84C" strokeWidth={0.7} strokeOpacity={0.65} />

      {/* Center dot */}
      <Circle cx={CX} cy={CY} r={3.5} fill="#C9A84C" fillOpacity={0.85} />

      {/* Four cardinal accent marks on inner ring */}
      {[0, 90, 180, 270].map((deg, i) => {
        const a = toRad(deg - 90);
        const x = CX + R_INNER * Math.cos(a);
        const y = CY + R_INNER * Math.sin(a);
        return <Circle key={`cdot-${i}`} cx={x} cy={y} r={2} fill="#C9A84C" fillOpacity={0.6} />;
      })}
    </Svg>
  );
}

export default function OnboardingScreen() {
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);
  const setBirthData = useAppStore(s => s.setBirthData);
  const setChart = useAppStore(s => s.setChart);
  // Pre-existing birth data — if the user reached onboarding by tapping
  // "Edit Birth Data" from Profile, prefill the form so they don't have
  // to re-enter every field. Read once at mount via useRef so subsequent
  // state changes during onboarding don't clobber what the user is
  // currently typing.
  const existingBirthData = useAppStore.getState().user.birthData;
  const initRef = useRef(existingBirthData);

  const [step, setStep] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(!!initRef.current);
  const [name, setName] = useState(initRef.current?.name ?? '');
  const [place, setPlace] = useState(initRef.current?.placeOfBirth ?? '');
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Date picker state
  // iOS DateTimePicker stores midnight UTC for the picked calendar day;
  // Android stores local midnight. formatDateISO above already handles
  // this asymmetry, so the pre-fill must construct the Date the same
  // way the picker would have to keep the round-trip stable. Using
  // local-midnight for both would cause iOS users east of UTC to lose
  // a day when they edit without re-picking.
  const initDate = (() => {
    const s = initRef.current?.dateOfBirth;
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]); const mo = Number(m[2]) - 1; const d = Number(m[3]);
    return Platform.OS === 'ios'
      ? new Date(Date.UTC(y, mo, d, 0, 0, 0))
      : new Date(y, mo, d, 0, 0, 0);
  })();
  const [selectedDate, setSelectedDate] = useState<Date>(initDate ?? new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateConfirmed, setDateConfirmed] = useState(!!initDate);

  // Time picker state
  const initTime = (() => {
    if (!initRef.current?.timeOfBirth) return null;
    const [h, m] = initRef.current.timeOfBirth.split(':').map(Number);
    if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return null;
    return new Date(2000, 0, 1, h, m, 0);
  })();
  const [selectedTime, setSelectedTime] = useState<Date | null>(initTime);
  // pickerTime holds the spinner's in-flight value; only copied to selectedTime on Confirm.
  // This prevents the iOS spinner's spurious onChange-on-mount from silently overwriting
  // selectedTime with the device's current clock before the user has touched anything.
  const [pickerTime, setPickerTime] = useState<Date>(initTime ?? new Date(2000, 0, 1, 12, 0));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(!!initRef.current?.isTimeApproximate);

  // Pre-populate geocode from existing birth data so users editing
  // don't have to re-geocode the same place. Marked 'found' so the
  // Continue button on step 4 doesn't block.
  const initGeocode: GeoResult | null = initRef.current
    ? { latitude: initRef.current.latitude, longitude: initRef.current.longitude, timezone: initRef.current.timezone }
    : null;
  const [geocodeResult, setGeocodeResult] = useState<GeoResult | null>(initGeocode);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'found' | 'error'>(initGeocode ? 'found' : 'idle');
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeRequestTokenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeRequestTokenRef.current += 1;
    };
  }, []);

  const goToStep = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ x: n * width, animated: true });
  };

  const handlePlaceChange = (text: string) => {
    setPlace(text);
    setGeocodeResult(null);
    setGeocodeStatus('idle');
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeRequestTokenRef.current += 1;
    const validation = validatePlace(text);
    if (!validation.ok) return;
    const myToken = geocodeRequestTokenRef.current;
    geocodeTimerRef.current = setTimeout(async () => {
      if (myToken !== geocodeRequestTokenRef.current) return;
      setGeocodeStatus('loading');
      try {
        const result = await geocodePlace(text);
        if (myToken !== geocodeRequestTokenRef.current) return;
        setGeocodeResult(result);
        setGeocodeStatus('found');
      } catch {
        if (myToken !== geocodeRequestTokenRef.current) return;
        setGeocodeStatus('error');
      }
    }, 800);
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === 0 && !ageConfirmed) {
      Alert.alert('Age Confirmation Required', 'Please confirm you are 13 years or older to continue.'); return;
    }
    if (step === 1 && !name.trim()) {
      Alert.alert('Please enter your name'); return;
    }
    if (step === 2 && !dateConfirmed) {
      Alert.alert('Please select your date of birth'); return;
    }

    if (step === 4) {
      const validation = validatePlace(place);
      if (!validation.ok) {
        Alert.alert('Place of Birth Needed', validation.message);
        return;
      }

      goToStep(5);
      setGenerating(true);

      try {
        const geo = geocodeResult ?? await geocodePlace(place);
        const birthData: BirthData = {
          name: name.trim(),
          dateOfBirth: formatDateISO(selectedDate),
          timeOfBirth: selectedTime ? formatTime(selectedTime) : '12:00',
          // Mark the chart as time-approximate when the user picked a
          // window instead of an exact time. Used to surface an
          // "approximate" badge on the Chart screen.
          isTimeApproximate: timeUnknown,
          placeOfBirth: place.trim(),
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
        if (e instanceof PlaceNotFoundError) {
          Alert.alert(
            'Place Not Found',
            `We couldn't find that location. Please enter a more specific place as City, State, Country.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
          );
        } else {
          Alert.alert(
            'Chart Generation Failed',
            'Could not connect to the astrology server. Please check your internet connection and try again.',
          );
        }
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
          <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
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
            <ZodiacWheel />
            <Text style={styles.welcomeTitle}>Naksha</Text>
            <Text style={styles.welcomeTagline}>Your Complete Cosmic Blueprint</Text>
            <Text style={styles.welcomeDesc}>
              Indian, Chinese & Vedic Astrology with Numerology, Palmistry & Ancient Wisdom{'\n\n'}
              Understand yourself deeply. Navigate life wisely. Discover your dharma.
            </Text>
            <View style={styles.featureList}>
              {[
                "Learn more by asking your 'own' guru",
                'Personalized birth chart analysis',
                'Daily cosmic readings',
                'Numerology and Compatibility combined to dive deeper',
              ].map(f => (
                <View key={f} style={styles.featureItem}>
                  <Text style={styles.featureDot}>✦</Text>
                  <Text style={styles.featureItemText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Age confirmation */}
            <TouchableOpacity
              style={styles.ageCheckRow}
              onPress={() => setAgeConfirmed(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.ageCheckbox, ageConfirmed && styles.ageCheckboxChecked]}>
                {ageConfirmed && <Text style={styles.ageCheckmark}>✓</Text>}
              </View>
              <Text style={styles.ageCheckLabel}>
                I am 13 years of age or older (or have parental consent)
              </Text>
            </TouchableOpacity>
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
                setPickerTime(selectedTime ?? new Date(2000, 0, 1, 12, 0));
                setShowTimePicker(true);
              }
            }}
          >
            <Text style={styles.dateDisplayLabel}>TIME OF BIRTH</Text>
            <Text style={[styles.dateDisplayValue, !selectedTime && { color: Colors.muted }]}>
              {timeUnknown
                ? selectedTime ? `${formatTimeDisplay(selectedTime)} (approx.)` : 'Pick a window below'
                : selectedTime ? formatTimeDisplay(selectedTime) : 'Tap to select'}
            </Text>
            <Text style={styles.dateDisplayIcon}>🕐</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) setPickerTime(date);
                }}
                textColor={Colors.star}
                themeVariant="dark"
              />
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => {
                  setSelectedTime(pickerTime);
                  setShowTimePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.pickerDoneBtnText}>Confirm Time ✦</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showTimePicker && (
            <>
              <TouchableOpacity
                style={[styles.unknownTimeBtn, timeUnknown && styles.unknownTimeBtnActive]}
                onPress={() => {
                  setTimeUnknown(!timeUnknown);
                  setShowTimePicker(false);
                  // When toggling OFF, clear any window-midpoint selection
                  // so the user falls back to the precise time picker.
                  if (timeUnknown) setSelectedTime(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.unknownTimeBtnText, timeUnknown && { color: Colors.gold }]}>
                  {timeUnknown ? '✓ Using a time window' : 'I don\'t know my exact birth time'}
                </Text>
              </TouchableOpacity>

              {/* Time-window picker — when the user doesn't know their
                  exact time, give them 6 four-hour windows. Each maps
                  to a midpoint hour the chart can use; the chart will
                  show an "approximate" badge so users know the
                  limitation. Six buckets is a balance between accuracy
                  (each spans 2 BaZi Hour Pillars) and UX simplicity.
                  Midpoints chosen to land at the centre of a single
                  BaZi Hour Pillar — e.g., 8 AM is inside Dragon (7-9)
                  rather than 9 AM which sits on the Dragon/Snake
                  boundary. */}
              {timeUnknown && (
                <>
                  <Text style={styles.timeWindowHint}>
                    Pick the closest window. The chart will be marked "approximate" — your Rising Sign and Hour Pillar may be off, but everything else stays useful.
                  </Text>
                  <View style={styles.timeWindowGrid}>
                    {([
                      { label: 'Late night',     range: '11 PM – 3 AM',   hour: 0 },   // Rat pillar centre
                      { label: 'Pre-dawn',       range: '3 – 7 AM',       hour: 4 },   // Tiger pillar centre
                      { label: 'Mid morning',    range: '7 – 11 AM',      hour: 8 },   // Dragon pillar centre
                      { label: 'Around midday',  range: '11 AM – 3 PM',   hour: 12 },  // Horse pillar centre
                      { label: 'Afternoon',      range: '3 – 7 PM',       hour: 16 },  // Monkey pillar centre
                      { label: 'Evening',        range: '7 – 11 PM',      hour: 20 },  // Dog pillar centre
                    ] as const).map((w) => {
                      const isActive = selectedTime?.getHours() === w.hour && selectedTime?.getMinutes() === 0;
                      return (
                        <TouchableOpacity
                          key={w.label}
                          style={[styles.timeWindowBtn, isActive && styles.timeWindowBtnActive]}
                          onPress={() => {
                            const d = new Date(2000, 0, 1, w.hour, 0, 0);
                            setSelectedTime(d);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[styles.timeWindowBtnLabel, isActive && { color: Colors.gold }]}>{w.label}</Text>
                          <Text style={[styles.timeWindowBtnRange, isActive && { color: Colors.gold + 'cc' }]}>{w.range}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {!timeUnknown && (
                <Text style={styles.timeWarning}>
                  Your rising sign (Lagna) can shift with as little as a 4-minute error. Check your birth certificate or hospital records for precision.
                </Text>
              )}
            </>
          )}
        </View>

        {/* ── Step 4: Place ── */}
        <View style={[styles.stepPage, { width }]}>
          <Text style={styles.stepNumber}>4 of 4</Text>
          <Text style={styles.stepTitle}>Place of Birth</Text>
          <Text style={styles.stepSubtitle}>City or town where you were born</Text>
          <View style={styles.placeInputWrapper}>
            <Text style={styles.placeInputIcon}>📍</Text>
            <TextInput
              style={styles.placeInput}
              value={place}
              onChangeText={handlePlaceChange}
              placeholder="City, State, Country"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {geocodeStatus === 'loading' && (
            <View style={styles.geocodeChip}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.geocodeChipText}>Finding location…</Text>
            </View>
          )}
          {geocodeStatus === 'found' && geocodeResult && (
            <View style={[styles.geocodeChip, styles.geocodeChipSuccess]}>
              <Text style={styles.geocodeChipCheck}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.geocodeChipCity}>{shortenResolvedName(geocodeResult.resolvedName ?? place)}</Text>
                <Text style={styles.geocodeChipCoords}>{formatCoords(geocodeResult.latitude, geocodeResult.longitude)} · {geocodeResult.timezone}</Text>
                <Text style={styles.geocodeChipConfirm}>Confirm this is the correct location before continuing</Text>
              </View>
            </View>
          )}
          {geocodeStatus === 'error' && (
            <View style={[styles.geocodeChip, styles.geocodeChipError]}>
              <Text style={styles.geocodeChipErrorIcon}>✕</Text>
              <Text style={styles.geocodeChipText}>Location not found — try adding country</Text>
            </View>
          )}

          <Text style={styles.inputHint}>City, State, Country · e.g. Faridabad, Haryana, India</Text>
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
            <TouchableOpacity
              onPress={() => { setTimeUnknown(true); setSelectedTime(null); setShowTimePicker(false); handleNext(); }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Skip — I genuinely don't know ↓</Text>
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
  welcomeContent: { alignItems: 'center', gap: 12 },
  welcomeTitle: { fontSize: 36, fontFamily: Fonts.cinzel, color: Colors.gold },
  welcomeTagline: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic, letterSpacing: 1 },
  welcomeDesc: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  featureList: { width: '100%', gap: 10, marginTop: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { color: Colors.gold, fontSize: 10 },
  featureItemText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson },
  ageCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingHorizontal: 4 },
  ageCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.muted, alignItems: 'center', justifyContent: 'center' },
  ageCheckboxChecked: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  ageCheckmark: { fontSize: 12, color: Colors.midnight, fontWeight: '700' },
  ageCheckLabel: { flex: 1, fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18 },

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
  timeWarning: { fontSize: 11, color: Colors.mutedDark, fontFamily: Fonts.cormorantItalic, lineHeight: 17, marginTop: 12 },

  // 6-window picker for users who don't know their exact time
  timeWindowHint: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18, marginTop: 12, marginBottom: 8 },
  timeWindowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  timeWindowBtn: { width: '48%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 2 },
  timeWindowBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  timeWindowBtnLabel: { fontSize: 13, color: Colors.star, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },
  timeWindowBtnRange: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic },

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

  // Place input
  placeInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.gold, marginBottom: 12,
  },
  placeInputIcon: { fontSize: 18, marginRight: 8, paddingVertical: 14 },
  placeInput: {
    flex: 1, paddingVertical: 14, fontSize: 22,
    fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.5,
  },

  // Geocode result chip
  geocodeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.md, padding: 12, marginBottom: 12,
  },
  geocodeChipSuccess: {
    borderColor: 'rgba(39,174,96,0.5)', backgroundColor: 'rgba(39,174,96,0.07)',
  },
  geocodeChipError: {
    borderColor: 'rgba(192,57,43,0.5)', backgroundColor: 'rgba(192,57,43,0.07)',
  },
  geocodeChipCheck: {
    fontSize: 16, color: Colors.emerald, fontFamily: Fonts.cinzel, width: 20, textAlign: 'center',
  },
  geocodeChipErrorIcon: {
    fontSize: 14, color: Colors.ruby, fontFamily: Fonts.cinzel, width: 20, textAlign: 'center',
  },
  geocodeChipCity: {
    fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3,
  },
  geocodeChipCoords: {
    fontSize: 11, fontFamily: Fonts.cormorantItalic, color: Colors.muted, marginTop: 2,
  },
  geocodeChipConfirm: {
    fontSize: 10, fontFamily: Fonts.cinzel, color: Colors.emerald + 'CC', marginTop: 4, letterSpacing: 0.3,
  },
  geocodeChipText: {
    fontSize: 13, fontFamily: Fonts.cormorantItalic, color: Colors.muted, flex: 1,
  },
});
