import { useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore, SavedReading } from '@store/userStore';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

const TYPE_LABELS: Record<SavedReading['type'], { label: string; icon: string; color: string }> = {
  guru:          { label: 'Guru Reading',     icon: '🔱', color: Colors.gold },
  daily:         { label: 'Daily Reading',    icon: '✦',  color: Colors.amber },
  palm:          { label: 'Palm Reading',     icon: '🖐',  color: Colors.sapphire },
  numerology:    { label: 'Numerology',       icon: '∑',  color: Colors.violet },
  chinese:       { label: 'Chinese Astrology',icon: '☯',  color: Colors.ruby },
  lalkitab:      { label: 'Lal Kitab',        icon: '📖', color: Colors.emerald },
  compatibility: { label: 'Compatibility',    icon: '♡',  color: Colors.rose },
  tarot:         { label: 'Tarot',            icon: '✦',  color: '#C4B5FD' },
};

const TYPE_FILTERS = ['All', 'Guru', 'Daily', 'Palm', 'Numerology', 'Chinese', 'Compatibility', 'Lal Kitab', 'Tarot'] as const;
type FilterLabel = typeof TYPE_FILTERS[number];

const FILTER_TO_TYPE: Record<FilterLabel, SavedReading['type'] | 'All'> = {
  'All': 'All',
  'Guru': 'guru',
  'Daily': 'daily',
  'Palm': 'palm',
  'Numerology': 'numerology',
  'Chinese': 'chinese',
  'Compatibility': 'compatibility',
  'Lal Kitab': 'lalkitab',
  'Tarot': 'tarot',
};

export default function SavedReadingsScreen() {
  const savedReadings = useAppStore(s => s.user.savedReadings);
  const deleteSavedReading = useAppStore(s => s.deleteSavedReading);

  const [selected, setSelected] = useState<SavedReading | null>(null);
  const [filter, setFilter] = useState<FilterLabel>('All');

  const filtered = savedReadings.filter(r => {
    const typeFilter = FILTER_TO_TYPE[filter];
    return typeFilter === 'All' || r.type === typeFilter;
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reading', 'Remove this saved reading?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteSavedReading(id);
          if (selected?.id === id) setSelected(null);
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Readings</Text>
        <Text style={styles.subtitle}>{savedReadings.length} reading{savedReadings.length !== 1 ? 's' : ''} saved</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item: r }) => {
          const meta = TYPE_LABELS[r.type] ?? { label: r.type, icon: '◉', color: Colors.gold };
          return (
            <TouchableOpacity
              style={styles.readingCard}
              onPress={() => setSelected(r)}
              activeOpacity={0.75}
            >
              <View style={[styles.readingIcon, { backgroundColor: meta.color + '20' }]}>
                <Text style={styles.readingIconText}>{meta.icon}</Text>
              </View>
              <View style={styles.readingInfo}>
                <View style={styles.readingTopRow}>
                  <Text style={[styles.readingType, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.readingDate}>{formatDate(r.createdAt)}</Text>
                </View>
                <Text style={styles.readingTitle} numberOfLines={1}>{r.title}</Text>
                {r.question && (
                  <Text style={styles.readingQuestion} numberOfLines={1}>Q: {r.question}</Text>
                )}
                <Text style={styles.readingPreview} numberOfLines={2}>{r.preview}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(r.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>No saved readings yet</Text>
            <Text style={styles.emptyText}>
              Your Guru conversations, daily readings, and feature readings will be saved here automatically.
            </Text>
          </View>
        }
      />

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalType, { color: TYPE_LABELS[selected.type]?.color ?? Colors.gold }]}>
                  {TYPE_LABELS[selected.type]?.icon} {TYPE_LABELS[selected.type]?.label}
                </Text>
                <Text style={styles.modalTitle}>{selected.title}</Text>
                <Text style={styles.modalDate}>{formatDate(selected.createdAt)}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selected.question && (
                <View style={styles.questionBox}>
                  <Text style={styles.questionLabel}>YOUR QUESTION</Text>
                  <Text style={styles.questionText}>{selected.question}</Text>
                </View>
              )}
              <Text style={styles.modalContent}>{selected.content}</Text>

              <TouchableOpacity
                style={styles.deleteFullBtn}
                onPress={() => handleDelete(selected.id)}
              >
                <Text style={styles.deleteFullBtnText}>Delete This Reading</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 3 },

  filterScroll: {},
  filterContainer: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center', paddingVertical: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card },
  filterChipActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  filterText: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.muted },
  filterTextActive: { color: Colors.gold },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 12 },
  emptyIcon: { fontSize: 40, color: Colors.gold, opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star },
  emptyText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 22 },

  readingCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: Spacing.md, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14 },
  readingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  readingIconText: { fontSize: 18 },
  readingInfo: { flex: 1 },
  readingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  readingType: { fontSize: 10, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  readingDate: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.crimson },
  readingTitle: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 3 },
  readingQuestion: { fontSize: 11, color: Colors.gold, fontFamily: Fonts.cormorantItalic, marginBottom: 3 },
  readingPreview: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 17 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: Colors.muted },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.midnight },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: 12 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 18, color: Colors.muted },
  modalHeaderText: { flex: 1 },
  modalType: { fontSize: 12, fontFamily: Fonts.cinzel, letterSpacing: 1, marginBottom: 3 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.cinzel, color: Colors.star },
  modalDate: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 3 },
  modalBody: { flex: 1, padding: Spacing.md },
  questionBox: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold + '40', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  questionLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 6 },
  questionText: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22, fontStyle: 'italic' },
  modalContent: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26, marginBottom: Spacing.xl },
  deleteFullBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteFullBtnText: { fontSize: 13, color: Colors.ruby, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
});
