import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { getOfferings, purchasePackage, restorePurchases, isPremiumActive, PRICING, PREMIUM_FEATURES } from '@services/revenuecat';
import { useAppStore } from '@store/userStore';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import type { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const setPremium = useAppStore(s => s.setPremium);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual' | 'lifetime'>('annual');

  useEffect(() => {
    getOfferings().then((pkgs) => {
      setPackages(pkgs);
      const yearly = pkgs.find(p => p.identifier.includes('yearly') || p.identifier.includes('annual'));
      if (yearly) setSelectedPkg(yearly);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPkg) {
      // Demo mode — just grant premium
      setPremium(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      return;
    }

    setPurchasing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const info = await purchasePackage(selectedPkg);
      if (info && isPremiumActive(info)) {
        setPremium(true, info.latestExpirationDate ?? undefined);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (e) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const info = await restorePurchases();
    if (info && isPremiumActive(info)) {
      setPremium(true, info.latestExpirationDate ?? undefined);
      Alert.alert('Restored!', 'Your premium access has been restored.');
      router.back();
    } else {
      Alert.alert('No Purchases Found', 'No active subscriptions were found for this account.');
    }
    setPurchasing(false);
  };

  const tiers = [
    { key: 'monthly', ...PRICING.monthly },
    { key: 'annual', ...PRICING.annual },
    { key: 'lifetime', ...PRICING.lifetime },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>✦</Text>
          <Text style={styles.heroTitle}>Naksha Premium</Text>
          <Text style={styles.heroSub}>
            Unlock your complete cosmic blueprint — all systems, all insights, unlimited guidance.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Tier Selection */}
        <View style={styles.tiersSection}>
          {tiers.map((tier) => (
            <TouchableOpacity
              key={tier.key}
              style={[styles.tierCard, selectedTier === tier.key && styles.tierCardSelected]}
              onPress={() => {
                setSelectedTier(tier.key);
                const id = tier.key === 'annual' ? 'yearly' : tier.key;
                const pkg = packages.find(p => p.identifier.includes(id));
                if (pkg) setSelectedPkg(pkg);
              }}
            >
              <View style={styles.tierLeft}>
                <Text style={[styles.tierLabel, selectedTier === tier.key && styles.tierLabelSelected]} numberOfLines={1}>
                  {tier.label}
                </Text>
                {'savings' in tier && tier.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>{tier.savings}</Text>
                  </View>
                )}
              </View>
              <View style={styles.tierRight}>
                <Text style={[styles.tierPrice, selectedTier === tier.key && styles.tierPriceSelected]}>
                  {tier.price}
                </Text>
                <Text style={styles.tierPeriod}>/{tier.period}</Text>
              </View>
              {selectedTier === tier.key && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <LinearGradient
              colors={['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.purchaseBtnGradient}
            >
              {purchasing ? (
                <ActivityIndicator color={Colors.midnight} />
              ) : (
                <Text style={styles.purchaseBtnText}>Begin Your Journey ✦</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Subscriptions auto-renew until cancelled. Cancel anytime in App Store Settings. By purchasing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  closeBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: Colors.muted },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl },
  heroIcon: { fontSize: 36, color: Colors.gold, marginBottom: Spacing.sm },
  heroTitle: { fontSize: 28, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: Spacing.sm, textAlign: 'center' },
  heroSub: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.cormorant, textAlign: 'center', lineHeight: 22 },
  featuresSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  featureIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  featureText: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, flex: 1 },
  tiersSection: { paddingHorizontal: Spacing.md, gap: 10, marginBottom: Spacing.lg },
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 16, position: 'relative' },
  tierCardSelected: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  tierLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierLabel: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.muted },
  tierLabelSelected: { color: Colors.gold },
  savingsBadge: { backgroundColor: Colors.emerald + '33', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  savingsBadgeText: { fontSize: 10, color: Colors.emerald, fontFamily: Fonts.cinzel },
  tierRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  tierPrice: { fontSize: 20, fontFamily: Fonts.cinzel, color: Colors.muted },
  tierPriceSelected: { color: Colors.star },
  tierPeriod: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson },
  checkmark: { position: 'absolute', right: 14, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { fontSize: 11, color: Colors.midnight, fontFamily: Fonts.cinzelBold },
  ctaSection: { paddingHorizontal: Spacing.md },
  purchaseBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.sm },
  purchaseBtnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  purchaseBtnText: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreBtnText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  legal: { fontSize: 10, color: Colors.mutedDark, textAlign: 'center', lineHeight: 15, marginTop: Spacing.sm, fontFamily: Fonts.crimson },
});
