import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

// ─── Proxy configuration ──────────────────────────────────────────────────────
export const PROXY_BASE_URL: string = extra.proxyBaseUrl ?? '';
export const APP_HMAC_SECRET: string = extra.appHmacSecret ?? '';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
export const REVENUECAT_IOS_KEY: string = extra.revenueCatIosKey ?? '';
export const REVENUECAT_ANDROID_KEY: string = extra.revenueCatAndroidKey ?? '';

// ─── Build profile / test mode ───────────────────────────────────────────────
export const BUILD_PROFILE: string = extra.buildProfile ?? 'local';
// TEST_MODE is ONLY on when explicitly enabled via env var AND running a debug build.
// __DEV__ is false in every release/production IPA/APK regardless of EAS profile config,
// so this can never leak to the App Store even if ENABLE_TEST_MODE is misconfigured.
export const TEST_MODE: boolean =
  __DEV__ && (extra.enableTestMode === 'true' || extra.enableTestMode === true);
