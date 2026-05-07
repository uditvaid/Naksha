/**
 * Deterministic Ashta-koota score card for the Compatibility screen.
 *
 * Replaces the regex-parsed-from-Claude-prose score with an authoritative
 * Prokerala fetch. Renders nothing while loading; once data arrives it
 * shows the X/36 score, a verdict band, and a "tap for breakdown" hint.
 *
 * The drill-down modal is the *real* surface — 8 koota areas sorted
 * highest-match-first, each with the classical description from Prokerala
 * and a plain-English heading. Mangal Dosha summary at the bottom covers
 * the second piece of data this endpoint returns.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useAshtaKoota, kootaTranslation, scoreBand, kootaQuality, summarise } from '@lib/ashtaKoota';
import type { BirthData } from '@store/userStore';

interface Props {
  me: BirthData | null | undefined;
  partner: BirthData | null | undefined;
  partnerDisplayName: string;
}

const TONE_COLOR = {
  excellent: Colors.gold,
  compatible: Colors.amber,
  challenging: Colors.muted,
} as const;

const QUALITY_COLOR = {
  excellent: Colors.gold,
  partial: Colors.amber,
  weak: Colors.muted,
} as const;

export function AshtakootaCard({ me, partner, partnerDisplayName }: Props) {
  const [open, setOpen] = useState(false);
  const data = useAshtaKoota(me, partner);

  if (!data) return null;

  const band = scoreBand(data.totalPoints, data.maximumPoints);
  const tone = TONE_COLOR[band.tone];
  const summary = summarise(data.areas);

  // Sort areas by match quality desc — strong matches first creates a
  // natural reading order: "here's what's working" before "here's what
  // takes work."
  const sortedAreas = [...data.areas].sort((a, b) => {
    const ra = a.maximumPoints > 0 ? a.obtainedPoints / a.maximumPoints : 0;
    const rb = b.maximumPoints > 0 ? b.obtainedPoints / b.maximumPoints : 0;
    return rb - ra;
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ASHTAKOOTA COMPATIBILITY</Text>
      <TouchableOpacity style={[styles.card, { borderColor: tone + '70' }]} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: tone }]}>{data.totalPoints}</Text>
          <Text style={styles.scoreSlash}>/{data.maximumPoints}</Text>
        </View>
        <Text style={[styles.bandLabel, { color: tone }]}>{band.label}</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, { color: Colors.gold }]}>✓ {summary.strong} strong</Text>
          <Text style={[styles.summaryItem, { color: Colors.amber }]}>◐ {summary.partial} partial</Text>
          <Text style={[styles.summaryItem, { color: Colors.muted }]}>✗ {summary.weak} weak</Text>
        </View>
        <Text style={styles.tapHint}>Tap for the 8-area breakdown →</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ashtakoota Breakdown</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
            <Text style={styles.modalSubtitle}>
              {data.totalPoints} / {data.maximumPoints} · {band.label}
            </Text>
            {data.verdict ? (
              <Text style={styles.verdictText}>{data.verdict}</Text>
            ) : null}

            <Text style={styles.modalSectionTitle}>THE 8 AREAS</Text>
            <Text style={styles.modalIntro}>
              Each area measures a different dimension of compatibility — from spiritual temperament to physical bond to family direction. Sorted from strongest match to weakest.
            </Text>

            {sortedAreas.map((area) => {
              const t = kootaTranslation(area.id);
              const q = kootaQuality(area.obtainedPoints, area.maximumPoints);
              const qColor = QUALITY_COLOR[q];
              return (
                <View key={area.id} style={styles.areaCard}>
                  <View style={styles.areaHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.areaPlainName}>{t.plainName}</Text>
                      {t.sanskritName ? (
                        <Text style={styles.areaSanskrit}>{t.sanskritName}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.areaPoints, { color: qColor }]}>
                      {area.obtainedPoints}/{area.maximumPoints}
                    </Text>
                  </View>
                  {t.measures ? (
                    <Text style={styles.areaMeasures}>{t.measures}</Text>
                  ) : null}
                  <Text style={styles.areaPair}>
                    {(me?.name || 'You')}: {area.girlBucket}  ·  {partnerDisplayName || 'Partner'}: {area.boyBucket}
                  </Text>
                  <Text style={styles.areaDescription}>{area.description}</Text>
                </View>
              );
            })}

            {/* Mangal Dosha summary — comes from the same endpoint, so we
                surface it here. The standalone Mangal Dosha card on Chart
                screen (#5 on the roadmap) will use the same data shape. */}
            <Text style={styles.modalSectionTitle}>MANGAL DOSHA</Text>
            <Text style={styles.modalIntro}>
              Classical Vedic checks for Mars-related challenges that affect partnerships. Both partners are evaluated.
            </Text>
            <View style={styles.doshaRow}>
              <View style={styles.doshaCard}>
                <Text style={styles.doshaWho}>{me?.name || 'You'}</Text>
                <Text style={[styles.doshaStatus, { color: data.girlMangalDosha.hasDosha ? Colors.amber : Colors.gold }]}>
                  {data.girlMangalDosha.hasDosha ? 'Has Mangal Dosha' : 'No Mangal Dosha'}
                </Text>
                {data.girlMangalDosha.description ? (
                  <Text style={styles.doshaText}>{data.girlMangalDosha.description}</Text>
                ) : null}
              </View>
              <View style={styles.doshaCard}>
                <Text style={styles.doshaWho}>{partnerDisplayName || 'Partner'}</Text>
                <Text style={[styles.doshaStatus, { color: data.boyMangalDosha.hasDosha ? Colors.amber : Colors.gold }]}>
                  {data.boyMangalDosha.hasDosha ? 'Has Mangal Dosha' : 'No Mangal Dosha'}
                </Text>
                {data.boyMangalDosha.description ? (
                  <Text style={styles.doshaText}>{data.boyMangalDosha.description}</Text>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center', gap: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNumber: { fontSize: 48, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  scoreSlash: { fontSize: 20, color: Colors.muted, fontFamily: Fonts.cinzel },
  bandLabel: { fontSize: 13, fontFamily: Fonts.cinzel, letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  summaryItem: { fontSize: 11, fontFamily: Fonts.cinzel, letterSpacing: 0.5 },
  tapHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel, marginTop: 4, letterSpacing: 0.5 },

  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalSubtitle: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  verdictText: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, marginTop: 8, opacity: 0.9, fontStyle: 'italic' },
  modalSectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 8 },
  modalIntro: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20, marginBottom: Spacing.md },

  areaCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: 4 },
  areaHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  areaPlainName: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  areaSanskrit: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel, letterSpacing: 0.5, marginTop: 2 },
  areaPoints: { fontSize: 18, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },
  areaMeasures: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, fontStyle: 'italic', lineHeight: 18, marginTop: 4 },
  areaPair: { fontSize: 12, color: Colors.amber, fontFamily: Fonts.cinzel, letterSpacing: 0.3, marginTop: 6, opacity: 0.85 },
  areaDescription: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20, marginTop: 6, opacity: 0.85 },

  doshaRow: { flexDirection: 'row', gap: Spacing.sm },
  doshaCard: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  doshaWho: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  doshaStatus: { fontSize: 12, fontFamily: Fonts.cinzel, letterSpacing: 0.5, marginTop: 4 },
  doshaText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 18, marginTop: 4, opacity: 0.85 },
});
