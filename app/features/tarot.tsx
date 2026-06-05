import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getTarotReading } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { AskGuruButton } from '@components/AskGuruButton';
import { TarotCardDetailModal, TarotBrowseModal } from '@components/TarotCardDetailModal';
import { shuffleAndDraw, TAROT_DECK, type DrawnCard, type SpreadType, type TarotCard } from '@utils/tarot';
import { useTarotStreakStore, CELTIC_CROSS_DAILY_CAP } from '@store/tarotStreakStore';

const SPREADS: { id: SpreadType; label: string; description: string; cardCount: number }[] = [
  { id: 'single',       label: 'Single Card',                description: 'A focused message for the question at hand.',                                                            cardCount: 1 },
  { id: 'three',        label: 'Past · Present · Future',    description: 'Three cards to trace the arc of your situation.',                                                        cardCount: 3 },
  { id: 'decision',     label: 'A vs B · The Decision',      description: 'When you\'re weighing two paths — what each leads to and what\'s underneath both.',                       cardCount: 3 },
  { id: 'relationship', label: 'Relationship Spread',         description: 'Five cards mapping you, them, the bond between, what helps it, and what strains it.',                    cardCount: 5 },
  { id: 'celticCross',  label: 'Celtic Cross · Deep Reading', description: 'The classic ten-card spread — the deepest reading available, for the questions that have layers.',     cardCount: 10 },
];

