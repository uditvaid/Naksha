import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Telemetry init MUST run before any other service init so early errors
// (font loading, RevenueCat init, etc.) are captured. The module itself
// is safe to import at any point — initTelemetry() is a no-op when no
// DSN is configured (local dev / builds without the secret).
import { initTelemetry, addBreadcrumb } from '../src/services/telemetry';
initTelemetry();
import { initRevenueCat, getCustomerInfo, isPremiumActive, addCustomerInfoListener } from '../src/services/revenuecat';
import { requestNotificationPermissions, setupAndroidChannel, scheduleDailyInsightNotification } from '../src/services/notifications';
import { useAppStore } from '../src/store/userStore';
// Side-effect import: patches Text.render at module load to honour the
// in-app font-scale preference. Cap iOS Dynamic Type at 1.5x. Must
// import once at app boot so every Text in the tree picks up the patch.
import '../src/services/textScale';
import { findActiveDasha } from '../src/utils/vedic';
import { RootErrorBoundary } from '../src/components/RootErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { assertBootConfig } from '../src/constants/config';
import { useGuruMessageStore } from '../src/store/guruMessageStore';
import { migrateLegacyGuruMessages } from '../src/lib/migrations/guruMessages';

SplashScreen.preventAutoHideAsync();

// Verify required env vars are populated. In dev we throw loudly; in
// production we degrade silently to avoid a hard crash for users who
// happen to launch a misconfigured build (the API calls will simply
// fail and surface their own errors). The throw is caught here so a
// misconfigured local .env doesn't white-screen the dev build before
// RootErrorBoundary has a chance to render — the breadcrumb still
// surfaces the issue in Sentry and the dev console.
try {
  assertBootConfig();
} catch (e) {
  if (__DEV__) {
    console.warn('[boot] assertBootConfig threw:', (e as Error).message);
  }
  addBreadcrumb('assertBootConfig threw', 'lifecycle', { message: (e as Error).message });
}

