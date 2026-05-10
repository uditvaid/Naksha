/**
 * Reusable "Chat with the Guru" CTA placed at the bottom of every reading
 * surface. Tapping it seeds the Guru's input with a context-specific prompt
 * and navigates to the Guru tab. The user lands inside the chat with their
 * question half-written — they finish the sentence and send.
 *
 * Usage:
 *   <AskGuruButton seed="I just read my numerology profile. " />
 *
 * Convention: seeds end with a trailing space so the user types directly
 * after, no awkward break.
 */

import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

interface Props {
  /** Seed text dropped into the Guru input. Should end with a trailing
   *  space (or natural punctuation) so the user can type immediately. */
  seed: string;
  /** Optional override for the button label. */
  label?: string;
  /** Required when the button is mounted inside a Modal — the parent
   *  must pass its dismiss callback so we can close the modal *before*
   *  navigating to the Guru tab. Without this, navigation happens
   *  underneath the modal and the user sees nothing. */
  onClose?: () => void;
  /** Optional inline style override. Caller usually doesn't need this. */
  style?: object;
}

export function AskGuruButton({ seed, label, onClose, style }: Props) {
  const setPendingGuruContext = useAppStore(s => s.setPendingGuruContext);
  const isPremium = useAppStore(s => s.user.isPremium);

  const onPress = () => {
    setPendingGuruContext(seed);
    // Close the parent modal first (if there is one), then navigate.
    // The 250ms delay matches the iOS modal-dismiss animation duration
    // — without it, the navigation animation collides with the modal
    // animation and feels jarring. Mirrors the existing pattern in
    // app/(tabs)/chart.tsx:handleAskGuru.
    onClose?.();
    setTimeout(() => {
      if (isPremium) {
        router.push('/(tabs)/guru');
      } else {
        // Non-premium users land on paywall — Guru is gated.
        router.push('/paywall');
      }
    }, 250);
  };

  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.icon}>🔱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label ?? 'Ask follow-up questions about this reading'}</Text>
          <Text style={styles.sub}>Take it deeper with the Guru →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.goldDim,
    borderWidth: 1,
    borderColor: Colors.gold + '60',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  label: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  arrow: { fontSize: 18, color: Colors.gold },
});
