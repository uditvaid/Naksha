import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { getOfferings, purchasePackage, restorePurchases, isPremiumActive, PRICING, PREMIUM_FEATURES } from '@services/revenuecat';
import { useAppStore } from '@store/userStore';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import type { PurchasesPackage } from 'react-native-purchases';

type Tier = 'threeMonth' | 'annual' | 'lifetime';

function findPackageForTier(
  pkgs: PurchasesPackage[],
  tier: Tier,
): PurchasesPackage | undefined {
  if (tier === 'threeMonth') {
    return pkgs.find(p =>
      p.packageType === 'THREE_MONTH' ||
      p.identifier.toLowerCase().includes('3month') ||
      p.identifier.toLowerCase().includes('three_month') ||
      p.identifier.toLowerCase().includes('threemonth') ||
      p.identifier.toLowerCase().includes('quarterly')
    );
  }
  if (tier === 'annual') {
    return pkgs.find(p =>
      p.packageType === 'ANNUAL' ||
      p.identifier.toLowerCase().includes('annual') ||
      p.identifier.toLowerCase().includes('yearly')
    );
  }
  return pkgs.find(p =>
    p.packageType === 'LIFETIME' ||
    p.identifier.toLowerCase().includes('lifetime')
  );
}

export default function PaywallScreen() {
  const setPremium = useAppStore(s => s.setPremium);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>('annual');

  useEffect(() => {
    let mounted = true;
    getOfferings().then((pkgs) => {
      if (!mounted) return;
      setPackages(pkgs);
      const yearly = pkgs.find(p =>
        p.packageType === 'ANNUAL' ||
        p.identifier.toLowerCase().includes('annual') ||
        p.identifier.toLowerCase().includes('yearly')
      );
      setSelectedPkg(yearly ?? pkgs[0] ?? null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handlePurchase = async () => {
    if (!selectedPkg) {
      Alert.alert(
        'Unable to Connect',
        'Could not connect to the App Store. Please check your internet connection and try again.',
      );
      return;
    }

    setPurchasing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(selectedPkg);
      if (result.status === 'success' && isPremiumActive(result.customerInfo)) {
        setPremium(true, result.customerInfo.latestExpirationDate ?? undefined);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else if (result.status === 'success') {
        // Purchase succeeded but the entitlement isn't reflected — likely a server-side delay.
        Alert.alert(
          'Almost There',
          'Your purchase went through but we couldn\'t verify your premium access yet. Please tap "Restore Purchases" in a moment.',
        );
      } else if (result.status === 'error') {
        Alert.alert('Purchase Failed', result.message);
      }
      // result.status === 'cancelled' → user backed out; no alert needed.
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const info = await restorePurchases();
      if (isPremiumActive(info)) {
        setPremium(true, info.latestExpirationDate ?? undefined);
        Alert.alert('Restored!', 'Your premium access has been restored.');
        router.back();
      } else {
        Alert.alert('No Purchases Found', 'No active subscriptions were found for this account.');
      }
    } catch {
      Alert.alert(
        'Restore Failed',
        'We couldn\'t reach the App Store. Please check your connection and try again.',
      );
    } finally {
      setPurchasing(false);
    }
  };

  // Only show tiers that have a matching RevenueCat package. If we render a
  // tier without a backing package, tapping the card silently keeps the
  // previously-selected (different) package and the user pays the wrong
  // amount. This guard makes the UI honest while a new product is mid-rollout.
  const tiers = useMemo(() => {
    const all = [
      { key: 'threeMonth' as const, ...PRICING.threeMonth },
      { key: 'annual' as const, ...PRICING.annual },
      { key: 'lifetime' as const, ...PRICING.lifetime },
    ];
    return all.filter(t => findPackageForTier(packages, t.key) !== undefined);
  }, [packages]);

  // If the currently-selected tier got filtered out (e.g. RevenueCat is mid-
  // rollout and removed a product), fall back to the first available tier
  // so the highlighted card always matches selectedPkg.
  useEffect(() => {
    if (tiers.length > 0 && !tiers.some(t => t.key === selectedTier)) {
      const fallback = tiers[0]!;
      setSelectedTier(fallback.key);
      const pkg = findPackageForTier(packages, fallback.key);
      if (pkg) setSelectedPkg(pkg);
    }
  }, [tiers, selectedTier, packages]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={{ fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 1 }}>
            Loading…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // No packages at all → App Store unreachable.
  // Packages exist but none match our 3 known tiers (3-month / annual /
  // lifetime) → offering misconfigured server-side. Either way, bail to the
  // unavailable screen rather than render a Subscribe button with no cards.
  if (!loading && (packages.length === 0 || tiers.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 }}>
          <Text style={{ fontSize: 36, color: Colors.gold }}>✦</Text>
          <Text style={{ fontSize: 18, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center' }}>
            Subscriptions Unavailable
          </Text>
          <Text style={{ fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22 }}>
            We couldn't reach the App Store to load subscription options. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.purchaseBtn} onPress={() => router.back()}>
            <LinearGradient
              colors={['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.purchaseBtnGradient, { paddingHorizontal: 40 }]}
            >
              <Text style={styles.purchaseBtnText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
          {/* Restore is critical here: a user with an active subscription
              whose offerings fetch failed (e.g. App Store unreachable but
              their receipt is local) otherwise has no recovery path other
              than Profile-tab restore. Required by App Store Guideline
              3.1.1 — Restore must always be reachable. */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={purchasing}
            style={[styles.restoreBtn, { marginTop: 8 }]}
            accessibilityLabel="Restore previous purchases"
            accessibilityRole="button"
            accessibilityState={{ disabled: purchasing, busy: purchasing }}
          >
            <Text style={styles.restoreBtnText}>
              {purchasing ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
                const pkg = findPackageForTier(packages, tier.key);
                if (pkg) setSelectedPkg(pkg);
              }}
            >
              <View style={styles.tierLeft}>
                <Text style={[styles.tierLabel, selectedTier === tier.key && styles.tierLabelSelected]} numberOfLines={1}>
                  {tier.label}
                </Text>
                {(() => {
                  if (tier.key === 'annual') {
                    // Annual savings vs paying every 3 months for a year (4 cycles).
                    const threePkg = findPackageForTier(packages, 'threeMonth');
                    const annualPkg = findPackageForTier(packages, 'annual');
                    const threePrice = threePkg?.product?.price;
                    const annualPrice = annualPkg?.product?.price;
                    if (threePrice && annualPrice && threePrice > 0) {
                      const pct = Math.round(((threePrice * 4 - annualPrice) / (threePrice * 4)) * 100);
                      if (pct > 0) return (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsBadgeText}>Save {pct}%</Text>
                        </View>
                      );
                    }
                  }
                  if (tier.key === 'lifetime' && 'savings' in tier && tier.savings) {
                    return (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>{tier.savings}</Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
              <View style={styles.tierRight}>
                <Text style={[styles.tierPrice, selectedTier === tier.key && styles.tierPriceSelected]}>
                  {findPackageForTier(packages, tier.key)?.product?.priceString ?? tier.price}
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
            Payment will be charged to your Apple ID account at confirmation of purchase.{' '}
            <Text style={styles.legalBold}>The 3-month plan auto-renews every 3 months</Text> at the price shown above.{' '}
            <Text style={styles.legalBold}>The annual plan auto-renews every 12 months</Text> at the price shown above. Auto-renewal can be turned off at any time by going to your Apple ID Account Settings — cancellation must be made at least 24 hours before the end of the current period to avoid being charged for the next.{' '}
            <Text style={styles.legalBold}>Lifetime is a one-time purchase and does not auto-renew.</Text>
            {' '}By purchasing you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/legal/terms')}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>.
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
  legalBold: { color: Colors.muted, fontFamily: Fonts.crimson },
  legalLink: { color: Colors.gold, textDecorationLine: 'underline' },
});
