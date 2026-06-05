import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};

// ─── Proxy configuration ──────────────────────────────────────────────────────
export const PROXY_BASE_URL: string = extra.proxyBaseUrl ?? '';
export const APP_HMAC_SECRET: string = extra.appHmacSecret ?? '';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
export const REVENUECAT_IOS_KEY: string = extra.revenueCatIosKey ?? '';
export const REVENUECAT_ANDROID_KEY: string = extra.revenueCatAndroidKey ?? '';

// ─── Telemetry ────────────────────────────────────────────────────────────────
export const SENTRY_DSN: string = extra.sentryDsn ?? '';

// ─── Build profile / test mode ───────────────────────────────────────────────
export const BUILD_PROFILE: string = extra.buildProfile ?? 'local';
// TEST_MODE is controlled solely by the ENABLE_TEST_MODE env var.
// The EAS production profile does NOT set this var, so it is always false there.
// The EAS testflight profile sets it to "true" so testers can use the dev toggle.
export const TEST_MODE: boolean =
  extra.enableTestMode === 'true' || extra.enableTestMode === true;

// ─── Boot-time configuration check ────────────────────────────────────────────

/**
 * Verify that required production env vars are populated. Run once at app
 * boot from _layout.tsx.
 *
 * In dev (`__DEV__`): throws synchronously with a descriptive message so
 * the developer notices immediately.
 *
 * In production: logs a warning but does NOT crash the app — the consumer
 * surfaces (Claude calls, RevenueCat) will fail in their own ways and
 * show their own error states. A hard crash at boot would leave a
 * misconfigured TestFlight build entirely unusable for a tester.
 */
export function assertBootConfig(): void {
  const missing: string[] = [];
  if (!PROXY_BASE_URL) missing.push('PROXY_BASE_URL');
  if (!APP_HMAC_SECRET) missing.push('APP_HMAC_SECRET');
  // RevenueCat key is platform-specific. We only check the relevant one.
  if (Platform.OS === 'ios' && !REVENUECAT_IOS_KEY) missing.push('REVENUECAT_IOS_KEY');
  if (Platform.OS === 'android' && !REVENUECAT_ANDROID_KEY) missing.push('REVENUECAT_ANDROID_KEY');

  if (missing.length === 0) return;

  const msg = `[config] Missing env vars: ${missing.join(', ')}. Verify EAS Project Secrets and .env are populated.`;
  if (__DEV__) {
    // Throw in dev so the failure is impossible to miss.
    throw new Error(msg);
  } else {
    // Log only in prod — better than crashing a TestFlight build during review.
    console.warn(msg);
  }
}
