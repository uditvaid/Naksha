/**
 * API Configuration
 * 
 * For development: set keys directly here
 * For production: use EAS Secrets (https://docs.expo.dev/build-reference/variables/)
 *   eas secret:create --scope project --name ANTHROPIC_API_KEY --value sk-ant-...
 */

// ─── Anthropic ────────────────────────────────────────────────────────────────
// Revoke & regenerate at console.anthropic.com → API Keys
// NOTE: Generate a new key — the previously shared key should be revoked
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '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
';

// ─── Prokerala ────────────────────────────────────────────────────────────────
export const PROKERALA_CLIENT_ID = '20b10adc-6baa-4291-8577-a4e84f4800c7';
export const PROKERALA_CLIENT_SECRET = 'SJmiJvGiEvs4wbk5OWjvi7hvVsqKKSADm4iOv2sK';

// ─── RevenueCat ───────────────────────────────────────────────────────────────
// Swap test_ keys for production keys before App Store submission
export const REVENUECAT_IOS_KEY = 'test_ENuqBaRqVwgrhZzhGJzFPuhQUia';
export const REVENUECAT_ANDROID_KEY = 'test_ENuqBaRqVwgrhZzhGJzFPuhQUia';
