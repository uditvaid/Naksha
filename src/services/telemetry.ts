/**
 * Production telemetry — crash reporting + diagnostic breadcrumbs.
 *
 * Wraps @sentry/react-native so callers don't have to deal with the
 * Sentry SDK directly. The SDK is initialised once at app boot via
 * `initTelemetry()`, with a DSN read from app.config.ts's `extra` block
 * (env-driven). When no DSN is configured (local dev, builds without
 * the secret), every function in this module becomes a safe no-op —
 * the app continues to work and the surrounding code doesn't need to
 * guard each call.
 *
 * What we capture:
 *   - Uncaught JS errors via Sentry's automatic global handler
 *   - Unhandled promise rejections (RN doesn't surface these by default)
 *   - Manual `reportError` calls from caught exceptions we want logged
 *   - `addBreadcrumb` from interesting moments so a later crash has
 *     context (which screen, which action triggered it)
 *
 * What we DO NOT capture:
 *   - PII in default tags. Names, birth data, prose content are
 *     explicitly NOT attached. Sentry events show timing, error
 *     message, stack — not user-identifying content.
 *   - Network bodies. Sentry's automatic fetch breadcrumb captures
 *     URL + status only; we don't send request/response bodies.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const SENTRY_DSN: string = extra.sentryDsn ?? '';
const RELEASE_VERSION: string = Constants.expoConfig?.version ?? 'unknown';
const BUILD_PROFILE: string = extra.buildProfile ?? 'local';

let _initialised = false;

/**
 * Initialise Sentry. Idempotent — calling twice is a no-op. Returns
 * `true` if Sentry is now active, `false` if no DSN configured (local
 * dev or build without the secret set).
 *
 * Call from the root layout BEFORE any other init so early errors are
 * captured.
 */
export function initTelemetry(): boolean {
  if (_initialised) return SENTRY_DSN !== '';
  _initialised = true;

  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('[telemetry] SENTRY_DSN not configured — telemetry disabled.');
    }
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      release: `naksha@${RELEASE_VERSION}`,
      environment: BUILD_PROFILE,
      // Conservative sampling: every error, 10% of transactions. Lower
      // the sample rate if quota becomes a concern.
      tracesSampleRate: 0.1,
      // Filter known-noise from app shutdown / unmount races so the
      // Sentry inbox stays signal-heavy. Match anchored at the start of
      // the message so a wrapped error like "MyScreen failed: Cannot
      // update a component..." still gets through.
      beforeSend: (event) => {
        const msg = event.message ?? event.exception?.values?.[0]?.value ?? '';
        if (typeof msg === 'string' && /^Warning: Cannot update a component/i.test(msg)) {
          // React's setState-after-unmount warning. Noisy, rarely actionable.
          return null;
        }
        return event;
      },
      // Don't auto-attach screenshot / view-hierarchy (could include
      // birth data on screen).
      attachScreenshot: false,
      attachViewHierarchy: false,
      // Sentry RN v6 captures unhandled promise rejections + global JS
      // errors automatically via its installed global handler — no extra
      // tracker setup needed.
    });
  } catch (e) {
    // A malformed DSN string or unexpected init failure must not crash
    // app boot. Log to dev console; we don't have telemetry yet (we're
    // failing to set it up) so this is best-effort.
    if (__DEV__) {
      console.warn('[telemetry] Sentry.init failed:', e);
    }
    _initialised = false;
    return false;
  }

  return true;
}

/**
 * Manually report a caught exception. Use sparingly — callers that
 * routinely catch + swallow (e.g. background telemetry extractors)
 * should NOT report every failure or the inbox drowns. Use
 * `addBreadcrumb` for low-value-but-useful context instead.
 */
export function reportError(error: Error, tags?: Record<string, string>): void {
  if (!_initialised || !SENTRY_DSN) {
    if (__DEV__) console.warn('[telemetry] reportError:', error.message, tags);
    return;
  }
  Sentry.captureException(error, { tags });
}

/**
 * Drop a low-cost breadcrumb. Use for "user navigated to X", "scheduler
 * cancelled N old notifications", etc. Capped at ~100 by Sentry.
 */
export function addBreadcrumb(
  message: string,
  category: 'navigation' | 'lifecycle' | 'auth' | 'notification' | 'reading' | 'guru',
  data?: Record<string, string | number | boolean>,
): void {
  if (!_initialised || !SENTRY_DSN) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Wrap a React tree so render-time errors are caught + reported.
 * Re-exported from Sentry but typed locally for ergonomics.
 */
export const TelemetryErrorBoundary = Sentry.ErrorBoundary;
