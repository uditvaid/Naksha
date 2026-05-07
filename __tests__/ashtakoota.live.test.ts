/**
 * Live-API regression: Prokerala /kundli-matching/advanced shape.
 *
 * Run: LIVE_API=1 npx jest probe.kundliMatching
 *
 * Guards against silent shape drift in the Ashta-koota service. If
 * Prokerala renames `guna_milan.guna[].obtained_points` or restructures
 * the dosha details we'd lose either the score breakdown or the dosha
 * card without noticing — this test fails loudly when that happens.
 */

import { getAshtaKoota } from '../src/services/prokerala';
import type { BirthData } from '../src/store/userStore';

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

const me: BirthData = {
  name: 'Self',
  dateOfBirth: '1989-06-04',
  timeOfBirth: '16:09',
  placeOfBirth: 'Faridabad, Haryana, India',
  latitude: 28.4089,
  longitude: 77.3178,
  timezone: 'Asia/Kolkata',
};

const partner: BirthData = {
  name: 'Partner',
  dateOfBirth: '1990-03-15',
  timeOfBirth: '08:30',
  placeOfBirth: 'Mumbai, Maharashtra, India',
  latitude: 19.0760,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
};

liveDescribe('Live — getAshtaKoota response shape (LIVE_API=1)', () => {
  jest.setTimeout(30000);
  let data: Awaited<ReturnType<typeof getAshtaKoota>>;

  beforeAll(async () => {
    data = await getAshtaKoota(me, partner);
  });

  test('returns 8 koota areas', () => {
    expect(data.areas).toHaveLength(8);
  });

  test('koota IDs cover 1-8 with the expected max-points pattern', () => {
    const byId = new Map(data.areas.map(a => [a.id, a]));
    // Classical max-point structure: 1, 2, 3, 4, 5, 6, 7, 8 = 36 total
    expect(byId.get(1)?.maximumPoints).toBe(1);
    expect(byId.get(2)?.maximumPoints).toBe(2);
    expect(byId.get(3)?.maximumPoints).toBe(3);
    expect(byId.get(4)?.maximumPoints).toBe(4);
    expect(byId.get(5)?.maximumPoints).toBe(5);
    expect(byId.get(6)?.maximumPoints).toBe(6);
    expect(byId.get(7)?.maximumPoints).toBe(7);
    expect(byId.get(8)?.maximumPoints).toBe(8);
  });

  test('total maximum is 36', () => {
    expect(data.maximumPoints).toBe(36);
  });

  test('total points is in 0-36 range and equals sum of areas', () => {
    expect(data.totalPoints).toBeGreaterThanOrEqual(0);
    expect(data.totalPoints).toBeLessThanOrEqual(36);
    const sum = data.areas.reduce((acc, a) => acc + a.obtainedPoints, 0);
    expect(Math.abs(sum - data.totalPoints)).toBeLessThan(0.5);
  });

  test('every area has both partner buckets and a description', () => {
    for (const a of data.areas) {
      expect(a.girlBucket).toBeTruthy();
      expect(a.boyBucket).toBeTruthy();
      expect(a.description.length).toBeGreaterThan(20);
    }
  });

  test('mangal dosha details exist for both partners', () => {
    expect(typeof data.girlMangalDosha.hasDosha).toBe('boolean');
    expect(typeof data.boyMangalDosha.hasDosha).toBe('boolean');
    expect(data.girlMangalDosha.description).toBeTruthy();
    expect(data.boyMangalDosha.description).toBeTruthy();
  });
});
