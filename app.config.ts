import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Naksha',
  slug: 'nakshatra',
  version: '1.1.0',
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
    buildNumber: '20',
    infoPlist: {
      NSCameraUsageDescription:
        'Naksha uses your camera to read your palm lines for Vedic palmistry analysis.',
      NSPhotoLibraryUsageDescription:
        'Naksha can analyze photos of your palm for palmistry readings.',
      ITSAppUsesNonExemptEncryption: false,
      UIRequiresFullScreen: true,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDateOfBirth',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosOrVideos',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#080B14',
    },
    package: 'app.nakshatra.vedic',
    versionCode: 18,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
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
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: { newArchEnabled: false, deploymentTarget: '16.0' },
        android: { newArchEnabled: false },
      },
    ],
  ],
  scheme: 'nakshatra',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: 'acac732e-95a4-4c55-b540-f526bc0849b2' },
    proxyBaseUrl: process.env.PROXY_BASE_URL ?? '',
    appHmacSecret: process.env.APP_HMAC_SECRET ?? '',
    revenueCatIosKey: process.env.REVENUECAT_IOS_KEY ?? '',
    revenueCatAndroidKey: process.env.REVENUECAT_ANDROID_KEY ?? '',
    buildProfile: process.env.EAS_BUILD_PROFILE ?? 'local',
    enableTestMode: process.env.ENABLE_TEST_MODE ?? 'false',
  },
});
