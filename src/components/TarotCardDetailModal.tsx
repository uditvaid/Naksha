/**
 * Card-detail modal for tarot. Used by:
 *   · Tap a drawn card in a spread → see its rich meaning
 *   · Browse the deck (all 78 cards) → tap any card → same modal
 *
 * Content is composed deterministically by detailForCard() — no API
 * call, no spinner. AskGuruButton at the bottom seeds the Guru with
 * the card name + orientation so users can ask follow-ups.
 */

import { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { detailForCard } from '@lib/tarotDetails';
import { AskGuruButton } from './AskGuruButton';
import type { DrawnCard } from '@utils/tarot';

interface Props {
  drawn: DrawnCard | null;
  /** Optional position label override (used inside spreads). */
  positionLabel?: string;
  onClose: () => void;
}

export function TarotCardDetailModal({ drawn, positionLabel, onClose }: Props) {
  if (!drawn) return <Modal visible={false} onRequestClose={onClose} />;

  const detail = detailForCard(drawn);
  const orientation = drawn.reversed ? 'Reversed' : 'Upright';
  const meaningText = drawn.reversed ? detail.reversed : detail.upright;
  const dotColor = drawn.reversed ? Colors.amber : Colors.gold;

  return (
    <Modal
      visible={drawn !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>{(positionLabel ?? drawn.position).toUpperCase()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
          <View style={styles.heroRow}>
            <Text style={styles.heroSymbol}>{drawn.card.symbol}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{drawn.card.name}</Text>
              <Text style={[styles.orientation, { color: dotColor }]}>{orientation}</Text>
            </View>
          </View>

          <Text style={styles.essence}>{detail.essence}</Text>

          <Text style={styles.sectionTitle}>{drawn.reversed ? 'WHAT REVERSED MEANS' : 'WHAT THIS CARD MEANS'}</Text>
          <Text style={styles.paragraph}>{meaningText}</Text>

          {detail.uprightLeanInto.length > 0 && !drawn.reversed && (
            <>
              <Text style={styles.sectionTitle}>LEAN INTO</Text>
              {detail.uprightLeanInto.map((line, i) => (
                <View key={`lean-${i}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: Colors.gold }]}>·</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </>
          )}

          {detail.watchFor.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{drawn.reversed ? 'WATCH FOR' : 'WHAT TO BE CAREFUL WITH'}</Text>
              {detail.watchFor.map((line, i) => (
                <View key={`watch-${i}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: Colors.amber }]}>·</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </>
          )}

          {detail.practiceHint && (
            <>
              <Text style={styles.sectionTitle}>WHAT TO DO TODAY</Text>
              <Text style={styles.practice}>{detail.practiceHint}</Text>
            </>
          )}

          {detail.vedicLens && (
            <>
              <Text style={styles.sectionTitle}>VEDIC LENS</Text>
              <Text style={styles.vedic}>{detail.vedicLens}</Text>
            </>
          )}

          <AskGuruButton
            seed={`I drew ${drawn.card.name}${drawn.reversed ? ' (reversed)' : ''} in my tarot reading. Help me understand `}
            onClose={onClose}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  headerLabel: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 2 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: Colors.muted },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  heroSymbol: { fontSize: 56, color: Colors.gold, fontFamily: Fonts.cinzel },
  heroTitle: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  orientation: { fontSize: 12, fontFamily: Fonts.cinzel, letterSpacing: 1, marginTop: 4 },

  essence: { fontSize: 15, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 24, marginTop: Spacing.md, marginBottom: 4, opacity: 0.9 },

  sectionTitle: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 10 },
  paragraph: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 24, marginBottom: 6 },

  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  bulletDot: { fontSize: 16, marginTop: 1, fontFamily: Fonts.cinzel },
  bulletText: { flex: 1, fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, opacity: 0.92 },

  practice: { fontSize: 15, color: Colors.star, fontFamily: Fonts.cormorantItalic, lineHeight: 24, marginBottom: 6 },
  vedic: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 20, marginBottom: 6 },
});

// ─── Browse-the-deck list helper ─────────────────────────────────────────────

import { TAROT_DECK, type TarotCard } from '@utils/tarot';

interface BrowseProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (card: TarotCard) => void;
}

// TAROT_DECK is a module-level constant — partition it once at import
// time instead of recomputing five filter() passes on every render.
const _major = TAROT_DECK.filter(c => c.arcana === 'major');
const _wands = TAROT_DECK.filter(c => c.suit === 'wands');
const _cups = TAROT_DECK.filter(c => c.suit === 'cups');
const _swords = TAROT_DECK.filter(c => c.suit === 'swords');
const _pents = TAROT_DECK.filter(c => c.suit === 'pentacles');

export function TarotBrowseModal({ visible, onClose, onSelect }: BrowseProps) {
  // Memoise the rendered grid sections — TAROT_DECK is static, only
  // `onSelect` changes with the parent's render. ~234 child Text nodes
  // are reused across re-renders this way; without the memo, every
  // parent re-render re-built the entire 78-card tree even when the
  // modal wasn't visible.
  const grid = useMemo(() => {
    const renderRow = (cards: TarotCard[]) => (
      <View style={browseStyles.grid}>
        {cards.map(c => (
          <TouchableOpacity key={c.id} style={browseStyles.cell} onPress={() => onSelect(c)} activeOpacity={0.85}>
            <Text style={browseStyles.cellSymbol}>{c.symbol}</Text>
            <Text style={browseStyles.cellName} numberOfLines={2}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
    return { renderRow };
  }, [onSelect]);
  const renderRow = grid.renderRow;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>BROWSE THE DECK</Text>
          <TouchableOpacity onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
          <Text style={browseStyles.intro}>
            All 78 cards of the Rider-Waite tradition. Tap any card to see what it means in plain English.
          </Text>

          <Text style={browseStyles.suitLabel}>MAJOR ARCANA · 22 CARDS</Text>
          {renderRow(_major)}

          <Text style={[browseStyles.suitLabel, { color: '#E07B39' }]}>WANDS · ACTION</Text>
          {renderRow(_wands)}

          <Text style={[browseStyles.suitLabel, { color: '#5DADE2' }]}>CUPS · FEELING</Text>
          {renderRow(_cups)}

          <Text style={[browseStyles.suitLabel, { color: '#F5F0E8' }]}>SWORDS · THOUGHT</Text>
          {renderRow(_swords)}

          <Text style={[browseStyles.suitLabel, { color: '#27AE60' }]}>PENTACLES · MATTER</Text>
          {renderRow(_pents)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const browseStyles = StyleSheet.create({
  intro: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 22, marginBottom: Spacing.md, fontStyle: 'italic' },
  suitLabel: { fontSize: 11, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginTop: Spacing.lg, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 4, minHeight: 76 },
  cellSymbol: { fontSize: 22, color: Colors.gold, fontFamily: Fonts.cinzel },
  cellName: { fontSize: 9, color: Colors.star, fontFamily: Fonts.cinzel, textAlign: 'center', letterSpacing: 0.3 },
});
