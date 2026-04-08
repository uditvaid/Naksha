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