export default function TarotScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);

  const [question, setQuestion] = useState('');
  const [spread, setSpread] = useState<SpreadType>('three');
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [allowReversed, setAllowReversed] = useState(true);
  const [tappedCard, setTappedCard] = useState<DrawnCard | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browsedCard, setBrowsedCard] = useState<DrawnCard | null>(null);

  // Mounted + cancellation guards for the reveal sequence.
  //
  // The draw flow chains ~10 timeouts (Celtic Cross) before the Claude
  // call fires. If the user backgrounds the app or navigates away
  // mid-reveal, those timeouts keep firing on an unmounted component —
  // each triggering setRevealedIndex on a dead component AND a haptic
  // that fires for nothing.
  //
  // `mountedRef` blocks setState after unmount. `cancelRef` is checked
  // inside the reveal loop so an unmount mid-sleep aborts the loop
  // before the next setRevealedIndex.
  const mountedRef = useRef(true);
  const cancelRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    cancelRef.current = false;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
    };
  }, []);

  const draw = useCallback(async () => {
    // Soft cap on Celtic Cross draws — it costs ~2x the tokens of a
    // regular spread, and we want to discourage rapid-fire requests
    // racking up cost. The cap is generous (5/day), persisted, and
    // resets at calendar-day rollover. Other spreads are uncapped.
    if (spread === 'celticCross') {
      const count = useTarotStreakStore.getState().getCelticCrossCountToday();
      if (count >= CELTIC_CROSS_DAILY_CAP) {
        Alert.alert(
          'Take a beat',
          `The Celtic Cross is the deepest reading we offer — and it asks for time to actually integrate. You've already drawn ${count} today. Try again tomorrow, or pick a smaller spread for now.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cards = shuffleAndDraw(spread, { allowReversed });
    if (spread === 'celticCross') useTarotStreakStore.getState().recordCelticCross();
    setDrawn(cards);
    setRevealedIndex(-1);
    setReading('');

    // Reset cancel ref for this fresh draw — a previous draw's cancel
    // shouldn't bleed into this one.
    cancelRef.current = false;

    // Reveal cards one at a time for a more deliberate feel. Guard each
    // iteration so an unmount mid-sequence aborts cleanly.
    for (let i = 0; i < cards.length; i++) {
      await new Promise<void>((r) => setTimeout(r, 450));
      if (cancelRef.current || !mountedRef.current) return;
      setRevealedIndex(i);
      Haptics.selectionAsync();
    }

    // Then call Claude for the interpretation.
    setLoading(true);
    try {
      const text = await getTarotReading(question, spread, cards, user.birthData, user.chart);
      if (!mountedRef.current) return;
      setReading(text);
      saveReading({
        type: 'tarot',
        title: question.trim() ? `Tarot — ${question.trim().slice(0, 40)}${question.trim().length > 40 ? '…' : ''}` : `Tarot — ${SPREADS.find(s => s.id === spread)?.label ?? spread}`,
        preview: text.slice(0, 120) + '…',
        content: text,
        // Persist the cards too so saved-readings detail can show the
        // spread visually instead of just the prose. Strip down to the
        // serialisable fields the deck needs to re-render.
        cards: cards.map(c => ({
          name: c.card.name,
          symbol: c.card.symbol,
          reversed: c.reversed,
          position: c.position,
        })),
        spreadType: spread,
      });
    } catch (e: any) {
      if (mountedRef.current) {
        setReading(`Unable to get tarot reading: ${e?.message ?? 'Please try again shortly.'}`);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [spread, question, user.birthData, user.chart, saveReading, allowReversed]);

  const reset = useCallback(() => {
    setDrawn(null);
    setReading('');
    setRevealedIndex(-1);
    setQuestion('');
  }, []);

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <Text style={{ fontSize: 48 }}>✦</Text>
          <Text style={{ fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center' }}>Tarot</Text>
          <Text style={{ fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22 }}>
            Draw from the Rider-Waite tarot for guidance on a question — interpreted in the light of your Vedic chart and current life phase.
          </Text>
          <TouchableOpacity style={{ backgroundColor: Colors.gold, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 }} onPress={() => router.push('/paywall')}>
            <Text style={{ fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight }}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Tarot</Text>
            <Text style={styles.subtitle}>Rider-Waite tradition · interpreted through your chart</Text>
          </View>

          {/* Form */}
          {!drawn && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>YOUR QUESTION</Text>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="What do you want clarity on? (optional)"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={300}
                returnKeyType="done"
                blurOnSubmit
              />
              <Text style={styles.hint}>Leave blank for an open reading.</Text>

              <Text style={styles.sectionTitle}>CHOOSE A SPREAD</Text>
              {SPREADS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.spreadCard, spread === s.id && styles.spreadCardSelected]}
                  onPress={() => setSpread(s.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.spreadHeader}>
                    <Text style={[styles.spreadLabel, spread === s.id && styles.spreadLabelSelected]}>{s.label}</Text>
                    <Text style={styles.spreadCount}>{s.cardCount} card{s.cardCount > 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.spreadDesc}>{s.description}</Text>
                </TouchableOpacity>
              ))}

              {/* Orientation toggle — some users prefer upright-only readings */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setAllowReversed(v => !v)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Allow reversed cards</Text>
                  <Text style={styles.toggleHint}>{allowReversed ? 'Reversals add nuance to readings.' : 'Upright-only — gentler readings.'}</Text>
                </View>
                <View style={[styles.toggleSwitch, allowReversed && styles.toggleSwitchOn]}>
                  <View style={[styles.toggleDot, allowReversed && styles.toggleDotOn]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawBtn} onPress={draw}>
                <Text style={styles.drawBtnText}>✦ Draw Cards</Text>
              </TouchableOpacity>

              {/* Browse the deck — learn cards outside of a reading */}
              <TouchableOpacity style={styles.browseBtn} onPress={() => setBrowseOpen(true)} activeOpacity={0.85}>
                <Text style={styles.browseBtnText}>📖 Browse the Deck</Text>
                <Text style={styles.browseBtnSub}>Learn all 78 cards in plain English</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Drawn cards */}
          {drawn && (
            <View style={styles.cardsSection}>
              <View style={styles.cardsRow}>
                {drawn.map((d, i) => (
                  <View key={i} style={styles.cardSlot}>
                    <Text style={styles.positionLabel} numberOfLines={2}>{d.position.toUpperCase()}</Text>
                    {i <= revealedIndex ? (
                      <TouchableOpacity
                        style={[styles.cardFace, d.reversed && styles.cardFaceReversed]}
                        onPress={() => setTappedCard(d)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cardSymbol}>{d.card.symbol}</Text>
                        <Text style={styles.cardName} numberOfLines={2}>{d.card.name}</Text>
                        {d.reversed && <Text style={styles.reversedBadge}>↓ reversed</Text>}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.cardBack}>
                        <Text style={styles.cardBackGlyph}>✦</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              {revealedIndex >= drawn.length - 1 && (
                <Text style={styles.tapCardsHint}>Tap any card above for plain-English meaning →</Text>
              )}

              {/* Card meanings (raw, before AI synthesis) */}
              {revealedIndex >= drawn.length - 1 && (
                <View style={styles.meaningsBlock}>
                  {drawn.map((d, i) => (
                    <Text key={i} style={styles.meaningLine}>
                      <Text style={styles.meaningPos}>{d.position}: </Text>
                      <Text style={styles.meaningCard}>{d.card.name}</Text>
                      <Text style={styles.meaningOrient}>{d.reversed ? ' (reversed)' : ''}</Text>
                      <Text style={styles.meaningKw}> — {d.reversed ? d.card.reversed : d.card.upright}</Text>
                    </Text>
                  ))}
                </View>
              )}

              {/* AI interpretation */}
              {loading && (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={Colors.gold} size="small" />
                  <Text style={styles.loadingText}>Reading the cards…</Text>
                </View>
              )}

              {reading !== '' && !loading && (
                <View style={styles.readingBlock}>
                  <Text style={styles.readingLabel}>YOUR READING</Text>
                  <Text style={styles.readingText}>{reading}</Text>
                  <AskGuruButton seed="I just drew a tarot spread. Help me understand " />
                </View>
              )}

              {!loading && reading !== '' && (
                <TouchableOpacity style={styles.newReadingBtn} onPress={reset}>
                  <Text style={styles.newReadingText}>Draw Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tap any drawn card → rich plain-English detail. Same modal is
          used by browse-the-deck below; the only difference is the
          position label (drawn cards have one, browse cards don't). */}
      <TarotCardDetailModal
        drawn={tappedCard}
        onClose={() => setTappedCard(null)}
      />

      {/* Browse the entire 78-card deck. Tapping any card opens the
          same detail modal in upright orientation by default — users
          learning the deck don't need reversed nuance up front. */}
      <TarotBrowseModal
        visible={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={(card: TarotCard) => {
          setBrowseOpen(false);
          // Brief delay so the close animation finishes before the
          // detail modal slides up — feels less jarring.
          setTimeout(() => setBrowsedCard({ card, reversed: false, position: 'About this card' }), 250);
        }}
      />
      <TarotCardDetailModal
        drawn={browsedCard}
        onClose={() => setBrowsedCard(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },

  // Form
  formSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 12, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.star,
    fontFamily: Fonts.crimson,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 11, color: Colors.mutedDark, fontFamily: Fonts.cormorantItalic, marginTop: 6 },

  // Spread chooser
  spreadCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
  },
  spreadCardSelected: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  spreadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  spreadLabel: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star },
  spreadLabelSelected: { color: Colors.gold },
  spreadCount: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cinzel },
  spreadDesc: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, lineHeight: 18 },

  // Draw
  drawBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  drawBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },

  // Orientation toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.md, gap: 12 },
  toggleLabel: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star, letterSpacing: 0.3 },
  toggleHint: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  toggleSwitch: { width: 42, height: 24, borderRadius: 12, backgroundColor: Colors.cardBorder, justifyContent: 'center', paddingHorizontal: 2 },
  toggleSwitchOn: { backgroundColor: Colors.gold },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.muted, alignSelf: 'flex-start' },
  toggleDotOn: { backgroundColor: Colors.midnight, alignSelf: 'flex-end' },

  // Browse the deck button
  browseBtn: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: 10, gap: 4 },
  browseBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.3 },
  browseBtnSub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic },

  // Tap-cards hint
  tapCardsHint: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cormorantItalic, opacity: 0.85, textAlign: 'center', marginTop: -4, marginBottom: Spacing.sm, letterSpacing: 0.3 },

  // Cards
  cardsSection: { paddingHorizontal: Spacing.md },
  cardsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: Spacing.lg },
  cardSlot: { flex: 1, alignItems: 'center', maxWidth: 110 },
  positionLabel: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 6 },
  cardFace: {
    width: '100%',
    aspectRatio: 0.62,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFaceReversed: { transform: [{ rotate: '180deg' }] },
  cardSymbol: { fontSize: 32, color: Colors.gold },
  cardName: { fontSize: 11, fontFamily: Fonts.cinzel, color: Colors.star, textAlign: 'center', lineHeight: 14 },
  reversedBadge: { fontSize: 9, color: Colors.amber, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  cardBack: {
    width: '100%',
    aspectRatio: 0.62,
    backgroundColor: '#0D0D1F',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackGlyph: { fontSize: 28, color: Colors.muted },

  // Meanings
  meaningsBlock: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 14, gap: 8, marginBottom: Spacing.md },
  meaningLine: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 19 },
  meaningPos: { fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 0.5 },
  meaningCard: { fontFamily: Fonts.cinzel, color: Colors.star },
  meaningOrient: { color: Colors.amber },
  meaningKw: { color: Colors.muted, fontFamily: Fonts.cormorantItalic },

  // Reading
  loadingBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: Spacing.md },
  loadingText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingBlock: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 10 },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 24 },

  newReadingBtn: { alignItems: 'center', paddingVertical: 12 },
  newReadingText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
});
