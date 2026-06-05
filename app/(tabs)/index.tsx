import { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppStore, onAppReset } from '@store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { getDailyReading } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { computeLunarPhase } from '@lib/daily/signals';
import { composeReadingContext, parseReadingResponse, type LifeAreas } from '@lib/daily/readingComposition';
import { useAppOpenStreakStore, guruBonusForStreak } from '@store/appOpenStreakStore';
import { DailyShareButton } from '@components/DailyShareButton';
import { DailyReadingAudioButton } from '@components/DailyReadingAudioButton';
import { useDailyContinuityStore, DailyRecord } from '@store/dailyContinuityStore';
import { todaysAffirmation, todaysFocus } from '@lib/dailyAffirmation';
import { usePanchang, panchangSummaryLine } from '@lib/panchang';
import { buildAffirmationContext } from '@lib/affirmationContext';
import { AuspiciousPeriodsCard } from '@components/AuspiciousPeriodsCard';
import { AskGuruButton } from '@components/AskGuruButton';
import { DailyTarotCard } from '@components/DailyTarotCard';
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
// `lifeAreas` is the parsed structured block from the Claude response; null when the
// response was older / malformed and we fall back to prose-only rendering.
let _dailyReadingCache: { date: string; userKey: string; text: string; lifeAreas: LifeAreas | null } | null = null;
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
  const { birthData, chart, isPremium, aiDisclosureAcknowledged, hasHydrated } = useAppStore(useShallow(s => ({
    birthData: s.user.birthData,
    chart: s.user.chart,
    isPremium: s.user.isPremium,
    aiDisclosureAcknowledged: s.user.aiDisclosureAcknowledged,
    hasHydrated: s._hasHydrated,
  })));
  const acknowledgeAIDisclosure = useAppStore(s => s.acknowledgeAIDisclosure);
  const initialKey = userCacheKey(birthData);
  const initialDateKey = new Date().toISOString().split('T')[0]!;
  const initialCacheValid = _dailyReadingCache?.date === initialDateKey && _dailyReadingCache?.userKey === initialKey;
  const [dailyReading, setDailyReading] = useState(
    initialCacheValid ? _dailyReadingCache!.text : ''
  );
  const [lifeAreas, setLifeAreas] = useState<LifeAreas | null>(
    initialCacheValid ? _dailyReadingCache!.lifeAreas : null
  );
  const [loadingReading, setLoadingReading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Mounted guard for fetchDailyReading. The Claude call can run 30s;
  // if the user closes the app (component unmounts) before it resolves,
  // post-await setDailyReading / setLifeAreas / setLoadingReading fire
  // on an unmounted component and React 18 emits a warning. The
  // _dailyReadingCache module-level write is safe — it's a plain object.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [showAIDisclosure, setShowAIDisclosure] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showAffirmationModal, setShowAffirmationModal] = useState(false);
  // When set, the modal renders this past record instead of today's reading.
  const [archivedRecord, setArchivedRecord] = useState<DailyRecord | null>(null);

  const addDaily = useDailyContinuityStore(s => s.addDaily);
  const dailyRecords = useDailyContinuityStore(s => s.dailyRecords);
  // `nowTick` bumps on focus so date/time-derived values refresh after the user
  // returns to this tab post-midnight without keeping the screen rerendering.
  // Declared up here (rather than near the other time-derived memos) because
  // recentRecords below also needs it — `todayIso` would otherwise stay frozen
  // at the date when dailyRecords last changed, briefly hiding yesterday's
  // reading from the archive after a midnight boundary.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const recentRecords = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0]!;
    return dailyRecords.filter(r => r.date !== todayIso).slice(0, 7);
  }, [dailyRecords, nowTick]);

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
  // Panchang acts as quiet context above the affirmation — weekday + Moon's
  // nakshatra + waxing/waning. Renders nothing if the fetch fails so the
  // affirmation surface is unaffected.
  const panchang = usePanchang(birthData, nowTick);
  const panchangLine = useMemo(() => panchangSummaryLine(panchang, nowTick), [panchang, nowTick]);
  // Composed deterministically — no Claude call. Refreshes when nowTick
  // bumps (focus / app-resume / midnight) so the modal narrative tracks
  // the same date as the affirmation it's explaining.
  const affirmationContext = useMemo(
    () => buildAffirmationContext(panchang, chartDerived.activeDasha?.planet, nowTick),
    [panchang, chartDerived.activeDasha?.planet, nowTick],
  );
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

  // Deterministic composition layer — chips, provenance footer, tomorrow's
  // peek, journal prompts, theme tag. Free; recomputes only when the chart
  // or the calendar date changes.
  const composition = useMemo(
    () => composeReadingContext(chart, new Date(nowTick)),
    [chart, nowTick],
  );

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
        // Split the response into prose + structured life-area block, then
        // strip markdown from each piece so an accidental ** in the model's
        // output doesn't render as raw asterisks.
        const parsed = parseReadingResponse(raw);
        const reading = stripMarkdown(parsed.prose);
        const cleanedAreas = parsed.lifeAreas
          ? {
              work: stripMarkdown(parsed.lifeAreas.work),
              love: stripMarkdown(parsed.lifeAreas.love),
              health: stripMarkdown(parsed.lifeAreas.health),
              inner: stripMarkdown(parsed.lifeAreas.inner),
            }
          : null;
        // Cache survives unmount, so set it unconditionally. Local state
        // only fires if the component is still mounted — otherwise React
        // warns and we'd see noise in Sentry.
        _dailyReadingCache = { date: todayKey, userKey: key, text: reading, lifeAreas: cleanedAreas };
        if (mountedRef.current) {
          setDailyReading(reading);
          setLifeAreas(cleanedAreas);
        }

        // Persist to history — dedupe so refresh doesn't pile up records for the same day.
        const isoDate = todayKey;
        const alreadyToday = useDailyContinuityStore.getState().dailyRecords.some(d => d.date === isoDate);
        if (!alreadyToday) {
          const activeMahadasha = findActiveDasha(chart?.dashas);
          const activeAntardasha = findActiveAntardasha(activeMahadasha?.antardasha);
          // Compose themed tag from deterministic signals so the archive shows
          // a one-word badge ("Full moon", "Saturn chapter") instead of a
          // generic dasha label that all entries share.
          const composition = composeReadingContext(chart, new Date());
          addDaily({
            date: isoDate,
            notification: reading.slice(0, 100),
            card: reading.slice(0, 280),
            expanded: reading,
            tone: 'reflective',
            lunarPhase: computeLunarPhase(new Date()),
            mahadasha: activeMahadasha?.planet ?? 'Sun',
            antardasha: activeAntardasha?.planet ?? null,
            isQuietDay: composition.signals.isQuietDay,
            isDeepDay: false,
            hasCallback: false,
            themeTag: composition.themeTag,
          });
        }
      } catch (e: any) {
        if (mountedRef.current) {
          setDailyReading(`Unable to get reading: ${e?.message ?? 'Please try again shortly.'}`);
        }
      } finally {
        if (mountedRef.current) setLoadingReading(false);
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

  // App-open streak — visible badge + milestone unlocks. Read currentStreak
  // separately from recordOpen so the badge re-renders the moment a tick
  // bumps it.
  const recordOpen = useAppOpenStreakStore(s => s.recordOpen);
  const acknowledgeMilestone = useAppOpenStreakStore(s => s.acknowledgeMilestone);
  const currentStreak = useAppOpenStreakStore(s => s.currentStreak);
  const longestStreak = useAppOpenStreakStore(s => s.longestStreak);
  const [milestoneReached, setMilestoneReached] = useState<number | null>(null);

  // Bump the focus tick whenever the user returns to this tab. Time-derived UI
  // (greeting, date, lunar phase, affirmation, active dasha) re-evaluates so
  // the screen stays correct after a midnight or noon boundary. We also tick
  // the app-open streak here — focus on the home tab is the qualifying signal
  // for "the user came back today." Idempotent per calendar day; only the
  // first focus on a new day actually advances the counter.
  //
  // The streak tick is gated on:
  //   (a) `hasHydrated` — on cold boot, the persisted user store hydrates
  //       async; if focus fires before hydration completes, birthData
  //       reads as null and the tick is skipped — the user silently
  //       loses that day's streak. Deferring until hydration completes
  //       fixes this. Once hasHydrated flips true, useCallback re-runs
  //       and useFocusEffect re-fires the callback.
  //   (b) `birthData` being set — pre-onboarding opens ("complete your
  //       birth details" state) don't accrue toward the streak.
  //       Otherwise a user who installs and never engages could hit a
  //       7-day milestone modal without ever having read a reading. The
  //       first tick after onboarding fires when the home screen
  //       regains focus on return from the onboarding flow.
  useFocusEffect(useCallback(() => {
    setNowTick(Date.now());
    if (!hasHydrated || !birthData) return;
    const result = recordOpen();
    if (result.newMilestone !== null) {
      setMilestoneReached(result.newMilestone);
    }
  }, [recordOpen, birthData, hasHydrated]));

  // Tab focus alone misses the case where the user keeps the home tab in
  // foreground and the app goes idle / backgrounds across midnight. Without
  // this listener, today's affirmation + today's time windows stay frozen
  // on yesterday's date until the user navigates away and back. Listening
  // to AppState 'active' transitions covers app-resume from background
  // and the midnight-while-active case (iOS reports a state change when
  // the screen wakes from sleep mid-foreground).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNowTick(Date.now());
    });
    return () => sub.remove();
  }, []);

  // Defensive: if the app stays foregrounded across midnight without an
  // AppState change (rare on real devices, common on simulator with
  // "Slow Animations" off), self-schedule a refresh at the next midnight.
  // Self-rescheduling chain avoids the previous churn pattern where
  // nowTick was in the deps array — every focus event would cancel and
  // re-create the timer. Now: scheduled once on mount, the fired
  // callback bumps nowTick AND schedules the next midnight.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 5, 0); // 5s past midnight to be safe
      const ms = nextMidnight.getTime() - now.getTime();
      timer = setTimeout(() => {
        setNowTick(Date.now());
        schedule();
      }, ms);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Full reading modal */}
      <Modal visible={showReadingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowReadingModal(false); setArchivedRecord(null); }}>
        <SafeAreaView style={styles.modalSheet}>
          <View style={styles.modalSheetHeader}>
            <Text style={styles.modalSheetTitle}>{archivedRecord ? 'Reading from ' + formatArchiveDate(archivedRecord.date) : "Today's Cosmic Reading"}</Text>
            <TouchableOpacity
              onPress={() => { setShowReadingModal(false); setArchivedRecord(null); }}
              style={styles.modalSheetClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close cosmic reading"
              accessibilityRole="button"
            >
              <Text style={styles.modalSheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSheetActions}>
            <View style={styles.modalSheetActionsLeft}>
              <DailyShareButton
                reading={archivedRecord?.expanded ?? dailyReading}
                lunarPhase={(archivedRecord?.lunarPhase as any) ?? todayLunarPhase}
                mahadasha={archivedRecord?.mahadasha ?? activeDasha?.planet ?? 'Sun'}
                isQuietDay={archivedRecord?.isQuietDay ?? false}
              />
              <DailyReadingAudioButton
                reading={archivedRecord?.expanded ?? dailyReading}
                isPremium={isPremium}
                active={showReadingModal}
              />
            </View>
            {!archivedRecord && (
              <TouchableOpacity
                style={styles.modalSheetRefresh}
                // Refresh in-place: keep the modal open and let the
                // reading state transition to the loading view. Closing
                // the modal here used to drop the user back to the
                // preview card — a UX regression that made Refresh feel
                // like "dismiss."
                onPress={() => fetchDailyReading(true)}
                disabled={loadingReading}
              >
                {loadingReading ? (
                  <ActivityIndicator color={Colors.gold} size="small" />
                ) : (
                  <Text style={styles.modalSheetRefreshText}>↻ Refresh</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.modalSheetBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSheetDate}>{archivedRecord ? formatArchiveDate(archivedRecord.date) : dateStr}</Text>

            {/* Signal chips — provenance receipts shown above the prose so the
                reading doesn't feel like opaque AI output. Hidden on archived
                records (the composition reflects today's date, not theirs). */}
            {!archivedRecord && composition.chips.length > 0 && (
              <View style={styles.chipRow}>
                {composition.chips.map((chip, i) => (
                  <View
                    key={`chip-${i}`}
                    style={[styles.chip, chip.isNew && styles.chipNew]}
                  >
                    {chip.isNew && <Text style={styles.chipNewDot}>✦</Text>}
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.modalSheetContent}>{archivedRecord?.expanded ?? dailyReading}</Text>

            {/* Life-area breakdown — parsed from the Claude response. Renders
                only for today's reading (archived records were generated
                before the structured block existed). */}
            {!archivedRecord && lifeAreas && (
              <View style={styles.lifeAreasSection}>
                <Text style={styles.modalSheetSectionTitle}>TODAY ACROSS YOUR LIFE</Text>
                <LifeAreaRow label="Work" body={lifeAreas.work} accent={Colors.gold} />
                <LifeAreaRow label="Love" body={lifeAreas.love} accent={Colors.rose} />
                <LifeAreaRow label="Health" body={lifeAreas.health} accent={Colors.emerald} />
                <LifeAreaRow label="Inner" body={lifeAreas.inner} accent={Colors.violet} />
              </View>
            )}

            {/* Provenance footer — single-line origin sentence so users can
                see why the reading lands the way it does. */}
            {!archivedRecord && composition.provenance && (
              <Text style={styles.provenanceLine}>{composition.provenance}</Text>
            )}

            {/* Tomorrow's flavor peek — retention hook. Deterministic from
                tomorrow's signals (lunar event > dasha shift > weekday). */}
            {!archivedRecord && composition.tomorrowPeek && (
              <View style={styles.tomorrowBox}>
                <Text style={styles.tomorrowLabel}>A LOOK AHEAD</Text>
                <Text style={styles.tomorrowText}>{composition.tomorrowPeek}</Text>
              </View>
            )}

            {/* Journal prompts — two reflection questions derived from the
                active dasha and lunar phase. */}
            {!archivedRecord && composition.journalPrompts.length > 0 && (
              <View style={styles.journalSection}>
                <Text style={styles.modalSheetSectionTitle}>SIT WITH THIS</Text>
                {composition.journalPrompts.map((p, i) => (
                  <View key={`jp-${i}`} style={styles.journalRow}>
                    <Text style={styles.journalMark}>·</Text>
                    <Text style={styles.journalText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            <AskGuruButton
              seed={archivedRecord ? `I'm looking back at my cosmic reading from ${formatArchiveDate(archivedRecord.date)}. Help me understand ` : "I just read today's cosmic reading. Help me understand "}
              onClose={() => { setShowReadingModal(false); setArchivedRecord(null); }}
            />
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Affirmation drill-down — explains why today's affirmation lands
          given the panchang (weekday ruler, current nakshatra, paksha)
          and the active mahadasha. Composed deterministically by
          buildAffirmationContext — no API call. */}
      <Modal
        visible={showAffirmationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAffirmationModal(false)}
      >
        <SafeAreaView style={styles.affirmationModalContainer}>
          <View style={styles.affirmationModalHeader}>
            <Text style={styles.affirmationModalTitle}>Today's Affirmation</Text>
            <TouchableOpacity
              onPress={() => setShowAffirmationModal(false)}
              style={styles.affirmationModalClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close affirmation"
              accessibilityRole="button"
            >
              <Text style={styles.affirmationModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
            {panchangLine && (
              <Text style={styles.affirmationModalPanchang}>{panchangLine}</Text>
            )}
            <Text style={styles.affirmationModalQuote}>{dailyAffirmation}</Text>

            <Text style={styles.affirmationModalSectionTitle}>WHY THIS LANDS TODAY</Text>
            <Text style={styles.affirmationModalParagraph}>{affirmationContext.whyToday}</Text>

            {affirmationContext.currentChapter && (
              <>
                <Text style={styles.affirmationModalSectionTitle}>YOUR CURRENT CHAPTER</Text>
                <Text style={styles.affirmationModalParagraph}>{affirmationContext.currentChapter}</Text>
              </>
            )}

            <Text style={styles.affirmationModalSectionTitle}>TOP 3 TO FOCUS ON</Text>
            {dailyFocus.map((line, i) => (
              <View key={`af-focus-${i}`} style={styles.affirmationModalBulletRow}>
                <Text style={styles.affirmationModalBulletNum}>{i + 1}.</Text>
                <Text style={styles.affirmationModalBulletText}>{line}</Text>
              </View>
            ))}

            <AskGuruButton
              seed={`I'm sitting with today's affirmation: "${dailyAffirmation}". Help me understand `}
              onClose={() => setShowAffirmationModal(false)}
            />

            <Text style={styles.affirmationModalFooter}>
              Affirmations rotate daily through a curated set — the words above are today's. Use them as a thought to keep returning to.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Streak milestone celebration — fires once per fresh milestone.
          The streak store guarantees each milestone is surfaced at most
          once, so this modal won't re-appear on a future open at the
          same streak value. */}
      <Modal
        // Defensively gate on milestone ≥ 7. The store only emits values
        // from STREAK_MILESTONES (the smallest being 7), but if a future
        // change adds a smaller milestone without copy support, we'd
        // render an empty body under a "X Day Streak" title.
        visible={milestoneReached !== null && milestoneReached >= 7}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.milestoneSparkle}>✦</Text>
            <Text style={styles.modalTitle}>{milestoneReached ?? ''} Day Streak</Text>
            <Text style={styles.modalBody}>
              {milestoneReached
                ? `You've shown up for ${milestoneReached} days in a row. ${
                    guruBonusForStreak(milestoneReached) > 0
                      ? `As a small thank-you, you've unlocked ${guruBonusForStreak(milestoneReached)} bonus Guru question${guruBonusForStreak(milestoneReached) > 1 ? 's' : ''} per day while you keep this streak going.`
                      : 'A daily ritual is quietly becoming part of how you live. Keep going.'
                  }`
                : ''}
            </Text>
            <TouchableOpacity
              style={styles.modalAccept}
              onPress={() => {
                if (milestoneReached !== null) acknowledgeMilestone(milestoneReached);
                setMilestoneReached(null);
              }}
              accessibilityLabel="Acknowledge milestone and continue"
            >
              <Text style={styles.modalAcceptText}>Keep Going ✦</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* One-time AI disclosure modal. Body is wrapped in a ScrollView
          with maxHeight so the disclosure text (long after the audit
          expansion) doesn't push the "Got It" button off-screen on small
          devices like iPhone SE. */}
      <Modal visible={showAIDisclosure} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>About AI in Naksha</Text>
            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={{ paddingBottom: Spacing.sm }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalBody}>
                Naksha uses <Text style={styles.modalBold}>Claude AI by Anthropic</Text> to generate the narrative content across the app — daily readings, Guru responses, palm and palmistry analysis, compatibility readings, tarot reflections, and the persona / arc / memory summaries that let the Guru remember context across sessions.{'\n\n'}
                <Text style={styles.modalBold}>Your planetary positions and chart calculations</Text> are computed mathematically using classical Vedic ephemeris — not AI.{'\n\n'}
                <Text style={styles.modalBold}>What is sent to Anthropic:</Text> your name, birth date, birth place, computed chart data, Guru questions and recent conversation history, palm photos (when you use palmistry), partner's name + birth details (when you run a compatibility reading), tarot draws + your free-text question, and derived persona / memory summaries.{'\n\n'}
                <Text style={styles.modalBold}>What is NOT sent to AI:</Text> contacts, photos from your library other than the palm photo you choose, location beyond the city you typed at onboarding, or any other personal data.{'\n\n'}
                <Text style={styles.modalBold}>Device identifier:</Text> a random ID is generated on first launch and sent only to our own backend for rate-limiting and abuse prevention. It is never sent to Anthropic or any third party.{'\n\n'}
                <Text style={styles.modalBold}>City geocoding:</Text> the city you type at onboarding is looked up via OpenStreetMap's public Nominatim service to get coordinates for chart math. Nothing else about you is sent there.{'\n\n'}
                The AI draws on classical Vedic texts, Jyotish tradition, and established astrological research — the sources are recognised and valid. Readings are for spiritual reflection only and do not constitute medical, legal, financial, or mental health advice.
              </Text>
            </ScrollView>
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
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{firstName}</Text>
            <Text style={styles.date}>{dateStr}</Text>
            {/* Visible streak badge — shown from day 2 so day-1 users
                aren't pressured by a "1 day streak" reminder. */}
            {currentStreak >= 2 && (
              <View style={styles.streakChipRow}>
                <Text style={styles.streakChipText}>
                  ✦ {currentStreak} day streak
                  {longestStreak > currentStreak ? `  ·  best ${longestStreak}` : ''}
                </Text>
              </View>
            )}
          </View>
          {!isPremium && (
            <TouchableOpacity
              style={styles.premiumBadge}
              onPress={() => router.push('/paywall')}
              accessibilityLabel="Go premium"
              accessibilityRole="button"
            >
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
            Always present, no API call required. The Panchang line is a
            quiet reference above the affirmation: weekday + Moon's
            nakshatra + waxing/waning. Skipped if the API hasn't returned
            yet so the affirmation surface stays unaffected. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S AFFIRMATION</Text>
          <TouchableOpacity
            style={styles.affirmationCard}
            onPress={() => setShowAffirmationModal(true)}
            activeOpacity={0.85}
          >
            {panchangLine && <Text style={styles.panchangContextLine}>{panchangLine}</Text>}
            <Text style={styles.affirmationText}>{dailyAffirmation}</Text>
            <View style={styles.focusDivider} />
            <Text style={styles.focusHeader}>✦ Top 3 to focus on today</Text>
            {dailyFocus.map((line, i) => (
              <Text key={i} style={styles.focusLine}>
                <Text style={styles.focusNum}>{i + 1}.</Text> {line}
              </Text>
            ))}
            <Text style={styles.affirmationTapHint}>Tap to see why this lands today →</Text>
          </TouchableOpacity>
        </View>

        {/* Today's auspicious + inauspicious time windows.
            Renders nothing while loading; tap to see plain-English
            explanation of each window's purpose. */}
        <AuspiciousPeriodsCard birthData={birthData} nowTick={nowTick} />

        {/* Daily tarot card — deterministic per-user-per-day. Tap to flip,
            tap again to see the rich detail modal. Updates the streak
            counter to gently reward daily ritual. */}
        {birthData && (
          <DailyTarotCard
            userKey={`${birthData.dateOfBirth}|${birthData.timeOfBirth}|${birthData.latitude.toFixed(2)},${birthData.longitude.toFixed(2)}`}
            nowTick={nowTick}
          />
        )}

        {/* Daily Reading — preview card, tap to expand. */}
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
                accessibilityLabel={`Open reading from ${formatArchiveDate(rec.date)}, ${rec.themeTag ?? rec.mahadasha + ' chapter'}`}
                accessibilityRole="button"
              >
                <View style={styles.archiveRow}>
                  <Text style={styles.archiveDate}>{formatArchiveDate(rec.date)}</Text>
                  {/* Themed pill if the record was written after themeTag was added,
                      otherwise fall back to the older mahadasha label so legacy
                      records don't show an empty slot. */}
                  <View style={styles.archiveTag}>
                    <Text style={styles.archiveTagText}>{rec.themeTag ?? `${rec.mahadasha} chapter`}</Text>
                  </View>
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

const LifeAreaRow = memo(function LifeAreaRow({ label, body, accent }: { label: string; body: string; accent: string }) {
  return (
    <View style={styles.lifeAreaRow}>
      <View style={[styles.lifeAreaLabelWrap, { borderLeftColor: accent }]}>
        <Text style={[styles.lifeAreaLabel, { color: accent }]}>{label}</Text>
      </View>
      <Text style={styles.lifeAreaBody}>{body}</Text>
    </View>
  );
});

const QuickAction = memo(function QuickAction({ icon, label, color, onPress, locked }: { icon: string; label: string; color: string; onPress: () => void; locked: boolean }) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      accessibilityLabel={locked ? `${label} (premium feature)` : label}
      accessibilityRole="button"
    >
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
  premiumBadge: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  premiumBadgeText: { fontSize: 9, lineHeight: 12, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1, includeFontPadding: false },
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
  affirmationTapHint: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, opacity: 0.85, letterSpacing: 0.5, marginTop: 12, textAlign: 'center' },
  affirmationModalContainer: { flex: 1, backgroundColor: Colors.midnight },
  affirmationModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  affirmationModalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  affirmationModalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  affirmationModalCloseText: { fontSize: 18, color: Colors.muted },
  affirmationModalPanchang: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cormorantItalic, letterSpacing: 0.5, opacity: 0.9, textAlign: 'center', marginBottom: 14 },
  affirmationModalQuote: { fontSize: 22, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 34, textAlign: 'center', marginBottom: Spacing.lg },
  affirmationModalSectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 10 },
  affirmationModalParagraph: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26, marginBottom: 6 },
  affirmationModalBulletRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  affirmationModalBulletNum: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: 1 },
  affirmationModalBulletText: { flex: 1, fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22 },
  affirmationModalFooter: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 20, marginTop: Spacing.lg, opacity: 0.85, textAlign: 'center' },
  // Quiet Panchang context line above the affirmation — small, muted, italic
  // so the affirmation itself remains the visual anchor of the card.
  panchangContextLine: { fontSize: 11, letterSpacing: 0.5, color: Colors.gold, fontFamily: Fonts.cormorantItalic, opacity: 0.7, marginBottom: 6 },
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
  modalSheetActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  // Cap the disclosure body height so on small phones the long text
  // scrolls inside the card and the Accept button stays visible.
  modalBodyScroll: { maxHeight: 480, marginBottom: Spacing.md },
  modalBold: { fontFamily: Fonts.cinzelBold, color: Colors.gold },
  modalAccept: { backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  modalAcceptText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },

  // ─── Signal chips (above prose) ────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.goldDim,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipNew: { borderColor: Colors.gold, backgroundColor: 'rgba(201,168,76,0.22)' },
  chipNewDot: { fontSize: 9, color: Colors.gold },
  chipText: { fontSize: 11, color: Colors.star, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },

  // ─── Life areas (parsed from Claude response) ──────────────────────
  lifeAreasSection: { marginTop: Spacing.lg },
  modalSheetSectionTitle: {
    fontSize: 11, letterSpacing: 2, color: Colors.gold,
    fontFamily: Fonts.cinzel, marginBottom: 12,
  },
  lifeAreaRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  lifeAreaLabelWrap: {
    borderLeftWidth: 2, paddingLeft: 8, marginRight: 10,
    minWidth: 64,
  },
  lifeAreaLabel: {
    fontSize: 10, letterSpacing: 1.5, fontFamily: Fonts.cinzel,
    textTransform: 'uppercase',
  },
  lifeAreaBody: {
    flex: 1, fontSize: 14, color: Colors.star,
    fontFamily: Fonts.crimson, lineHeight: 22,
  },

  // ─── Provenance footer ─────────────────────────────────────────────
  provenanceLine: {
    fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic,
    lineHeight: 18, marginTop: Spacing.lg, opacity: 0.85,
  },

  // ─── Tomorrow's flavor peek ────────────────────────────────────────
  tomorrowBox: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.md, padding: 12,
  },
  tomorrowLabel: {
    fontSize: 10, letterSpacing: 2, color: Colors.gold,
    fontFamily: Fonts.cinzel, marginBottom: 6,
  },
  tomorrowText: {
    fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 21,
  },

  // ─── Journal prompts ───────────────────────────────────────────────
  journalSection: { marginTop: Spacing.lg },
  journalRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  journalMark: {
    fontSize: 18, color: Colors.gold, fontFamily: Fonts.cinzel,
    lineHeight: 22, marginTop: -2,
  },
  journalText: {
    flex: 1, fontSize: 14, color: Colors.star,
    fontFamily: Fonts.cormorantItalic, lineHeight: 22,
  },

  // ─── Streak badge + milestone ──────────────────────────────────────
  streakChipRow: {
    flexDirection: 'row', alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: Colors.goldDim,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  streakChipText: {
    fontSize: 10, letterSpacing: 0.8, color: Colors.gold,
    fontFamily: Fonts.cinzel, textTransform: 'uppercase',
  },
  milestoneSparkle: {
    fontSize: 36, color: Colors.gold, textAlign: 'center', marginBottom: Spacing.sm,
  },

  // ─── Archive theme tag pill ────────────────────────────────────────
  archiveTag: {
    backgroundColor: Colors.goldDim,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  archiveTagText: {
    fontSize: 9, letterSpacing: 0.8, color: Colors.gold,
    fontFamily: Fonts.cinzel, textTransform: 'uppercase',
  },
});
