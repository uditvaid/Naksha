/**
 * Classical chart markers card — Mangal Dosha + Kalsarpa Yoga.
 *
 * Renders nothing when neither is present (the silent-when-not-applicable
 * pattern). When at least one is present, shows a small Chart-screen card
 * that opens a modal explaining what each means in plain English.
 *
 * Mounts on Chart screen overview. The classical "doshas" framing is kept
 * because that's the canonical name for these markers, but every body
 * paragraph is plain English — no Sanskrit standing alone.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useDoshaPanel, MANGAL_EXPLAIN, KALSARPA_EXPLAIN } from '@lib/doshas';
import type { BirthData, ChartData } from '@store/userStore';

interface Props {
  birthData: BirthData | null | undefined;
  chart: ChartData | null;
}

export function DoshaCard({ birthData, chart }: Props) {
  const [open, setOpen] = useState(false);
  const data = useDoshaPanel(birthData, chart);

  if (!data) return null;
  const { mangal, kalsarpa } = data;

  // Render-or-skip — both null/false ⇒ nothing on screen.
  const mangalActive = !!mangal?.hasDosha;
  const kalsarpaActive = kalsarpa.hasDosha;
  if (!mangalActive && !kalsarpaActive) return null;

  // Card summary — short labels for each active dosha.
  const labels: string[] = [];
  if (mangalActive) labels.push('Mangal Dosha');
  if (kalsarpaActive) labels.push(kalsarpa.subTypeSanskrit ?? 'Kalsarpa Yoga');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CLASSICAL CHART MARKERS</Text>
      <TouchableOpacity style={styles.card} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.cardLabel}>{labels.join('  ·  ')}</Text>
        <Text style={styles.cardBlurb}>
          {mangalActive && kalsarpaActive
            ? "Two classical markers in your chart. Tap for plain-English context on what each means."
            : mangalActive
              ? "A Mars-related marker classical Vedic tradition watches in partnership matters."
              : "A Rahu-Ketu axis configuration classical tradition treats as a long-game shape."}
        </Text>
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
            <Text style={styles.modalTitle}>Classical Chart Markers</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
            <Text style={styles.modalIntro}>
              Vedic astrology names a few "doshas" — patterns in a natal chart classical tradition flags as worth understanding. They're not curses or verdicts; they're shapes that ask for awareness.
            </Text>

            {/* ── Mangal Dosha section ─────────────────────────────────── */}
            {mangalActive && (
              <>
                <Text style={styles.sectionHeader}>MANGAL DOSHA · PRESENT</Text>
                <Text style={styles.subhead}>What this is</Text>
                <Text style={styles.paragraph}>{MANGAL_EXPLAIN.whatItIs}</Text>
                <Text style={styles.subhead}>What it tends to bring</Text>
                <Text style={styles.paragraph}>{MANGAL_EXPLAIN.ifPresent}</Text>
                {mangal?.description ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.classicalLabel}>CLASSICAL PERSPECTIVE</Text>
                    <Text style={styles.classicalText}>{mangal.description}</Text>
                  </>
                ) : null}
              </>
            )}

            {/* ── Kalsarpa Yoga section ────────────────────────────────── */}
            {kalsarpaActive && (
              <>
                <Text style={styles.sectionHeader}>
                  {kalsarpa.isPartial ? 'PARTIAL KALSARPA · PRESENT' : 'KALSARPA YOGA · PRESENT'}
                </Text>
                {kalsarpa.subTypeLabel ? (
                  <Text style={styles.subType}>{kalsarpa.subTypeLabel}</Text>
                ) : null}
                <Text style={styles.subhead}>What this is</Text>
                <Text style={styles.paragraph}>{KALSARPA_EXPLAIN.whatItIs}</Text>
                <Text style={styles.subhead}>What it tends to bring</Text>
                <Text style={styles.paragraph}>
                  {kalsarpa.isPartial ? KALSARPA_EXPLAIN.partial : KALSARPA_EXPLAIN.ifPresent}
                </Text>
                {kalsarpa.subTypeLabel ? (
                  <Text style={styles.paragraph}>
                    {KALSARPA_EXPLAIN.themes(kalsarpa.subTypeLabel.split(' — ')[1] || '')}
                  </Text>
                ) : null}
              </>
            )}

            {/* ── Mangal absent (only relevant when ONLY kalsarpa active) ── */}
            {!mangalActive && kalsarpaActive && (
              <>
                <View style={styles.divider} />
                <Text style={styles.classicalLabel}>OTHER MARKERS CHECKED</Text>
                <Text style={styles.classicalText}>Mangal Dosha: {MANGAL_EXPLAIN.ifAbsent}</Text>
              </>
            )}

            <Text style={styles.modalFooter}>
              These markers describe shapes in the chart, not destinies. Awareness of the pattern is what classical tradition treats as the actual remedy.
            </Text>
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
  cardLabel: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  cardBlurb: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, opacity: 0.85 },
  tapHint: { fontSize: 11, color: Colors.amber, fontFamily: Fonts.cinzel, opacity: 0.8, letterSpacing: 0.5, marginTop: 2 },

  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalIntro: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 22, marginBottom: Spacing.md },
  sectionHeader: { fontSize: 12, letterSpacing: 2, color: Colors.amber, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 8 },
  subType: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, letterSpacing: 0.3, marginBottom: 8 },
  subhead: { fontSize: 11, letterSpacing: 1.5, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.md, marginBottom: 4 },
  paragraph: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, opacity: 0.9, marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.md },
  classicalLabel: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  classicalText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 19, opacity: 0.85 },
  modalFooter: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 18, marginTop: Spacing.md, opacity: 0.7, textAlign: 'center' },
});
