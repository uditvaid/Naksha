import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { sha256 } from 'js-sha256';
import { APP_HMAC_SECRET } from '@constants/config';
import { addBreadcrumb, reportError } from '@services/telemetry';

const DEVICE_ID_KEY = 'naksha_device_id';

let _deviceIdCache: string | null = null;

async function getDeviceId(): Promise<string> {
  if (_deviceIdCache) return _deviceIdCache;
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  _deviceIdCache = id;
  return id;
}

// One-shot warning: if the build is shipping without an HMAC secret, log
// it via telemetry exactly once per process so the Sentry inbox doesn't
// drown in repeats from every signed request.
let _missingSecretWarned = false;

/**
 * Build the x-naksha-auth header value for proxy requests.
 * Format: <deviceId>.<timestampMs>.<hmac-sha256(deviceId.timestamp)>
 *
 * SECURITY NOTE
 * -------------
 * `APP_HMAC_SECRET` ships in the JS bundle via Constants.expoConfig.extra
 * and is therefore extractable from any installed .ipa or .apk. This is
 * an inherent limitation of client-side secret distribution — no amount
 * of client-side obfuscation makes it actually private. The proxy MUST
 * mitigate by:
 *
 *   1. Per-deviceId rate-limiting on the Worker (a leaked secret only
 *      lets the attacker impersonate a single deviceId; throttle that
 *      device aggressively)
 *   2. Anomaly detection (deviceIds suddenly issuing 100x normal traffic)
 *   3. Periodic secret rotation (e.g. monthly app updates with a new
 *      secret; the Worker accepts the current + previous secret for a
 *      grace period)
 *   4. Long-term: replace this shared-secret HMAC with a per-device
 *      bootstrap token issued by the Worker on first launch, stored in
 *      SecureStore, and rotated server-side.
 *
 * Without (1)-(3), the secret extraction is a real cost-amplification
 * vector against the Anthropic + Prokerala upstream APIs.
 */
export async function buildAuthHeader(): Promise<string> {
  const deviceId = await getDeviceId();
  const ts = Date.now();

  if (!APP_HMAC_SECRET) {
    if (!_missingSecretWarned) {
      _missingSecretWarned = true;
      addBreadcrumb('APP_HMAC_SECRET is empty — proxy will reject requests', 'auth');
      reportError(new Error('APP_HMAC_SECRET missing at runtime'), {
        source: 'buildAuthHeader',
      });
    }
    // Still return a syntactically valid header so the upstream returns
    // a clean 401 instead of crashing the request pipeline.
    return `${deviceId}.${ts}.no-secret`;
  }

  const sig = sha256.hmac.hex(APP_HMAC_SECRET, `${deviceId}.${ts}`);
  return `${deviceId}.${ts}.${sig}`;
}
