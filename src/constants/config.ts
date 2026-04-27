/**
 * API Configuration
 *
 * All keys are injected at build time via app.config.ts → Constants.expoConfig.extra.
 * EAS Secrets populate process.env during the build, which app.config.ts reads
 * and passes into the extra field.
 *
 * To set EAS env vars:
 *   eas env:create --name ANTHROPIC_API_KEY --value sk-ant-... --environment production --visibility secret --type string --scope project
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

// ─── Anthropic ────────────────────────────────────────────────────────────────
export const ANTHROPIC_API_KEY: string = extra.anthropicApiKey ?? '';

// ─── Prokerala ────────────────────────────────────────────────────────────────
export const PROKERALA_CLIENT_ID: string = extra.prokeralaClientId ?? '';
export const PROKERALA_CLIENT_SECRET: string = extra.prokeralaClientSecret ?? '';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
export const REVENUECAT_IOS_KEY: string = extra.revenueCatIosKey ?? '';
export const REVENUECAT_ANDROID_KEY: string = extra.revenueCatAndroidKey ?? '';

// ─── Build profile / test mode ───────────────────────────────────────────────
// TEST_MODE exposes a manual Premium toggle on the Profile screen so the app can be exercised
// without a working App Store IAP configuration. Must be EXPLICITLY enabled via
// ENABLE_TEST_MODE=true on the testing EAS profile — never on in any release build.
export const BUILD_PROFILE: string = extra.buildProfile ?? 'local';
// TEST_MODE is ONLY on when explicitly enabled via env var AND running a debug build.
// __DEV__ is false in every release/production IPA/APK regardless of EAS profile config,
// so this can never leak to the App Store even if ENABLE_TEST_MODE is misconfigured.
export const TEST_MODE: boolean =
  __DEV__ &&
  (extra.enableTestMode === 'true' || extra.enableTestMode === true);
