import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { todaysAffirmation, todaysFocus } from '@lib/dailyAffirmation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // required by NotificationBehavior type; deprecated in newer SDK
    shouldShowBanner: true,  // replaces shouldShowAlert in SDK 51+
    shouldShowList: true,    // replaces shouldShowAlert in SDK 51+
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'undetermined') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
  }
  return false;
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily_insight', {
    name: 'Daily Cosmic Insight',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#C9A84C',
    showBadge: false,
  });
}

let _scheduleInflight: Promise<void> | null = null;

export async function scheduleDailyInsightNotification(activeDashaLord?: string): Promise<void> {
  if (Platform.OS === 'web') return;

  if (_scheduleInflight) return _scheduleInflight;

  _scheduleInflight = (async () => {
    try {
      // Cancel any existing daily insight notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(n => n.content.data?.type === 'daily_insight');
      await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));

      // Pull from the shared dailyAffirmation module so the home-page card
      // and this push notification stay in lock-step.
      const affirmation = todaysAffirmation();
      const focuses = todaysFocus(activeDashaLord);

      const body = `${affirmation}\n\n✦ Top 3 to focus on today\n1. ${focuses[0]}\n2. ${focuses[1]}\n3. ${focuses[2]}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✦ Your Daily Cosmic Insight',
          body,
          data: { type: 'daily_insight' },
          ...(Platform.OS === 'android' ? { channelId: 'daily_insight' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });
    } catch (e) {
      if (__DEV__) console.warn('Notification scheduling failed (non-fatal):', e);
    } finally {
      _scheduleInflight = null;
    }
  })();

  return _scheduleInflight;
}
