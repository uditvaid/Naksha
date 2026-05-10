import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getCompatibilityReading } from '@services/claude';
import { geocodePlace, generateChart, getAshtaKoota, PlaceNotFoundError } from '@services/prokerala';
import { AshtakootaCard } from '@components/AshtakootaCard';
import { AskGuruButton } from '@components/AskGuruButton';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { getChineseCompatibility, ELEMENT_DATA, BAZI_COMPATIBILITY, type ZodiacLevel } from '@utils/bazi';
import { validatePlace, PLACE_FORMAT_EXAMPLES } from '@utils/placeValidation';
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

// Day-master element interplay descriptions for the drill-down modal.
// Maps the cycle relationship to a plain-English explanation of how the
// two day-master elements interact in everyday relationship dynamics.
const ELEMENT_INTERPLAY_DETAIL: Record<string, { headline: string; dynamic: string; advice: string }> = {
  mirroring: {
    headline: 'Mirrored Elements',
    dynamic: 'You share the same day-master element. There\'s deep recognition — you understand each other\'s rhythms without explanation. The risk is amplification: when one of you spirals, the other reinforces it instead of balancing it.',
    advice: 'Build rituals that introduce the missing elements deliberately — physical activity, time apart, contact with people whose elements differ from yours. Same element wants company, but it also needs contrast to stay healthy.',
  },
  nurturing: {
    headline: 'You Nurture Them',
    dynamic: 'Your day-master element naturally generates theirs in the productive cycle. You give energy, encouragement, and grounding — they receive it and grow. This is one of the most supportive interplays in BaZi.',
    advice: 'Watch for over-giving. The flow goes one direction, so check in with yourself — are you depleting? Healthy nurturing requires you to also receive (from other relationships, your own practices). The relationship works best when you\'re both deliberate about reciprocity.',
  },
  received: {
    headline: 'They Nurture You',
    dynamic: 'Their day-master element naturally generates yours. You receive their energy, support, and grounding — they give it freely. This is one of the most supportive interplays in BaZi.',
    advice: 'Recognise and acknowledge what you\'re receiving — silent gratitude isn\'t enough. Express it. Reciprocity in this dynamic comes from showing up emotionally, not necessarily energetically. They give from their nature; you keep the relationship balanced by witnessing it.',
  },
  controlling: {
    headline: 'You Challenge Them',
    dynamic: 'Your day-master element controls theirs in the controlling cycle. You can sharpen them, refine them, push them toward growth — but the same dynamic can feel critical or overpowering if unbridled. The cycle creates pressure either way.',
    advice: 'Lead with appreciation before critique. The controlling cycle isn\'t bad — it\'s how steel gets forged — but it requires intentional softness. They need to feel safe before they can metabolise your sharpness. Ask if they want feedback before you give it.',
  },
  controlled: {
    headline: 'They Challenge You',
    dynamic: 'Their day-master element controls yours. They sharpen you, refine you, push you toward growth. This relationship will not let you stay comfortable — but you may also feel overpowered or criticised when they push too hard.',
    advice: 'Name what you need. The controlling cycle is generative for your growth, but only if you can advocate for yourself within it. Tell them when their sharpness lands as criticism. The dynamic asks both of you to be conscious — them softer, you firmer.',
  },
  neutral: {
    headline: 'Independent Elements',
    dynamic: 'Your day-master elements neither generate nor control each other. There\'s no inherent tension and no inherent flow — the relationship is what you make of it, free of strong elemental pull either way.',
    advice: 'You\'ll need to build your shared rhythm intentionally rather than rely on natural complementarity. The upside: no built-in friction to navigate. The work: choosing what you want this relationship to be, since the cosmos isn\'t pushing it in any direction.',
  },
};

// Place validation lives in @utils/placeValidation — same City, State,
// Country format the onboarding flow enforces.

