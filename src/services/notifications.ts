import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildPushPayload } from '@lib/daily/pushVoices';
import type { BirthData, ChartData } from '@store/userStore';
import { onAppReset } from '@store/appReset';

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

interface ScheduleOpts {
  /** Hour-of-day (0-23) in the user's local timezone. Default 8. */
  hour?: number;
  /** Minute-of-hour (0-59). Default 0. */
  minute?: number;
}

/**
 * How many days ahead we pre-queue daily-insight notifications. With
 * voice-rotating content (see pushVoices.ts) we can't use a single
 * `repeats: true` trigger any more — each day needs its own body. We
 * schedule a rolling 7-day window on every app open; if the user keeps
 * the app idle past day 7 the queue empties and pushes pause, which is
 * a reasonable signal (they'll get back the next time they open).
 */
const SCHEDULE_HORIZON_DAYS = 7;

/**
 * Schedule (or re-schedule) the daily-insight push notification queue.
 *
 * The previous implementation used `repeats: true` with a single static
 * body. That meant every user got the same affirmation every day, which
 * killed open-rate within a week. The new behaviour:
 *
 *   - Cancel all queued daily_insight notifications
 *   - For each of the next SCHEDULE_HORIZON_DAYS days, compose a fresh
 *     payload via buildPushPayload(date, chart, dashaLord, firstName)
 *     and schedule it for that day at the user's preferred hour:minute
 *   - Voice rotates by day-of-year so consecutive days never share a voice
 *
 * Re-runs idempotently on every app open thanks to the cancel pass —
 * if the user re-launches the app at 7am, the 8am push for today gets
 * re-composed with the latest chart and signals.
 */
export async function scheduleDailyInsightNotification(
  activeDashaLord?: string,
  opts: ScheduleOpts = {},
  chart?: ChartData | null,
  birthData?: BirthData | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (_scheduleInflight) return _scheduleInflight;

  // Clamp to valid hour/minute ranges defensively — a corrupt persisted
  // value shouldn't crash the scheduler.
  const rawHour = opts.hour ?? 8;
  const rawMinute = opts.minute ?? 0;
  const hour = Math.max(0, Math.min(23, Math.trunc(rawHour)));
  const minute = Math.max(0, Math.min(59, Math.trunc(rawMinute)));

  _scheduleInflight = (async () => {
    try {
      // Cancel any existing daily insight notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(n => n.content.data?.type === 'daily_insight');
      await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
      if (__DEV__) {
        console.log(`[Notifications] cancelled ${toCancel.length} stale daily_insight; permission:`, (await Notifications.getPermissionsAsync()).status);
      }

      const firstName = birthData?.name?.split(' ')[0];
      const now = Date.now();
      const scheduledIds: string[] = [];

      for (let dayOffset = 0; dayOffset < SCHEDULE_HORIZON_DAYS; dayOffset++) {
        const fireDate = new Date();
        fireDate.setDate(fireDate.getDate() + dayOffset);
        fireDate.setHours(hour, minute, 0, 0);

        // Skip days whose trigger time has already passed (e.g. user opens
        // the app at 10am and the 8am slot for today is gone) — DATE
        // triggers in the past throw on iOS.
        if (fireDate.getTime() <= now) continue;

        const payload = buildPushPayload(fireDate, chart ?? null, activeDashaLord, firstName);
        const dayKey = fireDate.toISOString().slice(0, 10);

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body,
            data: { type: 'daily_insight', day: dayKey },
            ...(Platform.OS === 'android' ? { channelId: 'daily_insight' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        });
        scheduledIds.push(id);
      }

      if (__DEV__) {
        console.log(`[Notifications] queued ${scheduledIds.length} daily_insight pushes at ${hour}:${String(minute).padStart(2, '0')} local; lord=${activeDashaLord ?? 'none'}; chart=${chart ? 'yes' : 'no'}`);
      }
    } catch (e) {
      if (__DEV__) console.warn('Notification scheduling failed (non-fatal):', e);
    } finally {
      _scheduleInflight = null;
    }
  })();

  return _scheduleInflight;
}

// On user reset / sign-out, immediately cancel any queued daily-insight
// pushes. Without this, the next 7 days of personalized notifications
// (with the prior user's first name + dasha) would still fire until the
// next app launch re-runs the scheduler under the new user. Web
// platform has no Notifications.* — short-circuit there.
onAppReset(() => {
  if (Platform.OS === 'web') return;
  (async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(n => n.content.data?.type === 'daily_insight');
      await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
      if (__DEV__) {
        console.log(`[Notifications] reset cancelled ${toCancel.length} queued daily_insight pushes`);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Notifications] reset cancel failed:', e);
    }
  })();
});
