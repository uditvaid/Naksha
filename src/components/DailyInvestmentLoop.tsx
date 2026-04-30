/**
 * Daily Layer 7 — Investment Loop
 *
 * Three engagement paths after reading the daily card:
 *   Reflect  → journal prompt (write or discard)
 *   Discuss  → routes to Guru tab pre-seeded with today's thread
 *   React    → emoji reaction (one tap, no undo prompt)
 *
 * Never counts engagement or shows streaks.
 * Records reactions to engagement profile for adaptive learning.
 */

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { useDailyEngagementStore } from '@store/dailyEngagementStore';
import { useDailyTelemetryStore } from '@store/dailyTelemetryStore';
import { useDailyContinuityStore } from '@store/dailyContinuityStore';
import type { DailyEngagementReaction } from '@lib/daily/engagementProfile';

const REACTIONS = ['✦', '◎', '∿', '⊙', '≈'] as const;
type Reaction = typeof REACTIONS[number];

const REACTION_MEANINGS: Record<Reaction, string> = {
  '✦': 'This landed',
  '◎': 'Worth sitting with',
  '∿': 'Interesting',
  '⊙': 'Not sure',
  '≈': 'Felt off today',
};

interface DailyInvestmentLoopProps {
  dailyCard: string;
  tone: string;
  isQuietDay: boolean;
  isDeepDay: boolean;
  journalPrompt: string;
  guruSeed: string;  // pre-seeded question for Guru tab
}

export function DailyInvestmentLoop({
  dailyCard,
  tone,
  isQuietDay,
  isDeepDay,
  journalPrompt,
  guruSeed,
}: DailyInvestmentLoopProps) {
  const [mode, setMode] = useState<'idle' | 'reflect' | 'reacted'>('idle');
  const [journalText, setJournalText] = useState('');
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);

  const recordReaction = useDailyEngagementStore(s => s.recordReaction);
  const addTopicInterest = useDailyEngagementStore(s => s.addTopicInterest);
  const recordEvent = useDailyTelemetryStore(s => s.recordEvent);
  const addJournalEntry = useDailyContinuityStore(s => s.addJournalEntry);

  const makeReaction = (
    reactionType: DailyEngagementReaction['reaction'],
    investmentPath?: DailyEngagementReaction['investmentPath'],
    opened = false,
    expanded = false,
  ): DailyEngagementReaction => ({
    date: new Date().toISOString().split('T')[0]!,
    tone: tone as DailyEngagementReaction['tone'],
    reaction: reactionType,
    opened,
    expanded,
    investmentPath,
  });

  const handleReact = useCallback((r: Reaction) => {
    if (selectedReaction !== null) return; // one reaction only

    setSelectedReaction(r);
    setMode('reacted');

    const reactionType: DailyEngagementReaction['reaction'] =
      r === '≈' ? 'didnt_land' : r === '⊙' ? 'skipped' : 'resonated';
    recordReaction(makeReaction(reactionType, undefined, true, false));
    recordEvent('reacted', { tone, isQuietDay, isDeepDay, reaction: r });
  }, [selectedReaction, tone, isQuietDay, isDeepDay, recordReaction, recordEvent]);

  const handleSaveJournal = useCallback(() => {
    if (journalText.trim().length < 3) {
      setMode('idle');
      setJournalText('');
      return;
    }

    const today = new Date().toISOString().split('T')[0]!;
    addJournalEntry({
      date: today,
      dailyId: null,
      content: journalText.trim(),
      theme: tone,
    });

    recordReaction(makeReaction('want_more', 'reflect', true, true));
    addTopicInterest(tone);
    recordEvent('reflected', { tone, isQuietDay, isDeepDay });

    Keyboard.dismiss();
    setJournalText('');
    setMode('idle');
  }, [journalText, tone, isQuietDay, isDeepDay, addJournalEntry, recordReaction, addTopicInterest, recordEvent]);

  const handleDiscuss = useCallback(() => {
    recordReaction(makeReaction('want_more', 'discuss', true, true));
    recordEvent('discussed', { tone, isQuietDay, isDeepDay });
    router.push('/(tabs)/guru');
  }, [tone, isQuietDay, isDeepDay, recordEvent, recordReaction]);

  return (
    <View style={styles.container}>
      {/* Reaction row — always visible */}
      <View style={styles.reactionRow}>
        {REACTIONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[
              styles.reactionBtn,
              selectedReaction === r && styles.reactionSelected,
              selectedReaction !== null && selectedReaction !== r && styles.reactionDimmed,
            ]}
            onPress={() => handleReact(r)}
            disabled={selectedReaction !== null}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionGlyph}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedReaction && (
        <Text style={styles.reactionLabel}>{REACTION_MEANINGS[selectedReaction]}</Text>
      )}

      {/* Action buttons */}
      {mode !== 'reflect' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setMode('reflect')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>✍</Text>
            <Text style={styles.actionLabel}>Reflect</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDiscuss}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>◈</Text>
            <Text style={styles.actionLabel}>Discuss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reflect panel */}
      {mode === 'reflect' && (
        <View style={styles.reflectPanel}>
          <Text style={styles.journalPrompt}>{journalPrompt}</Text>
          <TextInput
            style={styles.journalInput}
            multiline
            placeholder="Write freely — this stays on your device"
            placeholderTextColor={Colors.mutedDark}
            value={journalText}
            onChangeText={setJournalText}
            autoFocus
            maxLength={2000}
          />
          <View style={styles.reflectActions}>
            <TouchableOpacity onPress={() => { setMode('idle'); setJournalText(''); }} style={styles.discardBtn}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveJournal}
              style={[styles.saveBtn, journalText.trim().length < 3 && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#333366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '22',
  },
  reactionDimmed: {
    opacity: 0.35,
  },
  reactionGlyph: {
    fontSize: 18,
    color: Colors.gold,
    fontFamily: Fonts.crimson,
  },
  reactionLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.crimson,
    marginTop: -Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333366',
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  actionIcon: {
    fontSize: 16,
    color: Colors.gold,
  },
  actionLabel: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: Fonts.crimson,
    letterSpacing: 0.5,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#333366',
  },
  reflectPanel: {
    backgroundColor: '#0D0D1F',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#333366',
    gap: Spacing.sm,
  },
  journalPrompt: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: Fonts.cormorantItalic,
    lineHeight: 20,
  },
  journalInput: {
    fontSize: 15,
    color: Colors.star,
    fontFamily: Fonts.crimson,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  reflectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333366',
  },
  discardBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  discardText: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: Fonts.crimson,
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.gold + '22',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: Fonts.crimson,
  },
});
