/**
 * Audio playback button for the daily cosmic reading.
 *
 * Uses expo-speech (native iOS/Android TTS) — no network, no API cost.
 * Quality is system-tier rather than ElevenLabs-tier, but it's the
 * fastest path to shipping the feature, and the bar to beat is "no
 * audio at all", which is where every Vedic competitor currently sits.
 *
 * Premium-gated. Non-premium users see the button styled as a teaser
 * and tapping routes them to the paywall — the actual playback is
 * gated to maintain the premium value proposition Chani relies on.
 */

import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { Colors, Fonts, Radius } from '@constants/theme';

interface Props {
  /** Prose to read aloud. If empty (or only whitespace) the button is
   *  disabled — there's nothing to play. */
  reading: string;
  /** Premium gate. When false, tapping routes to paywall instead of
   *  starting playback. */
  isPremium: boolean;
  /** Whether the containing surface is open. When this transitions to
   *  false (modal dismissed, tab navigated away), any in-flight playback
   *  is stopped. React Native Modal keeps its children mounted when
   *  `visible` is false, so we can't rely on the unmount cleanup alone
   *  — without this prop, audio would keep talking after the user
   *  closes the modal. */
  active: boolean;
  /** Optional: invoked when the user kicks off playback. Useful for
   *  analytics or for collapsing other modals first. */
  onPlay?: () => void;
}

/**
 * TTS prep — coax the system TTS engine into reading prose naturally:
 *   - Em-dash and en-dash both become commas (iOS would say "dash")
 *   - Ellipsis becomes a period + space so the reader pauses cleanly
 *     instead of stumbling on "dot dot dot"
 *   - Smart quotes / smart apostrophes are normalised to plain ASCII
 *   - Parentheses are dropped (TTS treats them as silence and the
 *     parenthetical content reads choppy) — the inner text remains
 *   - Paragraph breaks become period + space
 *   - All whitespace collapses
 *   - Leading/trailing whitespace trimmed
 */
function prepareForSpeech(text: string): string {
  return text
    .replace(/[—–]/g, ',')          // em & en dash → comma
    .replace(/…/g, '. ')             // single-glyph ellipsis
    .replace(/\.\.\./g, '. ')        // typed three-dot ellipsis
    .replace(/[‘’]/g, "'") // curly single quotes → '
    .replace(/[“”]/g, '"') // curly double quotes → "
    .replace(/[()]/g, '')            // drop parentheses, keep inner text
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function DailyReadingAudioButton({ reading, isPremium, active, onPlay }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop any in-flight speech if the component unmounts mid-playback
  // (e.g. parent screen unmounts entirely). Best-effort — Speech.stop
  // rejects silently if nothing is playing.
  useEffect(() => {
    return () => {
      Speech.stop().catch(() => { /* no-op — stop is best-effort */ });
    };
  }, []);

  // Stop playback when the containing surface closes. React Native Modal
  // keeps children mounted on `visible={false}`, so the unmount cleanup
  // above won't fire when the user dismisses the cosmic-reading modal —
  // we have to explicitly react to `active` going false.
  useEffect(() => {
    if (!active && isPlaying) {
      Speech.stop().catch(() => {});
      setIsPlaying(false);
    }
  }, [active, isPlaying]);

  // Stop TTS when the app backgrounds. iOS doesn't auto-pause expo-speech
  // (we don't declare audio in UIBackgroundModes), so without this the
  // narration continues until the OS suspends the process — and the
  // visible isPlaying state desyncs from reality. On resume the user
  // would see "Stop" with no audio playing.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        Speech.stop().catch(() => {});
        setIsPlaying(false);
      }
    });
    return () => sub.remove();
  }, []);

  const handlePress = useCallback(async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (isPlaying) {
      await Speech.stop().catch(() => {});
      setIsPlaying(false);
      return;
    }
    const cleaned = prepareForSpeech(reading);
    if (!cleaned) return;
    onPlay?.();
    setIsPlaying(true);
    Speech.speak(cleaned, {
      // Slightly slower than default so the reading feels meditative,
      // not breathless. Tested informally against Chani's pace.
      rate: 0.92,
      pitch: 1.0,
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  }, [isPlaying, isPremium, reading, onPlay]);

  const disabled = !reading.trim();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isPlaying && styles.btnPlaying,
        disabled && styles.btnDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityLabel={
        isPlaying
          ? 'Stop reading aloud'
          : isPremium
          ? 'Listen to today\'s reading aloud'
          : 'Listen to today\'s reading aloud (premium feature)'
      }
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: isPlaying }}
    >
      <Text style={styles.icon}>{isPlaying ? '◼' : '▶'}</Text>
      <View>
        <Text style={styles.label}>
          {isPlaying ? 'Stop' : 'Listen'}
        </Text>
        {!isPremium && (
          <Text style={styles.premiumHint}>PREMIUM</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.goldDim,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  btnPlaying: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201,168,76,0.22)',
  },
  btnDisabled: { opacity: 0.4 },
  icon: { fontSize: 12, color: Colors.gold },
  label: {
    fontSize: 11, color: Colors.gold,
    fontFamily: Fonts.cinzel, letterSpacing: 0.8,
  },
  premiumHint: {
    fontSize: 8, color: Colors.gold,
    fontFamily: Fonts.cinzel, letterSpacing: 1,
    opacity: 0.7, marginTop: 1,
  },
});
