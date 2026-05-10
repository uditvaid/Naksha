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
    // When mounted inside a Modal, close it first and wait for the iOS
    // modal-dismiss animation to clear (~250ms) before navigating —
    // without that, the nav animation collides with the modal
    // animation and the transition feels jarring (and on iOS the
    // navigation can happen *under* the still-dismissing modal).
    // When mounted on a regular screen there's no modal to wait for,
    // so navigate immediately for a snappier response.
    const navigate = () => {
      if (isPremium) router.push('/(tabs)/guru');
      else router.push('/paywall');
    };
    if (onClose) {
      onClose();
      setTimeout(navigate, 250);
    } else {
      navigate();
    }
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
