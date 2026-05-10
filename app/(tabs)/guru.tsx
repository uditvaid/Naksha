import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ExpoCrypto from 'expo-crypto';
import { router } from 'expo-router';
import { useAppStore, GuruMessage } from '@store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { askGuru } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { FREE_GURU_QUESTIONS_PER_DAY } from '@constants/astrology';
import { findActiveDasha } from '@utils/vedic';

const DASHA_QUESTIONS: Record<string, string[]> = {
  Sun: [
    'You are in your Sun period — a time of identity and authority. Where in your life are you still dimming your light to keep others comfortable?',
    'The Sun rules your father and the authority figures in your life. What unresolved patterns from these relationships still shape how you lead?',
    'This period asks you to be seen. What would you do differently if you stopped seeking external validation?',
  ],
  Moon: [
    'You are in your Moon period — a deeply feeling time. What emotional truth have you been too afraid to acknowledge?',
    'The Moon governs your inner world and your mother. What old emotional wound is quietly asking to be healed right now?',
    'Your mind is your most powerful tool in this period. In what ways are your thoughts creating your reality — for better or worse?',
  ],
  Mars: [
    'You are in your Mars period — a time of courage and decisive action. What have you been postponing out of fear that you know you must face?',
    'Mars rules property, siblings, and ambition. Where are you holding back from asserting what is rightfully yours?',
    'This period rewards bold action. What is the one decisive step you have been circling around but never taking?',
  ],
  Mercury: [
    'You are in your Mercury period — a time of the mind and communication. What truth are you struggling to articulate clearly in your life?',
    'Mercury governs business, learning, and adaptability. Where is overthinking or scattered energy holding you back from real progress?',
    'This period favours skill-building. What knowledge, if mastered now, would transform the next decade of your life?',
  ],
  Jupiter: [
    'You are in your Jupiter period — a time of growth and grace. What old belief about yourself is too small for who you are becoming?',
    'Jupiter governs wisdom and expansion. Who or what is currently your greatest teacher, and are you truly listening?',
    'This period asks you to be generous with your gifts. Where are you hoarding your wisdom or abundance out of fear?',
  ],
  Venus: [
    'You are in your Venus period — a time of love and creativity. Where in your life are you denying yourself beauty, pleasure, or deep connection?',
    'Venus governs relationships and values. What would you need to believe about yourself to receive the love you truly desire?',
    'This period rewards authenticity. Where are you performing a version of yourself rather than allowing yourself to be fully known?',
  ],
  Saturn: [
    'You are in your Saturn period — the great teacher. What responsibility have you been avoiding that Saturn is now placing squarely in front of you?',
    'Saturn rewards those who do the work. Where are you expecting results without sustained, consistent effort?',
    'This period builds lasting foundations. What needs to be stripped away so something more enduring can be built in its place?',
  ],
  Rahu: [
    'You are in your Rahu period — a time of ambition and transformation. Where are you chasing something that looks like success but doesn\'t align with your soul?',
    'Rahu magnifies worldly desire. What craving in your life, if examined honestly, is driven more by fear than genuine longing?',
    'This period brings sudden shifts. What identity or belief about yourself are you being asked to completely release?',
  ],
  Ketu: [
    'You are in your Ketu period — a time of release and spiritual deepening. What are you still clinging to that your soul is asking you to let go of?',
    'Ketu dissolves what no longer serves. Which relationship, habit, or worldly ambition are you investing in that no longer has a genuine future?',
    'This period turns attention inward. What spiritual question has been quietly growing in you that you have been afraid to sit with?',
  ],
};

const FALLBACK_QUESTIONS = [
  'What is the deepest question your soul is asking right now?',
  'Where in your life do you feel most out of alignment with your true purpose?',
  'What pattern keeps repeating in your life, and what might it be trying to teach you?',
];

function getDashaQuestions(chart: any): { questions: string[]; dashaLord?: string } {
  const activeDasha = findActiveDasha(chart?.dashas);
  if (!activeDasha) return { questions: FALLBACK_QUESTIONS };
  const questions = DASHA_QUESTIONS[activeDasha.planet] ?? FALLBACK_QUESTIONS;
  return { questions, dashaLord: activeDasha.planet };
}

const genId = () => ExpoCrypto.randomUUID();

