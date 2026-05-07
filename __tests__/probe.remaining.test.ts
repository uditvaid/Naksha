/**
 * One-shot probe for remaining Prokerala endpoints (#4-#7 on the roadmap).
 * Hits each in parallel and dumps the response shape so we can design
 * surfaces around real fields. Delete after the build is done.
 *
 * Run: LIVE_API=1 npx jest probe.remaining
 */

import { buildAuthHeader } from '../src/services/auth';
import { PROXY_BASE_URL } from '../src/constants/config';

jest.mock('@constants/config', () => {
  const live = process.env.LIVE_API === '1';
  return {
    PROXY_BASE_URL: live ? (process.env.PROXY_BASE_URL || '') : 'https://mock-proxy.test',
    APP_HMAC_SECRET: live ? (process.env.APP_HMAC_SECRET || '') : 'test-secret',
    TEST_MODE: false,
    BUILD_PROFILE: 'test',
    REVENUECAT_IOS_KEY: '',
    REVENUECAT_ANDROID_KEY: '',
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('test-device-id')),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-device-id',
}));

const LIVE = process.env.LIVE_API === '1';
const liveDescribe = LIVE ? describe : describe.skip;

liveDescribe('Probe — remaining endpoints (LIVE_API=1)', () => {
  jest.setTimeout(60000);

  it('dumps shapes for auspicious-period, mangal-dosha, kalsarpa-dosha, chandra-bala, navamsa-chart, dasamsa-chart', async () => {
    const today = new Date().toISOString().split('T')[0];
    const natalDatetime = '1989-06-04T16:09:00+05:30';
    const coords = '28.4089,77.3178';

    const todayDatetime = `${today}T12:00:00+05:30`;

    type Probe = { name: string; path: string; params: Record<string, string> };
    const probes: Probe[] = [
      // #4 Auspicious / inauspicious periods today (Rahu Kalam etc.)
      { name: 'auspicious-period', path: 'auspicious-period', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      // Try alternate names too
      { name: 'inauspicious-period', path: 'inauspicious-period', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'rahu-kalam', path: 'rahu-kalam', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'gulika-kalam', path: 'gulika-kalam', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'yamaganda-kalam', path: 'yamaganda-kalam', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'abhijit-muhurat', path: 'abhijit-muhurat', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },

      // #5 Doshas
      { name: 'mangal-dosha', path: 'mangal-dosha', params: { datetime: natalDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'kalsarpa-dosha', path: 'kalsarpa-dosha', params: { datetime: natalDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },

      // #6 Chandra Bala (Moon strength) — re-probed with today's datetime
      { name: 'chandra-bala-today', path: 'chandra-bala', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'tara-bala-today', path: 'tara-bala', params: { datetime: todayDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },

      // Kalsarpa name variants
      { name: 'kaal-sarpa-dosha', path: 'kaal-sarpa-dosha', params: { datetime: natalDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'kalasarpa-yoga', path: 'kalasarpa-yoga', params: { datetime: natalDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
      { name: 'kala-sarpa-yoga', path: 'kala-sarpa-yoga', params: { datetime: natalDatetime, coordinates: coords, ayanamsa: '1', la: 'en' } },
    ];

    const results = await Promise.all(probes.map(async (p) => {
      const u = new URL(`${PROXY_BASE_URL}/v1/prokerala/${p.path}`);
      Object.entries(p.params).forEach(([k, v]) => u.searchParams.set(k, v));
      const auth = await buildAuthHeader();
      const r = await fetch(u.toString(), { headers: { 'x-naksha-auth': auth, Accept: 'application/json' } });
      const t = await r.text();
      return { name: p.name, status: r.status, body: t };
    }));

    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(`[${r.name}] status:`, r.status, 'body:', r.body.slice(0, 2000));
    }

    // Soft assertion — at least one probe responded with usable data
    expect(results.some(r => r.status === 200)).toBe(true);
  });
});
