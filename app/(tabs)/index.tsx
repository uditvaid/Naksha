import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppStore, onAppReset } from '@store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { getDailyReading } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { computeLunarPhase } from '@lib/daily/signals';
import { DailyShareButton } from '@components/DailyShareButton';
import { useDailyContinuityStore, DailyRecord } from '@store/dailyContinuityStore';
import { todaysAffirmation, todaysFocus } from '@lib/dailyAffirmation';
import { findActiveDasha, findActiveAntardasha } from '@utils/vedic';

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

// Module-level cache survives tab unmounts — avoids refetching every time user navigates back.
// Keyed on (date, userKey) so a profile reset / re-onboard invalidates the previous user's reading.
let _dailyReadingCache: { date: string; userKey: string; text: string } | null = null;
// In-flight guard so pull-to-refresh during initial load doesn't fire two parallel API calls.
let _dailyReadingInFlight: Promise<void> | null = null;

function userCacheKey(birthData: { name: string; dateOfBirth: string } | null): string {
  if (!birthData) return '';
  return `${birthData.name}|${birthData.dateOfBirth}`;
}

// "2026-04-30" → "Apr 30" (compact list label) or "Yesterday" / "Today"
function formatArchiveDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const recordDate = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - recordDate.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return recordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Clear the module-level cache when the user resets/logs out so a re-onboarded user
// does not see the previous user's daily reading until the app restarts.
onAppReset(() => { _dailyReadingCache = null; _dailyReadingInFlight = null; });

