import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initRevenueCat, getCustomerInfo, isPremiumActive, addCustomerInfoListener } from '../src/services/revenuecat';
import { requestNotificationPermissions, setupAndroidChannel, scheduleDailyInsightNotification } from '../src/services/notifications';
import { useAppStore } from '../src/store/userStore';
import { findActiveDasha } from '../src/utils/vedic';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setPremium = useAppStore(s => s.setPremium);
  const dashas = useAppStore(s => s.user.chart?.dashas);
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

        // Init RevenueCat — each step is isolated so a failed init still attempts customer lookup
        try {
          await initRevenueCat();
        } catch (e) {
          if (__DEV__) console.warn('RevenueCat init error (non-fatal):', e);
        }
        try {
          const customerInfo = await getCustomerInfo();
          if (mounted && customerInfo) {
            setPremium(isPremiumActive(customerInfo), customerInfo.latestExpirationDate ?? undefined);
          }
        } catch (e) {
          if (__DEV__) console.warn('RevenueCat getCustomerInfo error (non-fatal):', e);
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

  // Re-schedule the daily insight notification whenever the active Mahadasha lord changes
  // (after onboarding, chart regeneration, or a natural dasha transition).
  useEffect(() => {
    if (!notificationsGranted) return;
    scheduleDailyInsightNotification(activeDashaLord).catch((e) => {
      if (__DEV__) console.warn('Notification re-schedule error (non-fatal):', e);
    });
  }, [notificationsGranted, activeDashaLord]);

  useEffect(() => {
    return addCustomerInfoListener((info) => {
      setPremium(isPremiumActive(info), info.latestExpirationDate ?? undefined);
    });
  }, [setPremium]);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080B14' }}>
      <StatusBar style="light" />
      <Stack
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
    </GestureHandlerRootView>
  );
}
