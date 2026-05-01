/**
 * Daily Layer 10 — Share Button Component
 *
 * Extracts a shareable moment from the current daily reading and opens
 * the native share sheet. Records a 'shared' telemetry event on success.
 */

import { useCallback, useState } from 'react';
import { Share, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { buildShareMoment } from '@lib/daily/shareCard';
import { useDailyTelemetryStore } from '@store/dailyTelemetryStore';
import type { LunarPhase } from '@lib/daily/signals';

interface DailyShareButtonProps {
  reading: string;
  lunarPhase: LunarPhase;
  mahadasha: string;
  isQuietDay?: boolean;
}

export function DailyShareButton({ reading, lunarPhase, mahadasha, isQuietDay }: DailyShareButtonProps) {
  const [sharing, setSharing] = useState(false);
  const recordEvent = useDailyTelemetryStore(s => s.recordEvent);

  const handleShare = useCallback(async () => {
    if (!reading.trim() || sharing) return;

    setSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const moment = buildShareMoment(reading, { lunarPhase, mahadasha });
      const result = await Share.share(
        { message: moment.fullText, title: "Today's Cosmic Reading" },
        { dialogTitle: 'Share your reading' },
      );

      if (result.action === Share.sharedAction) {
        recordEvent('shared', { isQuietDay: isQuietDay ?? false });
      }
    } catch {
      // Share sheet dismissed or system error — never surface to user
    } finally {
      setSharing(false);
    }
  }, [reading, lunarPhase, mahadasha, isQuietDay, sharing, recordEvent]);

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handleShare}
      activeOpacity={0.75}
      disabled={sharing || !reading.trim()}
    >
      {sharing ? (
        <ActivityIndicator color={Colors.gold} size="small" />
      ) : (
        <Text style={styles.label}>↗ Share Reading</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    gap: 6,
    minWidth: 140,
  },
  label: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: Fonts.crimson,
    letterSpacing: 0.4,
  },
});
