/**
 * Daily Layer 9 — Compounding Value Surface
 *
 * "What you've built over time" — shows the last 30 days of dailies,
 * active narrative threads, upcoming chart shifts, journal archive,
 * and the lunar cycle rhythm view. No streaks or counts that go up/down.
 */

import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useDailyContinuityStore, DailyRecord, JournalEntry, NarrativeThread } from '@store/dailyContinuityStore';
import { useAppStore } from '@store/userStore';
import { buildLunarCycleReflection } from '@lib/daily/lunarCycle';

type Tab = 'rhythm' | 'archive' | 'journal' | 'threads';

const TAB_LABELS: Record<Tab, string> = {
  rhythm: 'Rhythm',
  archive: 'Archive',
  journal: 'Journal',
  threads: 'Threads',
};

export default function CompoundingValueScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('rhythm');

  const dailyRecords = useDailyContinuityStore(s => s.dailyRecords);
  const journalEntries = useDailyContinuityStore(s => s.journalEntries);
  const narrativeThreads = useDailyContinuityStore(s => s.narrativeThreads);

  const chart = useAppStore(s => s.user.chart);

  const lunarReflection = useMemo(
    () => buildLunarCycleReflection(dailyRecords, new Date()),
    [dailyRecords]
  );

  const last30Days = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0]!;
    return dailyRecords.filter(r => r.date >= cutoffStr);
  }, [dailyRecords]);

  const activeThreads = useMemo(
    () => narrativeThreads.filter(t => t.status === 'active'),
    [narrativeThreads]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Practice</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
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
        {activeTab === 'rhythm' && (
          <RhythmTab lunarReflection={lunarReflection} last30Days={last30Days} />
        )}
        {activeTab === 'archive' && (
          <ArchiveTab records={last30Days} />
        )}
        {activeTab === 'journal' && (
          <JournalTab entries={journalEntries} />
        )}
        {activeTab === 'threads' && (
          <ThreadsTab threads={activeThreads} />
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RhythmTab({ lunarReflection, last30Days }: {
  lunarReflection: ReturnType<typeof buildLunarCycleReflection>;
  last30Days: DailyRecord[];
}) {
  const phaseLabel = lunarReflection.currentPhase.replace(/_/g, ' ');

  return (
    <View style={styles.section}>
      {/* Current phase */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CURRENT PHASE</Text>
        <Text style={styles.phaseTitle}>{phaseLabel}</Text>
        <Text style={styles.cardBody}>{lunarReflection.rhythmNote}</Text>
      </View>

      {/* Cycle observation */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>THIS CYCLE</Text>
        <Text style={styles.cardBody}>{lunarReflection.engagementPattern}</Text>
        {lunarReflection.phaseObservation ? (
          <Text style={styles.cardNote}>{lunarReflection.phaseObservation}</Text>
        ) : null}
      </View>

      {/* Last 30 days — qualitative only */}
      {last30Days.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RECENT TEXTURE</Text>
          <View style={styles.dotGrid}>
            {last30Days.slice(0, 30).map((r) => (
              <View
                key={r.id}
                style={[
                  styles.dot,
                  r.isDeepDay && styles.dotDeep,
                  r.isQuietDay && styles.dotQuiet,
                ]}
              />
            ))}
          </View>
          <View style={styles.dotLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { marginRight: 4 }]} />
              <Text style={styles.legendText}>regular</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotDeep, { marginRight: 4 }]} />
              <Text style={styles.legendText}>deep day</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotQuiet, { marginRight: 4 }]} />
              <Text style={styles.legendText}>quiet day</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ArchiveTab({ records }: { records: DailyRecord[] }) {
  if (records.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Your daily archive will appear here as you build a practice.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {records.map(r => (
        <View key={r.id} style={styles.archiveItem}>
          <View style={styles.archiveHeader}>
            <Text style={styles.archiveDate}>{r.date}</Text>
            <View style={styles.archiveBadges}>
              {r.isDeepDay && <View style={[styles.badge, styles.badgeDeep]}><Text style={styles.badgeText}>deep</Text></View>}
              {r.isQuietDay && <View style={[styles.badge, styles.badgeQuiet]}><Text style={styles.badgeText}>quiet</Text></View>}
              {r.hasCallback && <View style={[styles.badge, styles.badgeCallback]}><Text style={styles.badgeText}>callback</Text></View>}
            </View>
          </View>
          <Text style={styles.archiveCard} numberOfLines={3}>{r.card}</Text>
          <Text style={styles.archiveTone}>{r.tone} · {r.mahadasha}</Text>
        </View>
      ))}
    </View>
  );
}

function JournalTab({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          Your reflections appear here. Use the Reflect button on any daily card to start writing.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {entries.map(e => (
        <View key={e.id} style={styles.journalEntry}>
          <Text style={styles.journalDate}>{e.date}</Text>
          <Text style={styles.journalContent}>{e.content}</Text>
          {e.theme ? <Text style={styles.journalTheme}>{e.theme}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ThreadsTab({ threads }: { threads: NarrativeThread[] }) {
  if (threads.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          Narrative threads appear here as patterns emerge across your dailies and Guru conversations.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {threads.map(t => (
        <View key={t.id} style={styles.threadCard}>
          <Text style={styles.threadTitle}>{t.title}</Text>
          <Text style={styles.threadSummary}>{t.summary}</Text>
          <Text style={styles.threadDates}>Since {t.firstDate}</Text>
        </View>
      ))}
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
    fontSize: 16,
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
  phaseTitle: {
    color: Colors.gold,
    fontFamily: Fonts.cinzel,
    fontSize: 18,
    textTransform: 'capitalize',
  },
  cardBody: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 15,
    lineHeight: 22,
  },
  cardNote: {
    color: Colors.muted,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 14,
    lineHeight: 20,
  },
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold + '55',
  },
  dotDeep: {
    backgroundColor: Colors.gold,
  },
  dotQuiet: {
    backgroundColor: Colors.muted,
    opacity: 0.4,
  },
  dotLegend: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    fontSize: 11,
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
  archiveItem: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: 6,
  },
  archiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archiveDate: {
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    fontSize: 12,
  },
  archiveBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeDeep: {
    backgroundColor: Colors.gold + '33',
  },
  badgeQuiet: {
    backgroundColor: Colors.muted + '22',
  },
  badgeCallback: {
    backgroundColor: Colors.violet + '33',
  },
  badgeText: {
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    fontSize: 10,
  },
  archiveCard: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 14,
    lineHeight: 20,
  },
  archiveTone: {
    color: Colors.mutedDark,
    fontFamily: Fonts.crimson,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  journalEntry: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: 6,
  },
  journalDate: {
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    fontSize: 12,
  },
  journalContent: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 15,
    lineHeight: 22,
  },
  journalTheme: {
    color: Colors.mutedDark,
    fontFamily: Fonts.cormorantItalic,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  threadCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: 6,
  },
  threadTitle: {
    color: Colors.gold,
    fontFamily: Fonts.cinzel,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  threadSummary: {
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 14,
    lineHeight: 20,
  },
  threadDates: {
    color: Colors.mutedDark,
    fontFamily: Fonts.crimson,
    fontSize: 11,
  },
});
