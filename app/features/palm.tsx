import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { analyzePalm } from '@services/claude';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';

export default function PalmScreen() {
  const user = useAppStore(s => s.user);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('right');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.lockedState}>
          <Text style={styles.lockedIcon}>🖐</Text>
          <Text style={styles.lockedTitle}>Palm Reading</Text>
          <Text style={styles.lockedText}>
            Unlock Vedic palmistry (Hasta Samudrika Shastra) — AI-powered analysis of your palm lines, mounts, and destiny markers.
          </Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/paywall')}>
            <Text style={styles.unlockBtnText}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pickImage = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in your device settings to take a photo of your palm.',
          );
          return;
        }
      }

      const method = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await method({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
        setReading('');
      }
    } catch {
      Alert.alert('Error', 'Could not open the camera or photo library. Please check your permissions and try again.');
    }
  };

  const analyzeHand = async () => {
    if (!imageBase64 || !user.birthData) return;
    setLoading(true);
    try {
      const result = await analyzePalm(imageBase64, user.birthData, selectedHand);
      setReading(result);
    } catch (e) {
      Alert.alert('Reading Failed', 'Could not analyze the image. Please ensure your palm is clearly visible and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Palm Reading</Text>
          <Text style={styles.subtitle}>Hasta Samudrika Shastra</Text>
        </View>

        {/* Hand selector */}
        <View style={styles.handSelector}>
          {(['left', 'right'] as const).map(hand => (
            <TouchableOpacity
              key={hand}
              style={[styles.handBtn, selectedHand === hand && styles.handBtnActive]}
              onPress={() => setSelectedHand(hand)}
            >
              <Text style={[styles.handBtnText, selectedHand === hand && styles.handBtnTextActive]}>
                {hand === 'left' ? '🤚 Left Hand' : '✋ Right Hand'}
              </Text>
              <Text style={styles.handBtnSub}>
                {hand === 'left' ? 'Karmic potential' : 'Current life path'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>FOR BEST RESULTS</Text>
          <Text style={styles.instructionsText}>
            Hold your {selectedHand} hand flat, palm facing up, in good natural light. Keep fingers slightly spread. Ensure all major lines are clearly visible.
          </Text>
        </View>

        {/* Image area */}
        <View style={styles.imageArea}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.palmImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>🖐</Text>
              <Text style={styles.imagePlaceholderText}>Your palm will appear here</Text>
            </View>
          )}
        </View>

        {/* Camera / Gallery buttons */}
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(false)}>
            <Text style={styles.photoBtnIcon}>🖼</Text>
            <Text style={styles.photoBtnText}>From Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Analyze button */}
        {imageUri && !loading && !reading && (
          <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeHand}>
            <Text style={styles.analyzeBtnText}>✦ Read My Palm ✦</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={styles.loadingText}>The Guru studies your lines…</Text>
          </View>
        )}

        {/* Reading result */}
        {reading !== '' && (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>✦ YOUR PALM READING ✦{'\n'}AI-Generated Analysis</Text>
            <Text style={styles.readingText}>{reading}</Text>
            <TouchableOpacity style={styles.newReadingBtn} onPress={() => { setReading(''); setImageUri(null); }}>
              <Text style={styles.newReadingBtnText}>Read Another Hand</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  backBtn: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel },
  header: { padding: Spacing.md },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold, marginTop: 4 },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },
  handSelector: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  handBtn: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, alignItems: 'center' },
  handBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  handBtnText: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.muted },
  handBtnTextActive: { color: Colors.gold },
  handBtnSub: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 3 },
  instructions: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  instructionsTitle: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  instructionsText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20 },
  imageArea: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: Radius.xl, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  palmImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  imagePlaceholderIcon: { fontSize: 48 },
  imagePlaceholderText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  photoButtons: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  photoBtn: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 6 },
  photoBtnIcon: { fontSize: 22 },
  photoBtnText: { fontSize: 12, fontFamily: Fonts.cinzel, color: Colors.muted, letterSpacing: 0.5 },
  analyzeBtn: { marginHorizontal: Spacing.md, backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginBottom: Spacing.md },
  analyzeBtnText: { fontSize: 15, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
  loadingState: { padding: Spacing.xl, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center', marginBottom: Spacing.md },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
  newReadingBtn: { marginTop: Spacing.md, alignItems: 'center' },
  newReadingBtnText: { fontSize: 13, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },
  lockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  lockedIcon: { fontSize: 56 },
  lockedTitle: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  lockedText: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  unlockBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  unlockBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
});
