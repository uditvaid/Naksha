/**
 * Saturn's testing period card — surfaces classical Sade Sati / Ashtama
 * Sani / Kantaka Sani transits in plain English.
 *
 * Renders nothing when the user isn't currently in any of these transits
 * (~50% of users). Only appears when Prokerala flags is_in_sade_sati=true.
 *
 * Mounts on Chart → Dashas tab, above the dasha rows. Saturn-cycle context
 * pairs naturally with dasha-period context — both are about "what time
 * shape are you in right now."
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useSadeSati, phaseDetail } from '@lib/sadeSati';
import type { BirthData } from '@store/userStore';

interface Props {
  birthData: BirthData | null | undefined;
}

export function SadeSatiCard({ birthData }: Props) {
  const [open, setOpen] = useState(false);
  const data = useSadeSati(birthData);

  // Render-or-skip — the whole point is silence when there's nothing to say.
  if (!data || !data.isInTransit) return null;

  const detail = phaseDetail(data.phase);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>SATURN'S TESTING PERIOD</Text>
      <TouchableOpacity style={styles.card} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.shortLabel}>{detail.shortLabel}</Text>
        <Text style={styles.blurb}>{detail.cardBlurb}</Text>
        <Text style={styles.tapHint}>Tap for context →</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saturn's Testing Period</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
            <Text style={styles.modalSubtitle}>{detail.modalSubtitle}</Text>

            <Text style={styles.modalSectionTitle}>WHAT THIS IS</Text>
            <Text style={styles.modalParagraph}>
              Saturn moves slowly through the 12 signs of the sky, taking about 2.5 years per sign. When Saturn occupies certain positions relative to your natal Moon, you go through a known testing period that classical Vedic astrology has mapped for thousands of years. You're in one of those periods now.
            </Text>

            <Text style={styles.modalSectionTitle}>THE CURRENT TRANSIT</Text>
            <Text style={styles.modalParagraph}>{detail.modalExplanation}</Text>

            <Text style={styles.modalSectionTitle}>WHAT THIS PERIOD REWARDS</Text>
            {detail.rewards.map((line, i) => (
              <View key={`r-${i}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}

            <Text style={styles.modalSectionTitle}>WHAT TO BE CAREFUL WITH</Text>
            {detail.cautions.map((line, i) => (
              <View key={`c-${i}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}

            <Text style={[styles.modalParagraph, { marginTop: Spacing.md }]}>
              {detail.durationNote}
            </Text>

            {data.description ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.classicalLabel}>CLASSICAL PERSPECTIVE</Text>
                <Text style={styles.classicalText}>{data.description.trim()}</Text>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.amber, fontFamily: Fonts.cinzel, marginBottom: 8 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.amber + '60', borderRadius: Radius.lg, padding: Spacing.md, gap: 8 },
  shortLabel: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  blurb: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, opacity: 0.85 },
  tapHint: { fontSize: 11, color: Colors.amber, fontFamily: Fonts.cinzel, opacity: 0.8, letterSpacing: 0.5, marginTop: 2 },

  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalSubtitle: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.amber, letterSpacing: 0.3, marginBottom: 4 },
  modalSectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.amber, fontFamily: Fonts.cinzel, marginTop: Spacing.md, marginBottom: 8 },
  modalParagraph: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, opacity: 0.9, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  bulletDot: { fontSize: 16, color: Colors.amber, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, opacity: 0.9 },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.md },
  classicalLabel: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  classicalText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 19, opacity: 0.85 },
});
