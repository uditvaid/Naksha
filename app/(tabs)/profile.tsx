import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAppStore } from '@store/userStore';
import { restorePurchases, isPremiumActive } from '@services/revenuecat';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { TEST_MODE, BUILD_PROFILE, PROXY_BASE_URL, REVENUECAT_IOS_KEY } from '@constants/config';
import { fontScaleValue, fontScaleOption, type FontScaleOption } from '@services/textScale';
import { getDailyReading } from '@services/claude';
import { generateChart } from '@services/prokerala';
import { findActiveDasha } from '@utils/vedic';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const user = useAppStore(s => s.user);
  const setPremium = useAppStore(s => s.setPremium);
  const setChart = useAppStore(s => s.setChart);
  const setUser = useAppStore(s => s.setUser);
  const reset = useAppStore(s => s.reset);
  const currentFontOption: FontScaleOption = fontScaleOption(user.fontScale ?? 1);

  // Notification time picker state — `pickerTime` is the spinner's
  // in-flight value, copied to the store only on Confirm to avoid
  // iOS spinner's spurious onChange-on-mount clobbering the saved time.
  const notifHour = user.notificationHour ?? 8;
  const notifMinute = user.notificationMinute ?? 0;
  const initialTime = (() => {
    const d = new Date();
    d.setHours(notifHour, notifMinute, 0, 0);
    return d;
  })();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [pickerTime, setPickerTime] = useState<Date>(initialTime);

  const fontSizeLabel: string = currentFontOption === 'default' ? 'Default' : currentFontOption === 'large' ? 'Large' : 'Extra Large';

  const formatNotifTime = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const birthData = user.birthData;
  const chart = user.chart;
  const activeDasha = findActiveDasha(chart?.dashas);
  const moonPlanet = chart?.planets?.find(p => p.planet === 'Moon');

  const handleRestorePurchases = async () => {
    try {
      const info = await restorePurchases();
      if (info && isPremiumActive(info)) {
        setPremium(true, info.latestExpirationDate ?? undefined);
        Alert.alert('Restored!', 'Your premium access has been restored.');
      } else {
        Alert.alert('No Purchases Found', 'No active premium subscriptions found for this account.');
      }
    } catch {
      Alert.alert(
        'Restore Failed',
        'We couldn\'t reach the App Store to restore your purchases. Please check your connection and try again.',
      );
    }
  };

  const handleRegenerateChart = async () => {
    if (!birthData) return;
    setRegenerating(true);
    try {
      const newChart = await generateChart(birthData);
      setChart(newChart);
      Alert.alert('Chart Updated', 'Your birth chart has been recalculated from your saved birth data.');
    } catch {
      Alert.alert('Recalculation Failed', 'Could not reach the astrology server. Please check your connection and try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Profile',
      'This will clear all your birth data and chart. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { reset(); router.replace('/onboarding'); } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.subtitle}>Birth data · Settings · Subscription</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{birthData?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
            {user.isPremium && (
              <View style={styles.premiumRing} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{birthData?.name ?? 'Cosmic Seeker'}</Text>
            <Text style={styles.profileSign}>{chart?.lagna ?? '—'} Rising · {moonPlanet?.sign ?? '—'} Moon</Text>
            <Text style={styles.profileSign}>{user.savedReadings?.length ?? 0} saved reading{(user.savedReadings?.length ?? 0) !== 1 ? 's' : ''}</Text>
            {user.isPremium ? (
              <View style={styles.premiumTag}>
                <Text style={styles.premiumTagText}>✦ PREMIUM</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.upgradeTag} onPress={() => router.push('/paywall')}>
                <Text style={styles.upgradeTagText}>Upgrade to Premium →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Birth details */}
        {birthData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIRTH DETAILS</Text>
            <View style={styles.detailsCard}>
              <DetailRow label="Name" value={birthData.name} />
              <DetailRow label="Date of Birth" value={new Date(birthData.dateOfBirth).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone: 'UTC' })} />
              <DetailRow label="Time of Birth" value={birthData.timeOfBirth || 'Not set'} />
              <DetailRow label="Place of Birth" value={birthData.placeOfBirth || 'Not set'} />
              {chart?.lagna && <DetailRow label="Lagna" value={`${chart.lagna} (Ascendant)`} />}
              {activeDasha && <DetailRow label="Active Dasha" value={`${activeDasha.planet} Mahadasha`} last />}
            </View>
            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/onboarding')}>
                <Text style={styles.editBtnText}>Edit Birth Data</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={handleRegenerateChart} disabled={regenerating}>
                {regenerating
                  ? <ActivityIndicator size="small" color={Colors.gold} />
                  : <Text style={styles.editBtnText}>Regenerate Chart</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Saved Charts */}
        {user.savedCharts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SAVED CHARTS</Text>
            {user.savedCharts.map(chart => (
              <View key={chart.id} style={styles.savedChartCard}>
                <View style={styles.savedChartAvatar}>
                  <Text style={styles.savedChartAvatarText}>{chart.name[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedChartName} numberOfLines={1}>{chart.name}</Text>
                  <Text style={styles.savedChartRel} numberOfLines={1}>{chart.relation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.accountList}>
            <TouchableOpacity style={styles.accountRow} onPress={() => router.push('/features/savedreadings')}>
              <Text style={styles.accountRowText}>✦ My Saved Readings</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            {!user.isPremium && (
              <TouchableOpacity style={styles.accountRow} onPress={() => router.push('/paywall')}>
                <Text style={[styles.accountRowText, { color: Colors.gold }]}>✦ Upgrade to Premium</Text>
                <Text style={styles.accountRowArrow}>→</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={() => {
                // Re-seed the picker from the persisted time each open so
                // the spinner reflects the saved value, not stale state.
                const seed = new Date();
                seed.setHours(notifHour, notifMinute, 0, 0);
                setPickerTime(seed);
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.accountRowText}>Daily Affirmation Time</Text>
              <Text style={styles.accountRowValue}>{formatNotifTime(notifHour, notifMinute)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={() => setShowFontSizeModal(true)}>
              <Text style={styles.accountRowText}>Text Size</Text>
              <Text style={styles.accountRowValue}>{fontSizeLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={handleRestorePurchases}>
              <Text style={styles.accountRowText}>Restore Purchases</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={() => router.push('/legal/privacy')}>
              <Text style={styles.accountRowText}>Privacy Policy</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={() => router.push('/legal/terms')}>
              <Text style={styles.accountRowText}>Terms of Service</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.accountRow, styles.accountRowDanger]} onPress={handleReset}>
              <Text style={[styles.accountRowText, { color: Colors.ruby }]}>Reset Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {TEST_MODE && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠ TESTING · {BUILD_PROFILE.toUpperCase()} BUILD</Text>
            <View style={styles.accountList}>
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => setPremium(!user.isPremium, undefined)}
              >
                <Text style={[styles.accountRowText, { color: Colors.amber }]}>
                  {user.isPremium ? '↓ Disable Premium (Test)' : '↑ Enable Premium (Test)'}
                </Text>
                <Text style={styles.accountRowArrow}>↔</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.accountRow}
                onPress={async () => {
                  setTestingConnection(true);
                  setConnectionResult(null);
                  try {
                    if (!user.birthData) throw new Error('No birth data — complete onboarding first');
                    await getDailyReading(user.birthData, user.chart);
                    setConnectionResult('Claude API: Connected successfully');
                  } catch (e: any) {
                    setConnectionResult(`Claude API error: ${e?.message ?? 'Unknown error'}`);
                  } finally {
                    setTestingConnection(false);
                  }
                }}
                disabled={testingConnection}
              >
                <Text style={[styles.accountRowText, { color: Colors.sapphire ?? Colors.gold }]}>
                  Test Claude Connection
                </Text>
                {testingConnection
                  ? <ActivityIndicator size="small" color={Colors.gold} />
                  : <Text style={styles.accountRowArrow}>▶</Text>}
              </TouchableOpacity>
            </View>

            {/* API key presence diagnostics */}
            <View style={styles.diagBox}>
              <Text style={styles.diagTitle}>API KEYS IN THIS BUILD</Text>
              <Text style={[styles.diagRow, { color: PROXY_BASE_URL ? Colors.emerald ?? '#34D399' : Colors.ruby }]}>
                Proxy: {PROXY_BASE_URL ? '✓ Present' : '✗ MISSING'}
              </Text>
              <Text style={[styles.diagRow, { color: REVENUECAT_IOS_KEY ? Colors.emerald ?? '#34D399' : Colors.ruby }]}>
                RevenueCat: {REVENUECAT_IOS_KEY ? '✓ Present' : '✗ MISSING'}
              </Text>
              {connectionResult && (
                <Text style={[styles.diagRow, {
                  color: connectionResult.includes('error') ? Colors.ruby : Colors.emerald ?? '#34D399',
                  marginTop: 6,
                }]}>
                  {connectionResult}
                </Text>
              )}
            </View>

            <Text style={styles.testNote}>
              This toggle only exists in non-production builds so features can be exercised
              without a working App Store IAP configuration. It will not ship to the App Store.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={() => {
            // Developer toggle is only available in non-production (TEST_MODE) builds.
            // Long-pressing the version label in production is a no-op.
            if (!TEST_MODE) return;
            Alert.alert(
              'Developer Options',
              `Premium: ${user.isPremium ? 'ON' : 'OFF'}\nBuild: ${BUILD_PROFILE}`,
              [
                {
                  text: user.isPremium ? 'Disable Premium' : 'Enable Premium',
                  onPress: () => setPremium(!user.isPremium, undefined),
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
          activeOpacity={1}
        >
          <Text style={styles.version}>Naksha v{appVersion} · Made with ॐ</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Daily affirmation time picker — modal sheet from below.
          The reschedule effect in app/_layout.tsx picks up changes to
          notificationHour/Minute immediately. */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.settingModalOverlay}>
          <View style={styles.settingModalCard}>
            <Text style={styles.settingModalTitle}>Daily Affirmation Time</Text>
            <Text style={styles.settingModalSub}>When you'd like the daily affirmation push notification to arrive each day.</Text>
            <DateTimePicker
              value={pickerTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_evt, picked) => {
                if (Platform.OS === 'android') {
                  setShowTimePicker(false);
                  if (picked) {
                    setUser({ notificationHour: picked.getHours(), notificationMinute: picked.getMinutes() });
                  }
                  return;
                }
                if (picked) setPickerTime(picked);
              }}
              themeVariant="dark"
              textColor={Colors.star}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.settingModalActions}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.settingModalActionBtn}>
                  <Text style={styles.notifPickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setUser({ notificationHour: pickerTime.getHours(), notificationMinute: pickerTime.getMinutes() });
                    setShowTimePicker(false);
                  }}
                  style={styles.settingModalActionBtn}
                >
                  <Text style={styles.notifPickerConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Text size picker — same modal sheet pattern. iOS Dynamic Type
          is respected on top of this in-app override. */}
      <Modal
        visible={showFontSizeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontSizeModal(false)}
      >
        <View style={styles.settingModalOverlay}>
          <View style={styles.settingModalCard}>
            <Text style={styles.settingModalTitle}>Text Size</Text>
            <Text style={styles.settingModalSub}>Text size in the app. iOS Larger Text (Settings → Accessibility → Display & Text Size) is also respected on top of this.</Text>
            <View style={styles.fontScaleRow}>
              {(['default', 'large', 'xlarge'] as FontScaleOption[]).map((opt) => {
                const active = currentFontOption === opt;
                const label = opt === 'default' ? 'Default' : opt === 'large' ? 'Large' : 'Extra Large';
                const sample = opt === 'default' ? 14 : opt === 'large' ? 16 : 18;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.fontScaleBtn, active && styles.fontScaleBtnActive]}
                    onPress={() => setUser({ fontScale: fontScaleValue(opt), fontScaleExplicit: true })}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.fontScaleSample, { fontSize: sample }, active && styles.fontScaleSampleActive]}>Aa</Text>
                    <Text style={[styles.fontScaleLabel, active && styles.fontScaleLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setShowFontSizeModal(false)} style={styles.settingModalDone}>
              <Text style={styles.settingModalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  title: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.goldDim, borderWidth: 2, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontFamily: Fonts.cinzel, color: Colors.gold },
  premiumRing: { position: 'absolute', inset: -3, borderRadius: 39, borderWidth: 2, borderColor: Colors.gold },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star },
  profileSign: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  premiumTag: { alignSelf: 'flex-start', backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  premiumTagText: { fontSize: 9, lineHeight: 12, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1, includeFontPadding: false },
  upgradeTag: { alignSelf: 'flex-start' },
  upgradeTagText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10 },
  // Setting modal sheets — used by both Daily Affirmation Time and Text
  // Size pickers. Centered card over a dim overlay (matches the AI
  // disclosure modal pattern in app/(tabs)/index.tsx).
  settingModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  settingModalCard: { width: '100%', backgroundColor: Colors.deepNavy, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  settingModalTitle: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5, marginBottom: 6 },
  settingModalSub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18, marginBottom: 14 },
  settingModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  settingModalActionBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  settingModalDone: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  settingModalDoneText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },
  notifPickerCancel: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },
  notifPickerConfirm: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },
  fontScaleRow: { flexDirection: 'row', gap: 10 },
  fontScaleBtn: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', gap: 4 },
  fontScaleBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  fontScaleSample: { color: Colors.star, fontFamily: Fonts.cinzel },
  fontScaleSampleActive: { color: Colors.gold },
  fontScaleLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 0.5 },
  fontScaleLabelActive: { color: Colors.gold },
  detailsCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  detailLabel: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cinzel, flex: 1 },
  detailValue: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, flex: 2, textAlign: 'right' },
  editBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
  editBtn: { alignSelf: 'flex-end' },
  editBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  savedChartCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  savedChartAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  savedChartAvatarText: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold },
  savedChartName: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  savedChartRel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  accountList: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  accountRowDanger: { borderBottomWidth: 0 },
  accountRowText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star, flex: 1 },
  accountRowArrow: { fontSize: 16, color: Colors.muted },
  accountRowValue: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginBottom: 8 },
  testNote: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, paddingHorizontal: 4, paddingTop: 8, lineHeight: 16 },
  diagBox: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  diagTitle: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  diagRow: { fontSize: 12, fontFamily: Fonts.crimson, lineHeight: 20 },
});
