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
// TEST_MODE is controlled solely by the ENABLE_TEST_MODE env var.
// The EAS production profile does NOT set this var, so it is always false there.
// The EAS testflight profile sets it to "true" so testers can use the dev toggle.
export const TEST_MODE: boolean =
  extra.enableTestMode === 'true' || extra.enableTestMode === true;