// Defensive markdown strip — Haiku occasionally emits headers / bold even
// when the system prompt asks for plain prose, and the screen renders raw.
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^---+\s*$/gm, '')
    .trim();
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
  const [partnerBirthData, setPartnerBirthData] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnerChartFailed, setPartnerChartFailed] = useState(false);
  const [chineseModalOpen, setChineseModalOpen] = useState(false);

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

    const placeCheck = validatePlace(partnerPlace);
    if (!placeCheck.ok) {
      Alert.alert('Partner\'s Place of Birth', placeCheck.message);
      return;
    }

    setLoading(true);
    setPartnerBirthData(null);

    const place = partnerPlace.trim();
    let geo;
    try {
      geo = await geocodePlace(place);
    } catch (e) {
      setLoading(false);
      if (e instanceof PlaceNotFoundError) {
        Alert.alert(
          'Place Not Found',
          `We couldn't find that location. Please enter a more specific place as City, State, Country.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
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

    // Generate partner's chart + the deterministic Ashta-koota score in
    // parallel — both feed into the Claude prompt below. AshtakootaCard's
    // useAshtaKoota hook will hit the same in-memory cache so the score
    // card renders instantly when partnerBirthData lands.
    setPartnerChartFailed(false);
    setPartnerBirthData(partnerData);
    const [partnerChart, ashtaKoota] = await Promise.all([
      generateChart(partnerData).catch(() => { setPartnerChartFailed(true); return null; }),
      getAshtaKoota(user.birthData, partnerData).catch(() => null),
    ]);

    try {
      const raw = await getCompatibilityReading(
        { birthData: user.birthData, chart: user.chart },
        { birthData: partnerData, chart: partnerChart },
        ashtaKoota,
      );
      const result = stripMarkdown(raw);
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
              placeholder="City, State, Country"
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
              Pure local compute; complements the Vedic reading below.
              Tap opens a modal with deeper detail (zodiac match list,
              element interplay explanation, navigation advice). */}
          {chineseMatch && (
            <TouchableOpacity
              style={[styles.chineseCard, styles[`chinese_${chineseMatch.zodiacLevel}` as const]]}
              onPress={() => setChineseModalOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.chineseHeaderRow}>
                <Text style={styles.chineseLabel}>CHINESE ASTROLOGY MATCH</Text>
                <Text style={styles.chineseTapHint}>Tap for detail →</Text>
              </View>
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
            </TouchableOpacity>
          )}

          {/* Chinese match drill-down modal */}
          {chineseMatch && (
            <Modal
              visible={chineseModalOpen}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setChineseModalOpen(false)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chinese Astrology Match</Text>
                  <TouchableOpacity onPress={() => setChineseModalOpen(false)} style={styles.modalClose}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
                  {/* Top: zodiac pair + level */}
                  <View style={[styles.modalHero, styles[`chinese_${chineseMatch.zodiacLevel}` as const]]}>
                    <View style={styles.chineseZodiacRow}>
                      <View style={styles.chineseZodiacBox}>
                        <Text style={styles.chineseZodiacChar}>{chineseMatch.yourZodiacChar}</Text>
                        <Text style={styles.chineseZodiacName}>{chineseMatch.yourZodiac}</Text>
                      </View>
                      <Text style={styles.chineseConnector}>{chineseLevelGlyph(chineseMatch.zodiacLevel)}</Text>
                      <View style={styles.chineseZodiacBox}>
                        <Text style={styles.chineseZodiacChar}>{chineseMatch.partnerZodiacChar}</Text>
                        <Text style={styles.chineseZodiacName}>{chineseMatch.partnerZodiac}</Text>
                      </View>
                    </View>
                    <Text style={styles.chineseLevel}>{chineseLevelLabel(chineseMatch.zodiacLevel)}</Text>
                    <Text style={styles.chineseSummary}>{chineseMatch.summary}</Text>
                  </View>

                  {/* Year zodiac compatibility detail */}
                  <Text style={styles.modalSectionTitle}>YEAR ZODIAC COMPATIBILITY</Text>
                  <Text style={styles.modalParagraph}>
                    Your year zodiac shapes the broad social and ancestral energy each of you brings into the relationship — how you move through the world, what styles of company feel natural, the underlying tempo you each prefer.
                  </Text>
                  {(() => {
                    const yourCompat = BAZI_COMPATIBILITY[chineseMatch.yourZodiac];
                    const partnerCompat = BAZI_COMPATIBILITY[chineseMatch.partnerZodiac];
                    return (
                      <View style={styles.compatGrid}>
                        <View style={styles.compatCol}>
                          <Text style={styles.compatColTitle}>{chineseMatch.yourZodiacChar} {chineseMatch.yourZodiac}</Text>
                          <Text style={styles.compatLabel}>Best matches</Text>
                          <Text style={styles.compatList}>{yourCompat?.best.join(' · ') ?? '—'}</Text>
                          <Text style={styles.compatLabel}>Challenging</Text>
                          <Text style={styles.compatList}>{yourCompat?.challenging.join(' · ') ?? '—'}</Text>
                        </View>
                        <View style={styles.compatCol}>
                          <Text style={styles.compatColTitle}>{chineseMatch.partnerZodiacChar} {chineseMatch.partnerZodiac}</Text>
                          <Text style={styles.compatLabel}>Best matches</Text>
                          <Text style={styles.compatList}>{partnerCompat?.best.join(' · ') ?? '—'}</Text>
                          <Text style={styles.compatLabel}>Challenging</Text>
                          <Text style={styles.compatList}>{partnerCompat?.challenging.join(' · ') ?? '—'}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Day-master element interplay — the deeper layer */}
                  {(() => {
                    const detail = ELEMENT_INTERPLAY_DETAIL[chineseMatch.elementInterplay];
                    const yourEl = ELEMENT_DATA[chineseMatch.yourDayElement];
                    const partnerEl = ELEMENT_DATA[chineseMatch.partnerDayElement];
                    return (
                      <>
                        <Text style={styles.modalSectionTitle}>DAY-MASTER ELEMENT INTERPLAY</Text>
                        <Text style={styles.modalParagraph}>
                          The day master is the central element of each person's BaZi chart — the core of how you engage with the world. How your two day-master elements interact reveals the deeper, daily-life dynamic of the relationship.
                        </Text>
                        <View style={styles.interplayRow}>
                          <View style={[styles.interplayElem, { borderColor: yourEl?.color ?? Colors.gold }]}>
                            <Text style={[styles.interplayElemChar, { color: yourEl?.color ?? Colors.gold }]}>{chineseMatch.yourDayMasterChar}</Text>
                            <Text style={styles.interplayElemName}>{chineseMatch.yourDayMaster}</Text>
                            <Text style={[styles.interplayElemSub, { color: yourEl?.color ?? Colors.gold }]}>{chineseMatch.yourDayElement}</Text>
                          </View>
                          <Text style={styles.interplayArrow}>↔</Text>
                          <View style={[styles.interplayElem, { borderColor: partnerEl?.color ?? Colors.gold }]}>
                            <Text style={[styles.interplayElemChar, { color: partnerEl?.color ?? Colors.gold }]}>{chineseMatch.partnerDayMasterChar}</Text>
                            <Text style={styles.interplayElemName}>{chineseMatch.partnerDayMaster}</Text>
                            <Text style={[styles.interplayElemSub, { color: partnerEl?.color ?? Colors.gold }]}>{chineseMatch.partnerDayElement}</Text>
                          </View>
                        </View>
                        {detail && (
                          <>
                            <Text style={styles.modalSubsectionTitle}>{detail.headline}</Text>
                            <Text style={styles.modalParagraph}>{detail.dynamic}</Text>
                            <Text style={styles.modalSubsectionTitle}>How to navigate</Text>
                            <Text style={styles.modalParagraph}>{detail.advice}</Text>
                          </>
                        )}
                      </>
                    );
                  })()}
                </ScrollView>
              </SafeAreaView>
            </Modal>
          )}

          {/* Deterministic Ashta-koota score from Prokerala — appears once
              partnerBirthData lands (set inside analyze() before the Claude
              call). Replaces the previous regex-from-Claude-prose score with
              an authoritative breakdown across 8 koota areas. */}
          {partnerBirthData && (
            <AshtakootaCard
              me={user.birthData}
              partner={partnerBirthData}
              partnerDisplayName={partnerName.trim()}
            />
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

              <AskGuruButton seed={`I just read a compatibility reading between me and ${partnerName.trim() || 'my partner'}. Help me understand `} />

              {/* New reading */}
              <TouchableOpacity
                style={styles.newReadingBtn}
                onPress={() => {
                  setReading('');
                  setPartnerBirthData(null);
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
  chineseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chineseLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel },
  chineseTapHint: { fontSize: 10, letterSpacing: 1, color: Colors.gold, fontFamily: Fonts.cinzel, opacity: 0.7 },
  // Drill-down modal
  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalHero: { backgroundColor: Colors.card, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  modalSectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.md, marginBottom: 8 },
  modalSubsectionTitle: { fontSize: 12, letterSpacing: 1, color: Colors.star, fontFamily: Fonts.cinzel, marginTop: 12, marginBottom: 6 },
  modalParagraph: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, opacity: 0.9, marginBottom: 8 },
  compatGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  compatCol: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, gap: 4 },
  compatColTitle: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: 6, letterSpacing: 0.3 },
  compatLabel: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginTop: 6 },
  compatList: { fontSize: 12, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 18, opacity: 0.85 },
  interplayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 12, gap: 12 },
  interplayElem: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.md, padding: 14, gap: 4 },
  interplayElemChar: { fontSize: 32, fontFamily: Fonts.cinzel },
  interplayElemName: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  interplayElemSub: { fontSize: 11, fontFamily: Fonts.cinzel, opacity: 0.85, letterSpacing: 0.5 },
  interplayArrow: { fontSize: 22, color: Colors.muted },
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
