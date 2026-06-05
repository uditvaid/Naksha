// When LIVE_API=1, load secrets from .env into process.env so the
// "Live proxy" suite in prokerala.test.ts can read the real PROXY_BASE_URL
// and APP_HMAC_SECRET. Without this the file-level jest.mock of
// @constants/config points fetch at https://mock-proxy.test (a dead URL),
// the request fails, and the suite silently falls into approximate-mode
// fallback instead of hitting Cloudflare. We parse .env inline rather than
// pulling in `dotenv` as a dev dep.
if (process.env.LIVE_API === '1') {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch {
    // .env missing or unreadable — live tests will fail loudly when the
    // mock factory below evaluates and finds empty strings.
  }
}

// Mock RN/Expo modules that can't run in Node
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  ExecutionEnvironment: { Storekit: 'storekit' },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => Math.random().toString(36).slice(2),
}));

// @sentry/react-native ships as ESM; jest-expo's transformIgnorePatterns
// doesn't whitelist it, so a raw import throws "Unexpected token 'export'".
// Tests don't exercise telemetry; stub the surface our code touches.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  ErrorBoundary: ({ children }: { children: unknown }) => children,
}));

// NetInfo is a native module. Stub the listener API so OfflineBanner
// renders harmlessly under jest if it's ever pulled into a render test.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => { /* unsubscribe no-op */ }),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));
