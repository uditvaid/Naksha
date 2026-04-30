/**
 * Guru Layer 13 — Compounding Relationship Surface
 *
 * Shows what has built up between the user and the Guru over time:
 * - What the Guru remembers (editable facts, threads, open questions)
 * - Arc: growth observations, unclaimed strengths, developed capacities
 * - Patterns screen: archetype context + relationship phase
 */

import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useGuruMemoryStore } from '@store/guruMemoryStore';
import { useGuruArcStore } from '@store/guruArcStore';
import { useGuruRelationshipStore } from '@store/guruRelationshipStore';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@store/userStore';
import { deriveArchetype } from '@lib/persona/archetype';

type Tab = 'memory' | 'arc' | 'patterns';

const TAB_LABELS: Record<Tab, string> = {
  memory: 'Memory',
  arc: 'Arc',
  patterns: 'Patterns',
};

export default function GuruRelationshipScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('memory');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>What the Guru Holds</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabRow}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'arc' && <ArcTab />}
        {activeTab === 'patterns' && <PatternsTab />}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MemoryTab() {
  const { facts, threads, openQuestions, noticedButUnspoken, deleteFact, deleteThread } =
    useGuruMemoryStore(useShallow(s => ({
      facts: s.facts,
      threads: s.threads,
      openQuestions: s.openQuestions,
      noticedButUnspoken: s.noticedButUnspoken,
      deleteFact: s.deleteFact,
      deleteThread: s.deleteThread,
    })));

  const grouped = useMemo(() => {
    const groups: Record<string, typeof facts> = {};
    for (const f of facts) {
      (groups[f.category] ??= []).push(f);
    }
    return groups;
  }, [facts]);

  const confirmDelete = (label: string, onConfirm: () => void) => {
    Alert.alert(
      'Remove from Memory',
      `Remove "${label}"? The Guru won\'t reference this anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onConfirm },
      ]
    );
  };

  if (facts.length === 0 && threads.length === 0 && openQuestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          The Guru builds memory through your conversations. Start talking and this will fill in over time.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Facts by category */}
      {Object.entries(grouped).map(([category, categoryFacts]) => (
        <View key={category} style={styles.card}>
          <Text style={styles.cardLabel}>{category.toUpperCase()}</Text>
          {categoryFacts.map(f => (
            <View key={f.id} style={styles.factRow}>
              <Text style={styles.factText} numberOfLines={2}>{f.content}</Text>
              <TouchableOpacity
                onPress={() => confirmDelete(f.content.slice(0, 40), () => deleteFact(f.id))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      {/* Active threads */}
      {threads.filter(t => t.status === 'active').length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>OPEN THREADS</Text>
          {threads.filter(t => t.status === 'active').map(t => (
            <View key={t.id} style={styles.factRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.factText}>{t.title}</Text>
                <Text style={styles.factMeta} numberOfLines={2}>{t.summary}</Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(t.title, () => deleteThread(t.id))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Open questions */}
      {openQuestions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>QUESTIONS HELD OPEN</Text>
          {openQuestions.map(q => (
            <View key={q.id} style={styles.questionRow}>
              <Text style={styles.questionMark}>?</Text>
              <Text style={[styles.factText, { flex: 1 }]}>{q.question}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Noticed but unspoken */}
      {noticedButUnspoken.filter(n => n.readyToSurface).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WAITING TO SURFACE</Text>
          <Text style={styles.cardNote}>
            Things the Guru has noticed but hasn't said yet.
          </Text>
          {noticedButUnspoken.filter(n => n.readyToSurface).map(n => (
            <Text key={n.id} style={styles.faceMeta}>{n.observation}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ArcTab() {
  const { growthObservations, unclaimedStrengths, developedCapacities, stuckPoints, arcSummaries } =
    useGuruArcStore(useShallow(s => ({
      growthObservations: s.growthObservations,
      unclaimedStrengths: s.unclaimedStrengths,
      developedCapacities: s.developedCapacities,
      stuckPoints: s.stuckPoints,
      arcSummaries: s.arcSummaries,
    })));

  const arc = { growthObservations, unclaimedStrengths, developedCapacities, stuckPoints, arcSummaries };

  const hasContent = growthObservations.length > 0 ||
    unclaimedStrengths.length > 0 ||
    developedCapacities.length > 0 ||
    stuckPoints.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          Your arc builds through sustained engagement with the Guru. It captures growth, patterns, and capacities over time.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {arc.arcSummaries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>YOUR JOURNEY</Text>
          <Text style={styles.cardBody}>{arc.arcSummaries[0]!.content}</Text>
          <Text style={styles.cardNote}>Generated {arc.arcSummaries[0]!.generatedDate}</Text>
        </View>
      )}

      {arc.growthObservations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>GROWTH OBSERVED</Text>
          {arc.growthObservations.slice(0, 5).map(g => (
            <View key={g.id} style={styles.growthRow}>
              <View style={[styles.confidenceDot, { backgroundColor: g.confidence === 'high' ? Colors.gold : Colors.muted }]} />
              <Text style={styles.factText} numberOfLines={3}>{g.observation}</Text>
            </View>
          ))}
        </View>
      )}

      {arc.unclaimedStrengths.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>UNCLAIMED STRENGTHS</Text>
          <Text style={styles.cardNote}>Things the Guru sees that you may not fully own yet.</Text>
          {arc.unclaimedStrengths.map(s => (
            <Text key={s.id} style={styles.strengthText}>◇ {s.strength}</Text>
          ))}
        </View>
      )}

      {arc.developedCapacities.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DEVELOPED CAPACITIES</Text>
          <Text style={styles.cardNote}>What has become more available to you over time.</Text>
          {arc.developedCapacities.map(c => (
            <Text key={c.id} style={styles.capacityText}>◆ {c.capacity}</Text>
          ))}
        </View>
      )}

      {arc.stuckPoints.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RECURRING PATTERNS</Text>
          {arc.stuckPoints.map(p => (
            <View key={p.id} style={styles.stuckRow}>
              <Text style={styles.factText}>{p.pattern}</Text>
              <Text style={styles.factMeta}>Seen {p.occurrences}×</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PatternsTab() {
  const phase = useGuruRelationshipStore(s => s.phase);
  const sessionDays = useGuruRelationshipStore(s => s.sessionDays);
  const chart = useAppStore(s => s.user.chart);

  const archetype = useMemo(
    () => chart ? deriveArchetype(chart) : null,
    [chart]
  );

  const phaseDescriptions: Record<string, string> = {
    initiation: 'You and the Guru are still establishing the relationship. The Guru is learning who you are and how to be most useful.',
    building: 'Patterns are beginning to emerge. The Guru is adapting its voice and depth to how you engage.',
    established: 'The Guru knows you well. Conversations go deeper because there is context built up on both sides.',
    deep: 'A mature relationship. The Guru can surface patterns, hold contradictions, and speak with more directness.',
  };

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>RELATIONSHIP PHASE</Text>
        <Text style={styles.phaseTitle}>{phase}</Text>
        <Text style={styles.cardBody}>{phaseDescriptions[phase] ?? ''}</Text>
        <Text style={styles.cardNote}>{sessionDays} session{sessionDays !== 1 ? 's' : ''} together</Text>
      </View>

      {archetype && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>GURU ARCHETYPE</Text>
          <Text style={styles.phaseTitle}>{archetype.name}</Text>
          <Text style={styles.cardBody}>{archetype.teachingMethod}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.midnight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: Colors.gold,
    fontFamily: Fonts.crimson,
    fontSize: 15,
  },
  title: {
    color: Colors.star,
    fontFamily: Fonts.cinzel,
    fontSize: 15,
    letterSpacing: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold,
  },
  tabText: {
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    fontSize: 13,
  },
  tabTextActive: {
    color: Colors.gold,
  },
  body: {
    flex: 1,
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardLabel: {
    color: Colors.muted,
    fontFamily: Fonts.cinzel,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  cardBody: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 15,
    lineHeight: 22,
  },
  cardNote: {
    color: Colors.mutedDark,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 13,
    lineHeight: 18,
  },
  phaseTitle: {
    color: Colors.gold,
    fontFamily: Fonts.cinzel,
    fontSize: 16,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  factText: {
    flex: 1,
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 14,
    lineHeight: 20,
  },
  factMeta: {
    color: Colors.muted,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 12,
    lineHeight: 18,
  },
  faceMeta: {
    color: Colors.muted,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 4,
  },
  deleteBtn: {
    color: Colors.muted,
    fontSize: 14,
    paddingLeft: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  questionMark: {
    color: Colors.gold,
    fontFamily: Fonts.cinzel,
    fontSize: 14,
    width: 16,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  strengthText: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 4,
  },
  capacityText: {
    color: Colors.gold,
    fontFamily: Fonts.crimson,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 4,
  },
  stuckRow: {
    paddingVertical: 6,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.muted,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