export default function RootLayout() {
  const setPremium = useAppStore(s => s.setPremium);
  const chart = useAppStore(s => s.user.chart);
  const birthData = useAppStore(s => s.user.birthData);
  const dashas = chart?.dashas;
  // Watch both persist-hydration flags so we can trigger the legacy
  // Guru-message migration once both stores are ready. Selecting the
  // boolean means this only re-renders on the actual transition.
  const userHydrated = useAppStore(s => s._hasHydrated);
  const guruMessagesHydrated = useGuruMessageStore(s => s._hasHydrated);
  // Subscribe to fontScale and key the Stack on it so that changing the
  // in-app font size in Profile triggers a full-tree re-render. The
  // Text.render patch reads the latest scale via getState() inside
  // render, so existing components only pick up the new size after a
  // re-render — keying the root makes that happen instantly.
  const fontScale = useAppStore(s => s.user.fontScale ?? 1);
  // Notification time preference — re-running schedule effect when these
  // change is what makes the Profile time picker feel instant.
  const notifHour = useAppStore(s => s.user.notificationHour ?? 8);
  const notifMinute = useAppStore(s => s.user.notificationMinute ?? 0);
  // Derive active dasha at read time so the daily-insight notification reschedules
  // when the user crosses a mahadasha boundary even without regenerating the chart.
  const activeDashaLord = findActiveDasha(dashas)?.planet;
  const [appReady, setAppReady] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          Cinzel_400Regular: require('@expo-google-fonts/cinzel/400Regular/Cinzel_400Regular.ttf'),
          Cinzel_600SemiBold: require('@expo-google-fonts/cinzel/600SemiBold/Cinzel_600SemiBold.ttf'),
          CormorantGaramond_400Regular: require('@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf'),
          CormorantGaramond_400Regular_Italic: require('@expo-google-fonts/cormorant-garamond/400Regular_Italic/CormorantGaramond_400Regular_Italic.ttf'),
          CrimsonPro_400Regular: require('@expo-google-fonts/crimson-pro/400Regular/CrimsonPro_400Regular.ttf'),
        });

        addBreadcrumb('app boot starting', 'lifecycle');
        // Init RevenueCat — each step is isolated so a failed init still attempts customer lookup
        try {
          await initRevenueCat();
        } catch (e) {
          if (__DEV__) console.warn('RevenueCat init error (non-fatal):', e);
          addBreadcrumb('revenuecat init failed', 'lifecycle', { error: String(e) });
        }
        // Race getCustomerInfo against a 1.5s budget so the splash isn't
        // held by a cold-radio RevenueCat call (it has no internal timeout
        // and can hang 10-18s on flaky networks). If we lose the race the
        // user starts as non-premium; the listener below picks up the
        // actual entitlement when the network call eventually completes,
        // and any premium-gated screen re-renders accordingly.
        const CUSTOMER_INFO_BUDGET_MS = 1500;
        const customerInfo = await Promise.race<Awaited<ReturnType<typeof getCustomerInfo>> | null>([
          getCustomerInfo().catch((e) => {
            if (__DEV__) console.warn('RevenueCat getCustomerInfo error (non-fatal):', e);
            addBreadcrumb('revenuecat customer-info fetch failed', 'lifecycle', { error: String(e) });
            return null;
          }),
          new Promise<null>((resolve) => setTimeout(() => {
            addBreadcrumb('revenuecat customer-info splash budget exceeded', 'lifecycle');
            resolve(null);
          }, CUSTOMER_INFO_BUDGET_MS)),
        ]);
        if (mounted && customerInfo) {
          setPremium(isPremiumActive(customerInfo), customerInfo.latestExpirationDate ?? undefined);
        }

        // Set up notification channel + permissions (non-blocking).
        // Actual scheduling happens in a separate effect that depends on the active dasha,
        // so it picks up chart updates after onboarding or chart regeneration.
        try {
          await setupAndroidChannel();
          const granted = await requestNotificationPermissions();
          if (mounted) setNotificationsGranted(granted);
        } catch (e) {
          if (__DEV__) console.warn('Notification setup error (non-fatal):', e);
        }
      } catch (e) {
        if (__DEV__) console.warn('App prepare error:', e);
      } finally {
        if (mounted) setAppReady(true);
        // hideAsync is safe to call even if unmounted — it's a one-shot platform call
        try { await SplashScreen.hideAsync(); } catch { /* already hidden */ }
      }
    }
    prepare();
    return () => { mounted = false; };
  }, [setPremium]);

  // One-shot migration of the legacy in-userStore Guru transcript into
  // the dedicated `guruMessageStore`. Fires once both stores have
  // hydrated. Cheap (no-ops on subsequent app launches once the
  // `migrationCompleted` flag is persisted).
  useEffect(() => {
    if (userHydrated && guruMessagesHydrated) {
      migrateLegacyGuruMessages();
    }
  }, [userHydrated, guruMessagesHydrated]);

  // Re-schedule the daily insight notification whenever the active Mahadasha lord,
  // notification time, OR the chart/birthData identity changes. The scheduler now
  // queues 7 days of voice-rotated pushes ahead, so this effect both seeds the
  // queue at boot and refreshes it on any input change (Profile → time picker,
  // chart regeneration, mahadasha boundary cross).
  //
  // We key on chart and birthData by reference. Both are stable across renders
  // unless the user actually re-onboards or regenerates the chart — exactly the
  // moments the queue should refresh.
  useEffect(() => {
    if (!notificationsGranted) return;
    scheduleDailyInsightNotification(
      activeDashaLord,
      { hour: notifHour, minute: notifMinute },
      chart,
      birthData,
    ).catch((e) => {
      if (__DEV__) console.warn('Notification re-schedule error (non-fatal):', e);
    });
  }, [notificationsGranted, activeDashaLord, notifHour, notifMinute, chart, birthData]);

  useEffect(() => {
    return addCustomerInfoListener((info) => {
      setPremium(isPremiumActive(info), info.latestExpirationDate ?? undefined);
    });
  }, [setPremium]);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080B14' }}>
      <StatusBar style="light" />
      <RootErrorBoundary>
        <Stack
          key={`scale-${fontScale}`}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#080B14' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="paywall"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="features/palm" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/numerology" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/chinese" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/lalkitab" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/compatibility" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/tarot" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="features/savedreadings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="legal/privacy" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="legal/terms" options={{ animation: 'slide_from_right' }} />
        </Stack>
        {/* Offline indicator overlays the stack — purely informational,
            doesn't block UI, debounces brief radio handovers. */}
        <OfflineBanner />
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}