export default function HomeScreen() {
  const { birthData, chart, isPremium, aiDisclosureAcknowledged } = useAppStore(useShallow(s => ({
    birthData: s.user.birthData,
    chart: s.user.chart,
    isPremium: s.user.isPremium,
    aiDisclosureAcknowledged: s.user.aiDisclosureAcknowledged,
  })));
  const acknowledgeAIDisclosure = useAppStore(s => s.acknowledgeAIDisclosure);
  const initialKey = userCacheKey(birthData);
  const initialDateKey = new Date().toISOString().split('T')[0]!;
  const [dailyReading, setDailyReading] = useState(
    _dailyReadingCache?.date === initialDateKey && _dailyReadingCache?.userKey === initialKey
      ? _dailyReadingCache.text
      : ''
  );
  const [loadingReading, setLoadingReading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAIDisclosure, setShowAIDisclosure] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  // When set, the modal renders this past record instead of today's reading.
  const [archivedRecord, setArchivedRecord] = useState<DailyRecord | null>(null);

  const addDaily = useDailyContinuityStore(s => s.addDaily);
  const dailyRecords = useDailyContinuityStore(s => s.dailyRecords);
  const recentRecords = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0]!;
    return dailyRecords.filter(r => r.date !== todayIso).slice(0, 7);
  }, [dailyRecords]);

  useEffect(() => {
    if (birthData && !aiDisclosureAcknowledged) {
      const timer = setTimeout(() => setShowAIDisclosure(true), 800);
      return () => clearTimeout(timer);
    }
  }, [birthData, aiDisclosureAcknowledged]);

  const name = birthData?.name ?? 'Seeker';
  const firstName = name.split(' ')[0] ?? name;

  const chartPlanets = chart?.planets;
  const chartDashas = chart?.dashas;
  // `nowTick` bumps on focus so date/time-derived values refresh after the user
  // returns to this tab post-midnight without keeping the screen rerendering.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const chartDerived = useMemo(() => {
    const planets = chartPlanets ?? [];
    return {
      moon: planets.find(p => p.planet === 'Moon'),
      sun: planets.find(p => p.planet === 'Sun'),
      activeDasha: findActiveDasha(chartDashas, new Date(nowTick)),
    };
  }, [chartPlanets, chartDashas, nowTick]);
  const { moon, sun, activeDasha } = chartDerived;

  // Same affirmation + focus shown in today's 8am push, surfaced on the home page.
  // Re-derive whenever the focus tick advances so the strings refresh after midnight
  // without requiring the user to fully relaunch the app.
  const dailyAffirmation = useMemo(() => todaysAffirmation(), [nowTick]);
  const dailyFocus = useMemo(
    () => todaysFocus(activeDasha?.planet),
    [activeDasha?.planet, nowTick],
  );

  const { dateStr, greeting, todayLunarPhase } = useMemo(() => {
    const t = new Date(nowTick);
    const h = t.getHours();
    return {
      dateStr: t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      greeting: h < 12 ? 'Suprabhat' : h < 17 ? 'Namaskar' : 'Good Evening',
      todayLunarPhase: computeLunarPhase(t),
    };
  }, [nowTick]);

  const fetchDailyReading = useCallback(async (force = false) => {
    if (!birthData) return;
    // ISO YYYY-MM-DD for cache key — toDateString() is locale-sensitive and
    // can produce false misses across DST or locale shifts.
    const todayKey = new Date().toISOString().split('T')[0]!;
    const key = userCacheKey(birthData);
    if (!force && _dailyReadingCache?.date === todayKey && _dailyReadingCache?.userKey === key) return;
    // Coalesce concurrent callers (pull-to-refresh during initial load, etc.)
    // onto a single in-flight request instead of firing duplicate API calls.
    if (_dailyReadingInFlight) return _dailyReadingInFlight;
    setLoadingReading(true);
    _dailyReadingInFlight = (async () => {
      try {
        const raw = await getDailyReading(birthData, chart);
        const reading = stripMarkdown(raw);
        setDailyReading(reading);
        _dailyReadingCache = { date: todayKey, userKey: key, text: reading };

        // Persist to history — dedupe so refresh doesn't pile up records for the same day.
        const isoDate = todayKey;
        const alreadyToday = useDailyContinuityStore.getState().dailyRecords.some(d => d.date === isoDate);
        if (!alreadyToday) {
          const activeMahadasha = findActiveDasha(chart?.dashas);
          const activeAntardasha = findActiveAntardasha(activeMahadasha?.antardasha);
          addDaily({
            date: isoDate,
            notification: reading.slice(0, 100),
            card: reading.slice(0, 280),
            expanded: reading,
            tone: 'reflective',
            lunarPhase: computeLunarPhase(new Date()),
            mahadasha: activeMahadasha?.planet ?? 'Sun',
            antardasha: activeAntardasha?.planet ?? null,
            isQuietDay: false,
            isDeepDay: false,
            hasCallback: false,
          });
        }
      } catch (e: any) {
        setDailyReading(`Unable to get reading: ${e?.message ?? 'Please try again shortly.'}`);
      } finally {
        setLoadingReading(false);
        _dailyReadingInFlight = null;
      }
    })();
    return _dailyReadingInFlight;
  }, [birthData, chart, addDaily]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDailyReading(true);
    setRefreshing(false);
  };

  useEffect(() => { fetchDailyReading(); }, [fetchDailyReading]);

  // Bump the focus tick whenever the user returns to this tab. Time-derived UI
  // (greeting, date, lunar phase, affirmation, active dasha) re-evaluates so
  // the screen stays correct after a midnight or noon boundary.
  useFocusEffect(useCallback(() => { setNowTick(Date.now()); }, []));

  return (
    <SafeAreaView style={styles.container}>
      {/* Full reading modal */}
      <Modal visible={showReadingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowReadingModal(false); setArchivedRecord(null); }}>
        <SafeAreaView style={styles.modalSheet}>
          <View style={styles.modalSheetHeader}>
            <Text style={styles.modalSheetTitle}>{archivedRecord ? 'Reading from ' + formatArchiveDate(archivedRecord.date) : "Today's Cosmic Reading"}</Text>
            <TouchableOpacity onPress={() => { setShowReadingModal(false); setArchivedRecord(null); }} style={styles.modalSheetClose}>
              <Text style={styles.modalSheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSheetActions}>
            <DailyShareButton
              reading={archivedRecord?.expanded ?? dailyReading}
              lunarPhase={(archivedRecord?.lunarPhase as any) ?? todayLunarPhase}
              mahadasha={archivedRecord?.mahadasha ?? activeDasha?.planet ?? 'Sun'}
              isQuietDay={archivedRecord?.isQuietDay ?? false}
            />
            {!archivedRecord && (
              <TouchableOpacity style={styles.modalSheetRefresh} onPress={() => { setShowReadingModal(false); fetchDailyReading(true); }}>
                <Text style={styles.modalSheetRefreshText}>↻ Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.modalSheetBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSheetDate}>{archivedRecord ? formatArchiveDate(archivedRecord.date) : dateStr}</Text>
            <Text style={styles.modalSheetContent}>{archivedRecord?.expanded ?? dailyReading}</Text>
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* One-time AI disclosure modal */}
      <Modal visible={showAIDisclosure} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>About AI in Naksha</Text>
            <Text style={styles.modalBody}>
              Naksha uses <Text style={styles.modalBold}>Claude AI by Anthropic</Text> to generate two types of content:{'\n\n'}
              <Text style={styles.modalBold}>• Daily cosmic readings</Text> — generated from your birth data and today's date.{'\n'}
              <Text style={styles.modalBold}>• Guru responses</Text> — generated from your chart and the questions you ask.{'\n\n'}
              <Text style={styles.modalBold}>Your planetary positions and chart calculations</Text> are computed mathematically using classical Vedic ephemeris — not AI.{'\n\n'}
              <Text style={styles.modalBold}>What is sent to Anthropic:</Text> your name, birth date, birth place, chart data, and Guru questions.{'\n\n'}
              <Text style={styles.modalBold}>What is NOT sent:</Text> device identifiers, contacts, photos, or any other personal data.{'\n\n'}
              The AI draws on classical Vedic texts, Jyotish tradition, and established astrological research — the sources are recognised and valid. Readings are for spiritual reflection only and do not constitute medical, legal, financial, or mental health advice.
            </Text>
            <TouchableOpacity
              style={styles.modalAccept}
              onPress={() => { acknowledgeAIDisclosure(); setShowAIDisclosure(false); }}
            >
              <Text style={styles.modalAcceptText}>Got It ✦</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{firstName}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          {!isPremium && (
            <TouchableOpacity style={styles.premiumBadge} onPress={() => router.push('/paywall')}>
              <Text style={styles.premiumBadgeText}>✦ GO PREMIUM</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mandala Hero */}
        <View style={styles.mandalaSection}>
          <MandalaWheel lagna={chart?.lagna ?? 'Libra'} />
          {chart && (
            <View style={styles.lagnaInfo}>
              <Text style={styles.lagnaSign}>{chart.lagna}</Text>
              <Text style={styles.lagnaLabel}>LAGNA (ASCENDANT)</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Moon Sign" value={moon?.sign ?? '—'} sub={moon?.nakshatra ?? ''} />
          <StatCard label="Mahadasha" value={activeDasha?.planet ?? '—'} sub={activeDasha ? `Until ${new Date(activeDasha.endDate).getFullYear()}` : ''} />
          <StatCard label="Sun Sign" value={sun?.sign ?? '—'} sub={sun?.nakshatra ?? ''} />
        </View>

        {/* Daily Affirmation — same content as today's 8am push notification.
            Always present, no API call required. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S AFFIRMATION</Text>
          <View style={styles.affirmationCard}>
            <Text style={styles.affirmationText}>{dailyAffirmation}</Text>
            <View style={styles.focusDivider} />
            <Text style={styles.focusHeader}>✦ Top 3 to focus on today</Text>
            {dailyFocus.map((line, i) => (
              <Text key={i} style={styles.focusLine}>
                <Text style={styles.focusNum}>{i + 1}.</Text> {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Daily Reading — preview card, tap to expand */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S COSMIC READING</Text>
          <TouchableOpacity
            style={styles.readingCard}
            onPress={() => { if (dailyReading) { setArchivedRecord(null); setShowReadingModal(true); } }}
            activeOpacity={dailyReading ? 0.75 : 1}
          >
            {loadingReading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.gold} size="small" />
                <Text style={styles.loadingText}>Reading the stars…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.readingPreview} numberOfLines={3}>
                  {dailyReading || (birthData ? 'Tap refresh to receive your daily reading.' : 'Complete your birth details to unlock your daily reading.')}
                </Text>
                {dailyReading ? (
                  <Text style={styles.readMoreHint}>Read full reading →</Text>
                ) : birthData ? (
                  <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDailyReading(true)}>
                    <Text style={styles.refreshBtnText}>↻ Get Reading</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Recent Readings — past entries, tap to re-read */}
        {recentRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT READINGS</Text>
            {recentRecords.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.archiveItem}
                onPress={() => { setArchivedRecord(rec); setShowReadingModal(true); }}
                activeOpacity={0.7}
              >
                <View style={styles.archiveRow}>
                  <Text style={styles.archiveDate}>{formatArchiveDate(rec.date)}</Text>
                  <Text style={styles.archiveDasha}>{rec.mahadasha}</Text>
                </View>
                <Text style={styles.archivePreview} numberOfLines={2}>{rec.notification || rec.card}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
          <View style={styles.quickGrid}>
            <QuickAction icon="🖐" label="Palm Reading" color="#E8C96A" onPress={() => isPremium ? router.push('/features/palm') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="∑" label="Numerology" color="#A78BFA" onPress={() => isPremium ? router.push('/features/numerology') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="☯" label="Chinese Chart" color="#F87171" onPress={() => isPremium ? router.push('/features/chinese') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="📖" label="Lal Kitab" color="#34D399" onPress={() => isPremium ? router.push('/features/lalkitab') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="♡" label="Compatibility" color="#FB7185" onPress={() => isPremium ? router.push('/features/compatibility') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="✦" label="Tarot" color="#C4B5FD" onPress={() => isPremium ? router.push('/features/tarot') : router.push('/paywall')} locked={!isPremium} />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MandalaWheel = memo(function MandalaWheel({ lagna }: { lagna: string }) {
  const SIGN_SYMBOLS: Record<string, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  return (
    <View style={styles.mandala}>
      <View style={styles.mandalaOuter} />
      <View style={styles.mandalaInner} />
      <View style={styles.mandalaCenter}>
        <Text style={styles.mandalaSign}>{SIGN_SYMBOLS[lagna] ?? '◎'}</Text>
        <Text style={styles.mandalaOm}>ॐ</Text>
      </View>
    </View>
  );
});

const StatCard = memo(function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
});

const QuickAction = memo(function QuickAction({ icon, label, color, onPress, locked }: { icon: string; label: string; color: string; onPress: () => void; locked: boolean }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickIconWrap, { backgroundColor: color + '18' }]}>
        <Text style={styles.quickIcon}>{icon}</Text>
      </View>
      <Text style={[styles.quickLabel, { color: color }]}>{label}</Text>
      {locked && <Text style={styles.lockBadge}>✦</Text>}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingTop: Spacing.sm },
  greeting: { fontSize: 12, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, textTransform: 'uppercase' },
  name: { fontSize: 24, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: 2 },
  date: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  premiumBadge: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  premiumBadgeText: { fontSize: 9, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1 },
  mandalaSection: { alignItems: 'center', paddingVertical: Spacing.md },
  mandala: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mandalaOuter: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  mandalaInner: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(201,168,76,0.35)' },
  mandalaCenter: { alignItems: 'center' },
  mandalaSign: { fontSize: 36, color: Colors.gold },
  mandalaOm: { fontSize: 18, color: 'rgba(201,168,76,0.5)', marginTop: -4 },
  lagnaInfo: { marginTop: 8, alignItems: 'center' },
  lagnaSign: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star },
  lagnaLabel: { fontSize: 9, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star, marginTop: 4 },
  statSub: { fontSize: 10, color: Colors.gold, marginTop: 2, fontFamily: Fonts.cormorantItalic },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10 },
  readingCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  affirmationCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gold + '55', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  affirmationText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 24, marginBottom: 4 },
  focusDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.cardBorder, marginVertical: Spacing.sm },
  focusHeader: { fontSize: 11, letterSpacing: 1.2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 6 },
  focusLine: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20 },
  focusNum: { color: Colors.gold, fontFamily: Fonts.cinzel },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { color: Colors.muted, fontFamily: Fonts.cormorantItalic, fontSize: 14 },
  readingPreview: { fontSize: 15, lineHeight: 24, color: Colors.star, fontFamily: Fonts.crimson },
  readMoreHint: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: 10, alignSelf: 'flex-end' },
  archiveItem: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  archiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  archiveDate: { fontSize: 11, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, textTransform: 'uppercase' },
  archiveDasha: { fontSize: 10, letterSpacing: 1, color: Colors.gold, fontFamily: Fonts.cinzel },
  archivePreview: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 19 },
  refreshBtn: { marginTop: 12, alignSelf: 'flex-end' },
  refreshBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel },
  modalSheet: { flex: 1, backgroundColor: Colors.midnight },
  modalSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalSheetTitle: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.gold },
  modalSheetClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalSheetCloseText: { fontSize: 18, color: Colors.muted },
  modalSheetBody: { flex: 1, padding: Spacing.md },
  modalSheetDate: { fontSize: 11, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 16, textTransform: 'uppercase' },
  modalSheetContent: { fontSize: 16, lineHeight: 28, color: Colors.star, fontFamily: Fonts.crimson },
  modalSheetActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalSheetRefresh: { paddingVertical: Spacing.sm },
  modalSheetRefreshText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cinzel },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '30%', aspectRatio: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { fontSize: 26 },
  quickLabel: { fontSize: 9, fontFamily: Fonts.cinzel, letterSpacing: 0.5, textAlign: 'center' },
  lockBadge: { position: 'absolute', top: 6, right: 8, fontSize: 8, color: Colors.gold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: '#0D1220', borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center', marginBottom: Spacing.md },
  modalBody: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, marginBottom: Spacing.lg },
  modalBold: { fontFamily: Fonts.cinzelBold, color: Colors.gold },
  modalAccept: { backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  modalAcceptText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },
});
