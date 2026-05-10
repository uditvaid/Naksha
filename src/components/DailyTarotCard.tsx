/**
 * Daily card on the home screen. Tap to flip → see the card → tap again
 * to read its plain-English meaning.
 *
 * The card is deterministic per (user, date) — same person on the same
 * day always gets the same card. That makes it feel like a real daily
 * draw rather than a slot-machine spin.
 *
 * Recording a pull updates the streak counter (gentle gamification —
 * no punishment, just a visible "X days in a row" if you keep showing up).
 */

import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { dailyCardOfTheDay, type DrawnCard } from '@utils/tarot';
import { useTarotStreakStore } from '@store/tarotStreakStore';
import { TarotCardDetailModal } from './TarotCardDetailModal';

interface Props {
  /** Stable user identity — used as the seed alongside today's date so
   *  the card is per-user-per-day. */
  userKey: string;
  /** Date.now() ms — refreshes when the home screen's nowTick bumps. */
  nowTick: number;
}

export function DailyTarotCard({ userKey, nowTick }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const recordPull = useTarotStreakStore(s => s.recordPull);
  const currentStreak = useTarotStreakStore(s => s.currentStreak);
  const longestStreak = useTarotStreakStore(s => s.longestStreak);

  // Per-user-per-day deterministic draw. The card only changes at the
  // calendar-day boundary, so memoise by ISO date string instead of the
  // millisecond `nowTick` — `nowTick` bumps on every AppState 'active'
  // and focus event, which would otherwise force a Fisher-Yates re-shuffle
  // 3-5× per session for an unchanged result.
  const isoDate = new Date(nowTick).toISOString().split('T')[0]!;
  const card: DrawnCard = useMemo(
    () => dailyCardOfTheDay(userKey, new Date(nowTick)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userKey, isoDate],
  );

  const onTap = () => {
    if (!revealed) {
      // First tap: flip + record the pull
      setRevealed(true);
      recordPull();
    } else {
      // Second tap: open the detail modal
      setDetailOpen(true);
    }
  };

  const streakLine = currentStreak >= 2
    ? `${currentStreak} days in a row${longestStreak > currentStreak ? `  ·  best ${longestStreak}` : ''}`
    : currentStreak === 1
      ? 'First card of a new streak'
      : 'Pull a card to start a streak';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>YOUR CARD FOR TODAY</Text>
      <TouchableOpacity style={styles.row} onPress={onTap} activeOpacity={0.85}>
        {!revealed ? (
          <View style={styles.cardBack}>
            <Text style={styles.cardBackGlyph}>✦</Text>
          </View>
        ) : (
          <View style={[styles.cardFace, card.reversed && styles.cardFaceReversed]}>
            <Text style={styles.cardSymbol}>{card.card.symbol}</Text>
            <Text style={styles.cardName} numberOfLines={2}>{card.card.name}</Text>
            {card.reversed && <Text style={styles.reversedBadge}>↓ reversed</Text>}
          </View>
        )}
        <View style={styles.right}>
          {!revealed ? (
            <>
              <Text style={styles.tapPrompt}>Tap to draw your card</Text>
              <Text style={styles.streakHint}>{streakLine}</Text>
            </>
          ) : (
            <>
              <Text style={styles.cardKeyword}>{card.reversed ? card.card.reversed : card.card.upright}</Text>
              <Text style={styles.tapForMore}>Tap card for plain-English meaning →</Text>
              <Text style={styles.streakHint}>{streakLine}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TarotCardDetailModal
        drawn={detailOpen ? card : null}
        positionLabel="Today's card"
        onClose={() => setDetailOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },

  cardBack: { width: 70, height: 100, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '60', backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },
  cardBackGlyph: { fontSize: 28, color: Colors.gold, fontFamily: Fonts.cinzel },

  cardFace: { width: 70, height: 100, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 },
  cardFaceReversed: { transform: [{ rotate: '180deg' }] },
  cardSymbol: { fontSize: 22, color: Colors.gold, fontFamily: Fonts.cinzel },
  cardName: { fontSize: 9, color: Colors.star, fontFamily: Fonts.cinzel, textAlign: 'center', letterSpacing: 0.3 },
  reversedBadge: { fontSize: 8, color: Colors.amber, fontFamily: Fonts.cinzel, letterSpacing: 0.5 },

  right: { flex: 1, gap: 4 },
  tapPrompt: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  cardKeyword: { fontSize: 13, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 19, opacity: 0.95 },
  tapForMore: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cinzel, opacity: 0.85, letterSpacing: 0.5, marginTop: 2 },
  streakHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
});
