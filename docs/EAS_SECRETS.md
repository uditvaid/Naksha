# EAS Project Secrets

These environment variables must be configured as EAS Project Secrets
for the `production` environment before a successful production build.
`app.config.ts` reads them at build time and embeds them into the JS
bundle via `Constants.expoConfig.extra`. Missing values cause every
proxy request to 401 and silently disable telemetry / RevenueCat.

## Required secrets

| Name | Purpose | Example value |
|---|---|---|
| `PROXY_BASE_URL` | Cloudflare Worker base URL that fronts Anthropic + Prokerala | `https://naksha-proxy.workers.dev` |
| `APP_HMAC_SECRET` | Server-side shared secret used to sign `x-naksha-auth` request headers in `src/services/auth.ts`. The Worker validates the HMAC and rate-limits per device. | (32+ random bytes) |
| `REVENUECAT_IOS_KEY` | RevenueCat publishable iOS key | `appl_...` |
| `REVENUECAT_ANDROID_KEY` | RevenueCat publishable Android key | `goog_...` |
| `SENTRY_DSN` | (Optional) Sentry project DSN. Missing → telemetry no-ops safely. | `https://<key>@o<org>.ingest.us.sentry.io/<project>` |

## Setting them

```bash
eas login
eas env:create --environment production --name PROXY_BASE_URL          --value "<value>"
eas env:create --environment production --name APP_HMAC_SECRET         --value "<value>"
eas env:create --environment production --name REVENUECAT_IOS_KEY      --value "<value>"
eas env:create --environment production --name REVENUECAT_ANDROID_KEY  --value "<value>"
eas env:create --environment production --name SENTRY_DSN              --value "<value>"
```

Verify with:

```bash
eas env:list --environment production
```

## Profile-specific behaviour

- `development` — local dev; reads from `.env`
- `preview` — internal Ad Hoc / QA builds; sets `ENABLE_TEST_MODE=true`
  so the Profile-tab dev premium toggle is available. NOT for App
  Review.
- `testflight` — TestFlight beta + App Review build. Pure production
  config — no test mode, no dev menu.
- `production` — App Store release. Identical config to `testflight`
  except for the EAS submission target.

## Worker-side hardening checklist

The `APP_HMAC_SECRET` ships embedded in every installed `.ipa` and
is extractable. The Worker MUST mitigate via:

1. Per-`deviceId` rate-limit (e.g. 200/hr, 2000/day) on the auth-token
2. Anomaly detection on per-device traffic patterns
3. Periodic secret rotation with a grace period (Worker accepts
   current + previous secret for ~7 days while users upgrade)

Long-term: replace the shared secret with per-device bootstrap tokens
issued by the Worker on first launch and stored in SecureStore.