export default function GuruScreen() {
  const {
    birthData, chart, isPremium, guruQuestionsToday, lastGuruDate, messages, guruConsentGiven, pendingGuruContext,
  } = useAppStore(useShallow(s => ({
    birthData: s.user.birthData,
    chart: s.user.chart,
    isPremium: s.user.isPremium,
    guruQuestionsToday: s.user.guruQuestionsToday,
    lastGuruDate: s.user.lastGuruDate,
    messages: s.guruMessages,
    guruConsentGiven: s.user.guruConsentGiven,
    pendingGuruContext: s.pendingGuruContext,
  })));
  const addMessage = useAppStore(s => s.addGuruMessage);
  const incrementQuestions = useAppStore(s => s.incrementGuruQuestions);
  const canAsk = useAppStore(s => s.canAskGuru);
  const saveReading = useAppStore(s => s.saveReading);
  const clearMessages = useAppStore(s => s.clearGuruMessages);
  const giveGuruConsent = useAppStore(s => s.giveGuruConsent);
  const setPendingGuruContext = useAppStore(s => s.setPendingGuruContext);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const scrollRef = useRef<FlatList<GuruMessage>>(null);

  // Pre-fill input when arriving from chart screen via "Ask Guru"
  useEffect(() => {
    if (pendingGuruContext) {
      setInput(pendingGuruContext + ' ');
      setPendingGuruContext(null);
    }
  }, [pendingGuruContext]);

  const questionsLeft = isPremium
    ? '∞'
    : Math.max(0, FREE_GURU_QUESTIONS_PER_DAY - (lastGuruDate === new Date().toISOString().split('T')[0] ? guruQuestionsToday : 0));

  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    if (!birthData) {
      router.push('/onboarding');
      return;
    }

    if (!canAsk()) {
      router.push('/paywall');
      return;
    }

    if (!guruConsentGiven) {
      setPendingQuestion(question);
      setShowConsentModal(true);
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg = {
      id: genId(),
      role: 'user' as const,
      content: question,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMsg);
    setInput('');
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const currentMessages = useAppStore.getState().guruMessages;
      const response = await askGuru(question, currentMessages, birthData, chart);
      incrementQuestions();
      addMessage({
        id: genId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });
      saveReading({
        type: 'guru',
        title: question.slice(0, 50) + (question.length > 50 ? '…' : ''),
        preview: response.slice(0, 120) + '…',
        content: response,
        question,
      });
    } catch (e) {
      addMessage({
        id: genId(),
        role: 'assistant',
        content: 'The cosmic connection wavered. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [input, loading, birthData, chart, canAsk, guruConsentGiven]);

  const handleConsentAccept = useCallback(async () => {
    giveGuruConsent();
    setShowConsentModal(false);
    const q = pendingQuestion;
    setPendingQuestion(null);
    if (q) {
      setInput('');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userMsg = {
        id: genId(),
        role: 'user' as const,
        content: q,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setLoading(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      try {
        const currentMessages = useAppStore.getState().guruMessages;
        const response = await askGuru(q, currentMessages, birthData!, chart);
        incrementQuestions();
        addMessage({
          id: genId(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        });
        saveReading({
          type: 'guru',
          title: q.slice(0, 50) + (q.length > 50 ? '…' : ''),
          preview: response.slice(0, 120) + '…',
          content: response,
          question: q,
        });
      } catch {
        addMessage({
          id: genId(),
          role: 'assistant',
          content: 'The cosmic connection wavered. Please try again.',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      }
    }
  }, [pendingQuestion, birthData, chart]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header — two-row layout so the title doesn't get cramped
            between Back and Clear at larger font scales. Top row holds
            navigation actions only; title + subtitle sit on their own
            line below with full width to breathe. */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {/* Back is shown only when there's actual nav history. */}
            {router.canGoBack() ? (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerActionBtn} hitSlop={8}>
                <Text style={styles.headerActionText}>← Back</Text>
              </TouchableOpacity>
            ) : <View />}
            <View style={styles.headerActionsRight}>
              {!isPremium && (
                <View style={styles.questionCount}>
                  <Text style={styles.questionCountText}>{questionsLeft} left today</Text>
                </View>
              )}
              {messages.length > 0 && (
                <TouchableOpacity onPress={clearMessages} style={styles.headerActionBtn} hitSlop={8}>
                  <Text style={styles.headerActionText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.title}>Guru</Text>
          <Text style={styles.subtitle}>Your personal Vedic guide</Text>
        </View>

        <FlatList
          ref={scrollRef}
          style={styles.messagesArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={messages.length === 0 ? styles.messagesEmptyContent : styles.messagesContent}
          data={messages}
          keyExtractor={msg => msg.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={<WelcomeState onSelect={sendMessage} {...getDashaQuestions(chart)} />}
          ListFooterComponent={loading ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.loadingText}>The Guru reads the stars…</Text>
            </View>
          ) : null}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
        />

        {/* Paywall nudge */}
        {!isPremium && questionsLeft === 0 && (
          <TouchableOpacity style={styles.paywallNudge} onPress={() => router.push('/paywall')}>
            <Text style={styles.paywallNudgeText}>✦ Unlock unlimited Guru conversations with Premium</Text>
          </TouchableOpacity>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask the Guru anything…"
            placeholderTextColor={Colors.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>✦</Text>
          </TouchableOpacity>
        </View>

        {/* AI caveat footer */}
        <Text style={styles.aicaveat}>
          Responses draw on classical Vedic texts and recognized astrological tradition, delivered through AI — for reflection, not as a substitute for professional advice
        </Text>
      </KeyboardAvoidingView>

      {/* Guru consent modal (shown once, first interaction — Apple 5.1.2(i)) */}
      <Modal visible={showConsentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔱 Before You Ask the Guru</Text>
            <Text style={styles.modalBody}>
              The Guru uses <Text style={styles.modalBold}>Claude AI by Anthropic</Text>. Your name, birth date, birth place, chart data, and questions are sent to generate responses. No other personal data is shared.
            </Text>
            <TouchableOpacity style={styles.modalAccept} onPress={handleConsentAccept}>
              <Text style={styles.modalAcceptText}>Got It — Continue ✦</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDecline} onPress={() => { setShowConsentModal(false); setPendingQuestion(null); }}>
              <Text style={styles.modalDeclineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const WelcomeState = memo(function WelcomeState({ onSelect, questions, dashaLord }: { onSelect: (q: string) => void; questions: string[]; dashaLord?: string }) {
  return (
    <View style={styles.welcome}>
      <Text style={styles.welcomeIcon}>🔱</Text>
      <Text style={styles.welcomeTitle}>Guru</Text>
      <Text style={styles.welcomeText}>
        Ask about your chart, timing, relationships, career, dharma, gemstones, or anything on your spiritual path. Readings are grounded in classical Vedic texts and offered as spiritual guidance.
      </Text>
      <Text style={styles.suggestLabel}>
        {dashaLord ? `QUESTIONS FOR YOUR ${dashaLord.toUpperCase()} PERIOD` : 'REFLECT ON THIS'}
      </Text>
      {questions.map((q) => (
        <TouchableOpacity key={q} style={styles.suggestion} onPress={() => onSelect(q)}>
          <Text style={styles.suggestionText}>{q}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

// Defensive markdown strip — Claude occasionally emits headers / bold
// even when the system prompt asks for plain prose. The Guru's text
// is rendered raw in <Text>, so any leaked `#` / `**` shows up as
// literal characters. Mirrors the same helper used in numerology /
// lalkitab / chinese reading screens.
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^---+\s*$/gm, '')
    .trim();
}

const MessageBubble = memo(function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  // Don't strip user messages — what they typed is what they typed.
  // Only strip markdown from the assistant's responses.
  const content = isUser ? message.content : stripMarkdown(message.content ?? '');
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.guroBubble]}>
      {!isUser && <Text style={styles.guruLabel}>✦ GURU · AI-GENERATED</Text>}
      <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{content}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: 4 },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  headerActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerActionBtn: { paddingVertical: 4 },
  headerActionText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, letterSpacing: 0.3 },
  title: { fontSize: 20, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  questionCount: { backgroundColor: Colors.goldDim, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  questionCountText: { fontSize: 10, fontFamily: Fonts.cinzel, color: Colors.gold, lineHeight: 12, includeFontPadding: false },
  messagesArea: { flex: 1, paddingHorizontal: Spacing.md },
  messagesContent: { paddingBottom: 16 },
  messagesEmptyContent: { paddingBottom: 16, flexGrow: 1 },
  welcome: { paddingTop: Spacing.xl, alignItems: 'center' },
  welcomeIcon: { fontSize: 48, marginBottom: Spacing.sm },
  welcomeTitle: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: Spacing.sm },
  welcomeText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  suggestLabel: { fontSize: 9, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10, alignSelf: 'flex-start' },
  suggestion: { width: '100%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  suggestionText: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 20 },
  disclaimer: { fontSize: 11, color: Colors.mutedDark, textAlign: 'center', lineHeight: 17, marginTop: Spacing.md, paddingHorizontal: Spacing.sm, fontFamily: Fonts.cormorantItalic },
  bubble: { marginBottom: 12, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold + '40', borderRadius: Radius.lg, borderBottomRightRadius: 4, padding: 14 },
  guroBubble: { alignSelf: 'flex-start', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, borderBottomLeftRadius: 4, padding: 14 },
  guruLabel: { fontSize: 8, fontFamily: Fonts.cinzel, color: Colors.gold, letterSpacing: 2, marginBottom: 6 },
  bubbleText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 24 },
  userBubbleText: { color: Colors.star },
  timestamp: { fontSize: 10, color: Colors.muted, marginTop: 6, fontFamily: Fonts.crimson },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, alignSelf: 'flex-start', marginBottom: 12 },
  loadingText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  paywallNudge: { marginHorizontal: Spacing.md, marginBottom: 8, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  paywallNudgeText: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', gap: 10, padding: Spacing.md, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  input: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, color: Colors.star, fontFamily: Fonts.crimson, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { fontSize: 16, color: Colors.midnight },
  aicaveat: { fontSize: 10, color: Colors.mutedDark, textAlign: 'center', paddingHorizontal: Spacing.lg, paddingBottom: 8, fontFamily: Fonts.cormorantItalic },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: '#0D1220', borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.gold, textAlign: 'center', marginBottom: Spacing.md },
  modalBody: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, marginBottom: Spacing.lg },
  modalBold: { fontFamily: Fonts.cinzelBold, color: Colors.gold },
  modalAccept: { backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginBottom: 10 },
  modalAcceptText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5 },
  modalDecline: { alignItems: 'center', padding: 10 },
  modalDeclineText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cinzel },
});
