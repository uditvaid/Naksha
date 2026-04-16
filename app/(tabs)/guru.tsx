import { useState, useRef, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { askGuru } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import { FREE_GURU_QUESTIONS_PER_DAY } from '@constants/astrology';

const SUGGESTED_QUESTIONS = [
  'What does my current Mahadasha mean for me?',
  'What are my strongest yogas?',
  'When is my best window for major decisions?',
  'What is my dharma in this lifetime?',
  'How should I prepare for Saturn Mahadasha?',
  'What do my 8th house planets mean?',
  'Which gemstone should I wear?',
  'What is my soul\'s purpose?',
];

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function GuruScreen() {
  const birthData = useAppStore(s => s.user.birthData);
  const chart = useAppStore(s => s.user.chart);
  const isPremium = useAppStore(s => s.user.isPremium);
  const guruQuestionsToday = useAppStore(s => s.user.guruQuestionsToday);
  const lastGuruDate = useAppStore(s => s.user.lastGuruDate);
  const messages = useAppStore(s => s.guruMessages);
  const addMessage = useAppStore(s => s.addGuruMessage);
  const incrementQuestions = useAppStore(s => s.incrementGuruQuestions);
  const canAsk = useAppStore(s => s.canAskGuru);
  const saveReading = useAppStore(s => s.saveReading);
  const clearMessages = useAppStore(s => s.clearGuruMessages);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const questionsLeft = isPremium
    ? '∞'
    : Math.max(0, FREE_GURU_QUESTIONS_PER_DAY - (lastGuruDate === new Date().toDateString() ? guruQuestionsToday : 0));

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
  }, [input, loading, birthData, chart, canAsk]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Jyotish Guru</Text>
            <Text style={styles.subtitle}>Your personal Vedic guide</Text>
          </View>
          <View style={styles.headerRight}>
            {!isPremium && (
              <View style={styles.questionCount}>
                <Text style={styles.questionCountText}>{questionsLeft} left today</Text>
              </View>
            )}
            {messages.length > 0 && (
              <TouchableOpacity onPress={clearMessages} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {messages.length === 0 ? (
            <WelcomeState onSelect={(q) => sendMessage(q)} />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.loadingText}>The Guru reads the stars…</Text>
            </View>
          )}
        </ScrollView>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomeState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <View style={styles.welcome}>
      <Text style={styles.welcomeIcon}>🔱</Text>
      <Text style={styles.welcomeTitle}>Jyotish Guru</Text>
      <Text style={styles.welcomeText}>
        Ask about your chart, timing, relationships, career, dharma, gemstones, or anything on your spiritual path. Readings are grounded in classical Vedic texts and offered as spiritual guidance.
      </Text>
      <Text style={styles.suggestLabel}>SUGGESTED QUESTIONS</Text>
      {SUGGESTED_QUESTIONS.map((q) => (
        <TouchableOpacity key={q} style={styles.suggestion} onPress={() => onSelect(q)}>
          <Text style={styles.suggestionText}>{q}</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.disclaimer}>
        All responses are AI-generated using classical Vedic texts as context. Readings are for spiritual self-inquiry and entertainment only — they do not constitute medical, legal, or financial advice.
      </Text>
    </View>
  );
}

const MessageBubble = memo(function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.guroBubble]}>
      {!isUser && <Text style={styles.guruLabel}>✦ GURU · AI-GENERATED</Text>}
      <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{message.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  title: { fontSize: 20, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questionCount: { backgroundColor: Colors.goldDim, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  questionCountText: { fontSize: 10, fontFamily: Fonts.cinzel, color: Colors.gold },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cinzel },
  messagesArea: { flex: 1, paddingHorizontal: Spacing.md },
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
});
