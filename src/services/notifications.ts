import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // required by NotificationBehavior type; deprecated in newer SDK
    shouldShowBanner: true,  // replaces shouldShowAlert in SDK 51+
    shouldShowList: true,    // replaces shouldShowAlert in SDK 51+
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AFFIRMATIONS = [
  'The universe supports your highest good. Today, trust the timing of your life.',
  'Your birth chart is a map of possibility, not a cage. You hold the power.',
  'Every challenge is Saturn teaching — every grace is Jupiter blessing.',
  'The Moon governs your inner world. Honour your emotions as sacred data.',
  'You are the meeting point of heaven and earth, written in the stars.',
  'What you focus on grows. Direct your awareness with intention today.',
  'Your dharma is unique. No one else can walk the path you are here to walk.',
  'Patience is not passive. It is the strength of one who knows when to act.',
  'The stars incline; they do not compel. Your choices shape your destiny.',
  'Rest is not retreat. Even the Moon waxes and wanes to remain whole.',
  'Gratitude opens the channels through which grace naturally flows.',
  'You carry the wisdom of ancestors. Trust what you know in your bones.',
  'Every ending in your life is preparing space for a new beginning.',
  'The present moment is your point of power. Begin here, begin now.',
  'Your sensitivity is not weakness — it is the antenna that reads the world.',
  'Courage is not the absence of fear. It is moving forward with it beside you.',
  'What you resist teaches you. What you accept has the power to transform you.',
  'The cosmos is not indifferent. It is always speaking. Learn to listen.',
  'You are in exactly the right chapter of your story. Trust the arc.',
  'Small, consistent actions compound into extraordinary transformation.',
  'Your relationships mirror your inner state. Begin any change within.',
  'Abundance is not a destination — it is a frequency you choose to inhabit.',
  'Let go of what was, and make room for what is quietly becoming.',
  'Your body is the vehicle of your dharma. Honour it with care and attention.',
  'Purpose is not found — it is revealed through sustained action and attention.',
  'The Guru within you knows the way. Quiet the mind and listen deeply.',
  'You are not behind. You are exactly where your karma has led you.',
  'What you do in the small moments determines who you become in the large ones.',
];

const DASHA_FOCUS: Record<string, [string, string, string]> = {
  Sun:     ['Step into a leadership role, even a small one today', 'Clarify your core identity and what you stand for', 'Spend time in natural light — nourish your vital energy'],
  Moon:    ['Check in honestly with your emotional needs', 'Nurture an important relationship with full presence', 'Create one moment of stillness and quiet reflection'],
  Mars:    ['Take decisive action on something you\'ve been postponing', 'Move your body — channel this energy through exercise', 'Set one clear goal and begin it before the day ends'],
  Mercury: ['Write, speak, or learn something meaningful today', 'Clear a communication backlog — messages, emails, conversations', 'Engage your curiosity — read, research, or explore a new idea'],
  Jupiter: ['Express gratitude for three specific blessings today', 'Share your knowledge or wisdom with someone who needs it', 'Invest in your growth — a book, course, or deep conversation'],
  Venus:   ['Do something beautiful — create, appreciate art, or dress with care', 'Deepen a relationship with genuine attention and warmth', 'Allow yourself real pleasure today, without guilt'],
  Saturn:  ['Tackle the most important task you have been avoiding', 'Review a long-term commitment and honour it fully today', 'Practice discipline in one area: sleep, diet, or focused work'],
  Rahu:    ['Step outside your comfort zone in one deliberate way', 'Explore an unconventional idea or a new perspective', 'Channel your ambition with focus — do not scatter your energy'],
  Ketu:    ['Sit in silent meditation or contemplative reflection', 'Release one attachment or expectation that no longer serves you', 'Connect with your spiritual practice or deeper sense of purpose'],
};

const GENERIC_FOCUS: [string, string, string] = [
  'Begin your day with clear intention — write down three priorities',
  'Take five deep breaths before responding to any challenge today',
  'Do one thing today that your future self will genuinely thank you for',
];

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

      // Rotate affirmation by day of year
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
      const affirmation = AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];

      const focuses = (activeDashaLord && DASHA_FOCUS[activeDashaLord]) ?? GENERIC_FOCUS;

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
