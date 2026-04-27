import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore, onAppReset } from '@store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { getDailyReading } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { PLANETS_BY_ID } from '@constants/astrology';

// Module-level cache survives tab unmounts — avoids refetching every time user navigates back.
// Keyed on (date, userKey) so a profile reset / re-onboard invalidates the previous user's reading.
let _dailyReadingCache: { date: string; userKey: string; text: string } | null = null;

function userCacheKey(birthData: { name: string; dateOfBirth: string } | null): string {
  if (!birthData) return '';
  return `${birthData.name}|${birthData.dateOfBirth}`;
}

// Clear the module-level cache when the user resets/logs out so a re-onboarded user
// does not see the previous user's daily reading until the app restarts.
onAppReset(() => { _dailyReadingCache = null; });

export default function HomeScreen() {
  const { birthData, chart, isPremium } = useAppStore(useShallow(s => ({
    birthData: s.user.birthData,
    chart: s.user.chart,
    isPremium: s.user.isPremium,
  })));
  const initialKey = userCacheKey(birthData);
  const [dailyReading, setDailyReading] = useState(
    _dailyReadingCache?.date === new Date().toDateString() && _dailyReadingCache?.userKey === initialKey
      ? _dailyReadingCache.text
      : ''
  );
  const [loadingReading, setLoadingReading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const name = birthData?.name ?? 'Seeker';
  const firstName = name.split(' ')[0] ?? name;

  const chartPlanets = chart?.planets;
  const chartDashas = chart?.dashas;
  const chartDerived = useMemo(() => {
    const planets = chartPlanets ?? [];
    return {
      planets,
      moon: planets.find(p => p.planet === 'Moon'),
      sun: planets.find(p => p.planet === 'Sun'),
      activeDasha: chartDashas?.find(d => d.isActive),
    };
  }, [chartPlanets, chartDashas]);
  const { planets, moon, sun, activeDasha } = chartDerived;

  const { dateStr, greeting } = useMemo(() => {
    const t = new Date();
    const h = t.getHours();
    return {
      dateStr: t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      greeting: h < 12 ? 'Suprabhat' : h < 17 ? 'Namaskar' : 'Shubh Sandhya',
    };
  }, []);

  const fetchDailyReading = useCallback(async (force = false) => {
    if (!birthData) return;
    if (!isPremium) return; // Daily reading is a premium feature
    const todayKey = new Date().toDateString();
    const key = userCacheKey(birthData);
    if (!force && _dailyReadingCache?.date === todayKey && _dailyReadingCache?.userKey === key) return;
    setLoadingReading(true);
    try {
      const reading = await getDailyReading(birthData, chart);
      setDailyReading(reading);
      _dailyReadingCache = { date: todayKey, userKey: key, text: reading };
    } catch (e: any) {
      setDailyReading(`Unable to get reading: ${e?.message ?? 'Please try again shortly.'}`);
    } finally {
      setLoadingReading(false);
    }
  }, [birthData, chart, isPremium]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDailyReading(true);
    setRefreshing(false);
  };

  useEffect(() => { fetchDailyReading(); }, [fetchDailyReading]);

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Daily Reading — premium-only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S COSMIC READING</Text>
          <View style={styles.readingCard}>
            {!isPremium ? (
              <>
                <Text style={styles.readingLocked}>
                  Your personalised daily cosmic reading — calibrated to your chart and today's planetary energies — is part of Premium.
                </Text>
                <TouchableOpacity style={styles.readingUnlockBtn} onPress={() => router.push('/paywall')}>
                  <Text style={styles.readingUnlockBtnText}>✦ Unlock with Premium</Text>
                </TouchableOpacity>
              </>
            ) : loadingReading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.gold} size="small" />
                <Text style={styles.loadingText}>Reading the stars…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.readingText}>
                  {dailyReading || (birthData ? 'Tap refresh to receive your daily cosmic reading.' : 'Complete your birth details to unlock your daily reading.')}
                </Text>
                {birthData && (
                  <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDailyReading(true)}>
                    <Text style={styles.refreshBtnText}>↻ Refresh Reading</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Planet Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLANETARY POSITIONS</Text>
          {planets.map((p) => {
            const planetData = PLANETS_BY_ID.get(p.planet.toLowerCase());
            return (
              <View key={p.planet} style={styles.planetRow}>
                <View style={[styles.planetDot, { backgroundColor: (planetData?.color ?? Colors.gold) + '33' }]}>
                  <Text style={[styles.planetSymbol, { color: planetData?.color ?? Colors.gold }]}>
                    {planetData?.symbol ?? p.planet[0]}
                  </Text>
                </View>
                <View style={styles.planetInfo}>
                  <Text style={styles.planetName}>{p.planet} {p.isRetrograde ? '℞' : ''}</Text>
                  <Text style={styles.planetPos}>{p.sign} · House {p.house}</Text>
                </View>
                <View style={styles.planetRight}>
                  <Text style={styles.nakshatra}>{p.nakshatra}</Text>
                  <Text style={styles.pada}>Pada {p.pada}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
          <View style={styles.quickGrid}>
            <QuickAction icon="🖐" label="Palm Reading" color="#E8C96A" onPress={() => isPremium ? router.push('/features/palm') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="∑" label="Numerology" color="#A78BFA" onPress={() => isPremium ? router.push('/features/numerology') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="☯" label="Chinese Chart" color="#F87171" onPress={() => isPremium ? router.push('/features/chinese') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="📖" label="Lal Kitab" color="#34D399" onPress={() => isPremium ? router.push('/features/lalkitab') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="♡" label="Compatibility" color="#FB7185" onPress={() => isPremium ? router.push('/features/compatibility') : router.push('/paywall')} locked={!isPremium} />
            <QuickAction icon="🔱" label="Ask Guru" color="#E8C96A" onPress={() => router.push('/(tabs)/guru')} locked={false} />
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { color: Colors.muted, fontFamily: Fonts.cormorantItalic, fontSize: 14 },
  readingText: { fontSize: 15, lineHeight: 24, color: Colors.star, fontFamily: Fonts.crimson },
  refreshBtn: { marginTop: 12, alignSelf: 'flex-end' },
  refreshBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel },
  readingLocked: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 24, marginBottom: 12 },
  readingUnlockBtn: { alignSelf: 'flex-start', backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  readingUnlockBtnText: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1 },
  planetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 6 },
  planetDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  planetSymbol: { fontSize: 16 },
  planetInfo: { flex: 1 },
  planetName: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star },
  planetPos: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  planetRight: { alignItems: 'flex-end' },
  nakshatra: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cormorantItalic },
  pada: { fontSize: 10, color: Colors.muted, marginTop: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '30%', aspectRatio: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { fontSize: 26 },
  quickLabel: { fontSize: 9, fontFamily: Fonts.cinzel, letterSpacing: 0.5, textAlign: 'center' },
  lockBadge: { position: 'absolute', top: 6, right: 8, fontSize: 8, color: Colors.gold },
});
