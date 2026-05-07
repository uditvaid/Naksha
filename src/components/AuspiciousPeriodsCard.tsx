/**
 * Today's auspicious / inauspicious time windows on Home screen.
 *
 * Two-column card. Left column: auspicious (green-tinted), right column:
 * avoid (amber-tinted). Tap → modal with plain-English explanation of
 * each muhurat's purpose.
 *
 * Renders nothing while data is loading or if the API call fails — never
 * blocks home-screen first paint.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useAuspiciousPeriods, muhuratDetail, formatWindows } from '@lib/auspiciousPeriods';
import type { BirthData } from '@store/userStore';

interface Props {
  birthData: BirthData | null | undefined;
  nowTick: number;
}

export function AuspiciousPeriodsCard({ birthData, nowTick }: Props) {
  const [open, setOpen] = useState(false);
  const data = useAuspiciousPeriods(birthData, nowTick);

  if (!data || (data.auspicious.length === 0 && data.inauspicious.length === 0)) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TODAY'S TIME WINDOWS</Text>
      <TouchableOpacity style={styles.card} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <View style={styles.columnsRow}>
          {/* Auspicious column */}
          <View style={styles.column}>
            <Text style={[styles.columnHeader, { color: Colors.gold }]}>✦ AUSPICIOUS</Text>
            {data.auspicious.slice(0, 3).map((m) => {
              const d = muhuratDetail(m.name);
              return (
                <View key={`a-${m.id}`} style={styles.windowRow}>
                  <Text style={styles.windowLabel} numberOfLines={2}>{d.shortLabel}</Text>
                  <Text style={styles.windowTime} numberOfLines={1}>{formatWindows(m.windows)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Inauspicious column */}
          <View style={styles.column}>
            <Text style={[styles.columnHeader, { color: Colors.amber }]}>⚠ AVOID</Text>
            {data.inauspicious.slice(0, 3).map((m) => {
              const d = muhuratDetail(m.name);
              return (
                <View key={`i-${m.id}`} style={styles.windowRow}>
                  <Text style={styles.windowLabel} numberOfLines={2}>{d.shortLabel}</Text>
                  <Text style={styles.windowTime} numberOfLines={1}>{formatWindows(m.windows)}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <Text style={styles.tapHint}>Tap for what each window means →</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Today's Time Windows</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
            <Text style={styles.modalIntro}>
              Vedic almanacs divide the day into windows that classical tradition treats as more or less favorable for action. These shift slightly each day with sunrise and sunset.
            </Text>

            <Text style={[styles.modalSectionTitle, { color: Colors.gold }]}>✦ AUSPICIOUS WINDOWS</Text>
            {data.auspicious.map((m) => {
              const d = muhuratDetail(m.name);
              return (
                <View key={`am-${m.id}`} style={[styles.detailCard, { borderColor: Colors.gold + '40' }]}>
                  <Text style={styles.detailLabel}>{d.shortLabel}</Text>
                  <Text style={styles.detailSanskrit}>{d.sanskrit}</Text>
                  <Text style={[styles.detailTime, { color: Colors.gold }]}>
                    {formatWindows(m.windows)}
                  </Text>
                  {d.meaning ? <Text style={styles.detailMeaning}>{d.meaning}</Text> : null}
                </View>
              );
            })}

            <Text style={[styles.modalSectionTitle, { color: Colors.amber }]}>⚠ WINDOWS TO AVOID</Text>
            {data.inauspicious.map((m) => {
              const d = muhuratDetail(m.name);
              return (
                <View key={`im-${m.id}`} style={[styles.detailCard, { borderColor: Colors.amber + '40' }]}>
                  <Text style={styles.detailLabel}>{d.shortLabel}</Text>
                  <Text style={styles.detailSanskrit}>{d.sanskrit}</Text>
                  <Text style={[styles.detailTime, { color: Colors.amber }]}>
                    {formatWindows(m.windows)}
                  </Text>
                  {d.meaning ? <Text style={styles.detailMeaning}>{d.meaning}</Text> : null}
                </View>
              );
            })}

            <Text style={styles.modalFooter}>
              Use these as guidance, not gospel — they're a millennia-old framework for paying attention to the rhythm of the day, not strict rules.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, gap: 10 },
  columnsRow: { flexDirection: 'row', gap: 12 },
  column: { flex: 1, gap: 8 },
  columnHeader: { fontSize: 10, fontFamily: Fonts.cinzel, letterSpacing: 1.5, marginBottom: 4 },
  windowRow: { gap: 1 },
  windowLabel: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  windowTime: { fontSize: 11, fontFamily: Fonts.crimson, color: Colors.muted, opacity: 0.85 },
  divider: { width: 1, backgroundColor: Colors.cardBorder, opacity: 0.5 },
  tapHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel, marginTop: 4, letterSpacing: 0.5, textAlign: 'center' },

  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalIntro: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 22, marginBottom: Spacing.md },
  modalSectionTitle: { fontSize: 11, letterSpacing: 2, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 8 },
  detailCard: { backgroundColor: Colors.card, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  detailLabel: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  detailSanskrit: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 0.5, marginTop: 2 },
  detailTime: { fontSize: 15, fontFamily: Fonts.cinzel, letterSpacing: 0.3, marginTop: 8 },
  detailMeaning: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, opacity: 0.85, marginTop: 8 },
  modalFooter: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 18, marginTop: Spacing.md, opacity: 0.7, textAlign: 'center' },
});
