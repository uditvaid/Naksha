import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { restorePurchases, isPremiumActive } from '@services/revenuecat';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { PLANETS } from '@constants/astrology';

export default function ProfileScreen() {
  const user = useAppStore(s => s.user);
  const setUser = useAppStore(s => s.setUser);
  const setPremium = useAppStore(s => s.setPremium);
  const reset = useAppStore(s => s.reset);

  const [notifications, setNotifications] = useState(user.notificationsEnabled);

  const birthData = user.birthData;
  const chart = user.chart;
  const activeDasha = chart?.dashas?.find(d => d.isActive);
  const moonPlanet = chart?.planets?.find(p => p.planet === 'Moon');

  const toggleNotifications = (val: boolean) => {
    setNotifications(val);
    setUser({ notificationsEnabled: val });
  };

  const handleRestorePurchases = async () => {
    const info = await restorePurchases();
    if (info && isPremiumActive(info)) {
      setPremium(true, info.latestExpirationDate ?? undefined);
      Alert.alert('Restored!', 'Your premium access has been restored.');
    } else {
      Alert.alert('No Purchases Found', 'No active premium subscriptions found for this account.');
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
              <DetailRow label="Date of Birth" value={new Date(birthData.dateOfBirth).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} />
              <DetailRow label="Time of Birth" value={birthData.timeOfBirth || 'Not set'} />
              <DetailRow label="Place of Birth" value={birthData.placeOfBirth || 'Not set'} />
              {chart?.lagna && <DetailRow label="Lagna" value={`${chart.lagna} (Ascendant)`} />}
              {activeDasha && <DetailRow label="Active Dasha" value={`${activeDasha.planet} Mahadasha`} last />}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/onboarding')}>
              <Text style={styles.editBtnText}>Edit Birth Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chart snapshot */}
        {chart && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHART SNAPSHOT</Text>
            <View style={styles.planetMiniGrid}>
              {chart.planets.slice(0, 6).map(p => {
                const pd = PLANETS.find(pl => pl.id === p.planet.toLowerCase());
                return (
                  <View key={p.planet} style={styles.planetMiniCard}>
                    <Text style={[styles.planetMiniSymbol, { color: pd?.color ?? Colors.gold }]}>{pd?.symbol ?? '◉'}</Text>
                    <Text style={styles.planetMiniName}>{p.planet}</Text>
                    <Text style={styles.planetMiniSign}>{p.sign}</Text>
                    <Text style={styles.planetMiniHouse}>H{p.house}</Text>
                  </View>
                );
              })}
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
                <View>
                  <Text style={styles.savedChartName}>{chart.name}</Text>
                  <Text style={styles.savedChartRel}>{chart.relation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Daily Cosmic Alerts</Text>
                <Text style={styles.settingDesc}>Personalized planetary notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.card, true: Colors.goldDim }}
                thumbColor={notifications ? Colors.gold : Colors.muted}
              />
            </View>
          </View>
        </View>

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
            <TouchableOpacity style={styles.accountRow} onPress={handleRestorePurchases}>
              <Text style={styles.accountRowText}>Restore Purchases</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={() => Alert.alert('Privacy Policy', 'Visit nakshatra.app/privacy')}>
              <Text style={styles.accountRowText}>Privacy Policy</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountRow} onPress={() => Alert.alert('Terms of Service', 'Visit nakshatra.app/terms')}>
              <Text style={styles.accountRowText}>Terms of Service</Text>
              <Text style={styles.accountRowArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.accountRow, styles.accountRowDanger]} onPress={handleReset}>
              <Text style={[styles.accountRowText, { color: Colors.ruby }]}>Reset Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Nakshatra v1.0.0 · Made with ॐ</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
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
  premiumTag: { alignSelf: 'flex-start', backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  premiumTagText: { fontSize: 9, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 1 },
  upgradeTag: { alignSelf: 'flex-start' },
  upgradeTagText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10 },
  detailsCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  detailLabel: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cinzel, flex: 1 },
  detailValue: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, flex: 2, textAlign: 'right' },
  editBtn: { marginTop: 8, alignSelf: 'flex-end' },
  editBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  planetMiniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planetMiniCard: { width: '30%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 3 },
  planetMiniSymbol: { fontSize: 18 },
  planetMiniName: { fontSize: 10, fontFamily: Fonts.cinzel, color: Colors.muted, letterSpacing: 0.5 },
  planetMiniSign: { fontSize: 11, fontFamily: Fonts.crimson, color: Colors.star },
  planetMiniHouse: { fontSize: 9, color: Colors.gold, fontFamily: Fonts.cinzel },
  savedChartCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  savedChartAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  savedChartAvatarText: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold },
  savedChartName: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  savedChartRel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  settingsCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  settingDesc: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson, marginTop: 2 },
  accountList: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  accountRowDanger: { borderBottomWidth: 0 },
  accountRowText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  accountRowArrow: { fontSize: 16, color: Colors.muted },
  version: { textAlign: 'center', fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginBottom: 8 },
});
