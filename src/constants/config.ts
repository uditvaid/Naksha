/**
 * API Configuration
 *
 * All keys are read from environment variables, populated by EAS Secrets in production.
 * For local development, create a .env file (see .env.example).
 *
 * To set EAS Secrets:
 *   eas secret:create --scope project --name ANTHROPIC_API_KEY --value sk-ant-...
 *   eas secret:create --scope project --name PROKERALA_CLIENT_ID --value ...
 *   eas secret:create --scope project --name PROKERALA_CLIENT_SECRET --value ...
 *   eas secret:create --scope project --name REVENUECAT_IOS_KEY --value ...
 *   eas secret:create --scope project --name REVENUECAT_ANDROID_KEY --value ...
 */

// ─── Anthropic ────────────────────────────────────────────────────────────────
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── Prokerala ────────────────────────────────────────────────────────────────
export const PROKERALA_CLIENT_ID = process.env.PROKERALA_CLIENT_ID ?? '';
export const PROKERALA_CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET ?? '';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
export const REVENUECAT_IOS_KEY = process.env.REVENUECAT_IOS_KEY ?? '';
export const REVENUECAT_ANDROID_KEY = process.env.REVENUECAT_ANDROID_KEY ?? '';
