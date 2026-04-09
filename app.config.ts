import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Naksha',
  slug: 'nakshatra',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#080B14',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.nakshatra.vedic',
    buildNumber: '4',
    infoPlist: {
      NSCameraUsageDescription:
        'Naksha uses your camera to read your palm lines for Vedic palmistry analysis.',
      NSPhotoLibraryUsageDescription:
        'Naksha can analyze photos of your palm for palmistry readings.',
      NSUserNotificationUsageDescription:
        'Naksha sends you personalized daily cosmic alerts based on your birth chart.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#080B14',
    },
    package: 'app.nakshatra.vedic',
    versionCode: 1,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-camera',
    'expo-image-picker',
    [
      'expo-build-properties',
      {
        ios: { newArchEnabled: false },
        android: { newArchEnabled: false },
      },
    ],
    'expo-notifications',
  ],
  scheme: 'nakshatra',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'acac732e-95a4-4c55-b540-f526bc0849b2',
    },
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    prokeralaClientId: process.env.PROKERALA_CLIENT_ID ?? '',
    prokeralaClientSecret: process.env.PROKERALA_CLIENT_SECRET ?? '',
    revenueCatIosKey: process.env.REVENUECAT_IOS_KEY ?? '',
    revenueCatAndroidKey: process.env.REVENUECAT_ANDROID_KEY ?? '',
  },
});
