import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initRevenueCat, getCustomerInfo, isPremiumActive } from '../src/services/revenuecat';
import { useAppStore } from '../src/store/userStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setPremium = useAppStore(s => s.setPremium);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          Cinzel_400Regular: require('@expo-google-fonts/cinzel/400Regular/Cinzel_400Regular.ttf'),
          Cinzel_600SemiBold: require('@expo-google-fonts/cinzel/600SemiBold/Cinzel_600SemiBold.ttf'),
          CormorantGaramond_300Light: require('@expo-google-fonts/cormorant-garamond/300Light/CormorantGaramond_300Light.ttf'),
          CormorantGaramond_400Regular: require('@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf'),
          CormorantGaramond_400Regular_Italic: require('@expo-google-fonts/cormorant-garamond/400Regular_Italic/CormorantGaramond_400Regular_Italic.ttf'),
          CrimsonPro_300Light: require('@expo-google-fonts/crimson-pro/300Light/CrimsonPro_300Light.ttf'),
          CrimsonPro_400Regular: require('@expo-google-fonts/crimson-pro/400Regular/CrimsonPro_400Regular.ttf'),
        });

        // Init RevenueCat
        try {
          await initRevenueCat();
          const customerInfo = await getCustomerInfo();
          if (customerInfo) {
            setPremium(isPremiumActive(customerInfo), customerInfo.latestExpirationDate ?? undefined);
          }
        } catch (e) {
          console.log('RevenueCat init error (non-fatal):', e);
        }
      } catch (e) {
        console.warn('App prepare error:', e);
      } finally {
        // Always hide splash screen — never leave user stuck
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

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
        <Stack.Screen name="features/savedreadings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
