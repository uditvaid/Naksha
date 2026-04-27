import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { sha256 } from 'js-sha256';
import { APP_HMAC_SECRET } from '@constants/config';

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

/**
 * Build the x-naksha-auth header value for proxy requests.
 * Format: <deviceId>.<timestampMs>.<hmac-sha256(deviceId.timestamp)>
 */
export async function buildAuthHeader(): Promise<string> {
  const deviceId = await getDeviceId();
  const ts = Date.now();
  const sig = sha256.hmac.hex(APP_HMAC_SECRET, `${deviceId}.${ts}`);
  return `${deviceId}.${ts}.${sig}`;
}
