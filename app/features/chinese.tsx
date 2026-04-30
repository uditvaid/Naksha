import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@store/userStore';
import { getChineseReading } from '@services/claude';
import { CHINESE_ZODIAC } from '@constants/astrology';
import { Colors, Fonts, Spacing, Radius } from '@constants/theme';
import {
  getYearPillar, getMonthPillar, getDayPillar, getHourPillar,
  getElementBalance, getLuckPillars,
  DAY_MASTER_PROFILES, BAZI_COMPATIBILITY, LUCKY_ATTRIBUTES,
  ELEMENT_DATA, ELEMENT_BALANCE_TIPS,
  type Pillar, type LuckPillar,
} from '@utils/bazi';

const ANIMAL_EMOJIS: Record<string, string> = {
  Rat:'🐭', Ox:'🐂', Tiger:'🐯', Rabbit:'🐰', Dragon:'🐲',
  Snake:'🐍', Horse:'🐴', Goat:'🐐', Monkey:'🐒', Rooster:'🐓', Dog:'🐕', Pig:'🐷',
};

function stripMarkdown(t: string) {
  return t.replace(/^#{1,6}\s*/gm,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').trim();
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({ label, pillar, dim }: { label: string; pillar: Pillar | null; dim?: boolean }) {
  if (!pillar) {
    return (
      <View style={[pillarStyles.card, dim && pillarStyles.dim]}>
        <Text style={pillarStyles.label}>{label}</Text>
        <Text style={pillarStyles.char}>—</Text>
        <Text style={pillarStyles.stem}>Unknown</Text>
        <Text style={pillarStyles.branch}>—</Text>
        <Text style={[pillarStyles.elemDot, { color: Colors.muted }]}>—</Text>
      </View>
    );
  }
  const stemEl = ELEMENT_DATA[pillar.stemElement];
  const branchEl = ELEMENT_DATA[pillar.branchElement];
  return (
    <View style={[pillarStyles.card, dim && pillarStyles.dim]}>
      <Text style={pillarStyles.label}>{label}</Text>
      <Text style={[pillarStyles.char, { color: stemEl?.color ?? Colors.gold }]}>{pillar.stemChar}</Text>
      <Text style={pillarStyles.stem}>{pillar.stem}</Text>
      <Text style={[pillarStyles.char, { color: branchEl?.color ?? Colors.star, fontSize: 20, marginTop: 4 }]}>{pillar.branchChar}</Text>
      <Text style={pillarStyles.branch}>{pillar.branch}</Text>
      <View style={pillarStyles.elemRow}>
        <Text style={[pillarStyles.elemDot, { color: stemEl?.color ?? Colors.gold }]}>◆</Text>
        <Text style={[pillarStyles.elemDot, { color: branchEl?.color ?? Colors.star }]}>◆</Text>
      </View>
    </View>
  );
}

const pillarStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 2 },
  dim: { opacity: 0.55 },
  label: { fontSize: 8, letterSpacing: 1.5, color: Colors.muted, fontFamily: Fonts.cinzel, textTransform: 'uppercase', marginBottom: 4 },
  char: { fontSize: 26, color: Colors.gold },
  stem: { fontSize: 9, color: Colors.muted, fontFamily: Fonts.cinzel, textAlign: 'center', letterSpacing: 0.3 },
  branch: { fontSize: 11, color: Colors.star, fontFamily: Fonts.cinzel, textAlign: 'center' },
  elemRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  elemDot: { fontSize: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChineseScreen() {
  const user = useAppStore(s => s.user);
  const saveReading = useAppStore(s => s.saveReading);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'pillars'|'daymaster'|'elements'|'luck'>('pillars');

  if (!user.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lockedState}>
          <Text style={styles.lockedIcon}>☯</Text>
          <Text style={styles.lockedTitle}>Chinese Astrology</Text>
          <Text style={styles.lockedText}>Unlock your full BaZi chart — Four Pillars, Day Master analysis, Five Element balance, Luck Pillars, and your personalised annual reading.</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/paywall')}>
            <Text style={styles.unlockBtnText}>✦ Unlock with Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const birthData = user.birthData;
  if (!birthData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lockedState}>
          <Text style={styles.lockedIcon}>☯</Text>
          <Text style={styles.lockedTitle}>Birth Details Required</Text>
          <Text style={styles.lockedText}>Complete your birth details to generate your BaZi chart.</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/onboarding')}>
            <Text style={styles.unlockBtnText}>Set Up My Chart →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── BaZi Calculation ────────────────────────────────────────────────────────

  const birthDate = new Date(birthData.dateOfBirth + 'T12:00:00Z');
  const birthYear  = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;

  const yearPillar  = useMemo(() => getYearPillar(birthYear), [birthYear]);
  const monthPillar = useMemo(() => getMonthPillar(birthMonth, yearPillar.stemIndex), [birthMonth, yearPillar.stemIndex]);
  const dayPillar   = useMemo(() => getDayPillar(birthData.dateOfBirth), [birthData.dateOfBirth]);
  const hourPillar  = useMemo(() => getHourPillar(birthData.timeOfBirth ?? '', dayPillar.stemIndex), [birthData.timeOfBirth, dayPillar.stemIndex]);

  const allPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const balance    = useMemo(() => getElementBalance(allPillars), [yearPillar, monthPillar, dayPillar, hourPillar]);
  const luckPillars = useMemo(() => getLuckPillars(monthPillar, yearPillar.stemIndex, birthYear), [monthPillar, yearPillar.stemIndex, birthYear]);

  const dayMaster = DAY_MASTER_PROFILES[dayPillar.stem];
  const dayMasterEl = ELEMENT_DATA[dayPillar.stemElement];

  // Animal / element info
  const zodiacData   = CHINESE_ZODIAC.find(z => z.name === yearPillar.branch);
  const animalEmoji  = ANIMAL_EMOJIS[yearPillar.branch] ?? '☯';
  const compatibility = BAZI_COMPATIBILITY[yearPillar.branch];
  const lucky         = LUCKY_ATTRIBUTES[yearPillar.branch];

  // Current year
  const currentYear = new Date().getFullYear();
  const currentYearPillar = getYearPillar(currentYear);
  const currentAnimal = currentYearPillar.branch;
  const currentAnimalEmoji = ANIMAL_EMOJIS[currentAnimal] ?? '☯';

  const maxBalance = Math.max(balance.Wood, balance.Fire, balance.Earth, balance.Metal, balance.Water, 1);
  const elements: Array<{ name: string; count: number }> = [
    { name: 'Wood', count: balance.Wood }, { name: 'Fire', count: balance.Fire },
    { name: 'Earth', count: balance.Earth }, { name: 'Metal', count: balance.Metal },
    { name: 'Water', count: balance.Water },
  ];

  const fetchReading = async () => {
    setLoading(true);
    try {
      const baziSummary = `Year: ${yearPillar.stem} ${yearPillar.branch} | Month: ${monthPillar.stem} ${monthPillar.branch} | Day: ${dayPillar.stem} ${dayPillar.branch}${hourPillar ? ` | Hour: ${hourPillar.stem} ${hourPillar.branch}` : ''}. Day Master: ${dayPillar.stem}. Five Elements — strongest: ${balance.strongest}, weakest: ${balance.weakest}.`;
      const result = await getChineseReading(birthData, yearPillar.branch, `${yearPillar.stem} (Day Master: ${dayPillar.stem})`, baziSummary);
      const clean = stripMarkdown(result);
      setReading(clean);
      saveReading({ type: 'chinese', title: `${dayPillar.stem} Day Master · ${yearPillar.branch} Year`, preview: clean.slice(0, 120), content: clean });
    } catch (e: any) {
      setReading(`Unable to fetch reading: ${e?.message ?? 'Please check your connection.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>BaZi · Four Pillars</Text>
          <Text style={styles.subtitle}>八字命理 · Chinese Destiny Chart</Text>
        </View>

        {/* Animal Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.animalEmoji}>{animalEmoji}</Text>
          <Text style={styles.animalName}>{yearPillar.stem} {yearPillar.branch}</Text>
          <Text style={styles.birthYear}>Born {birthYear}</Text>
          <View style={styles.heroRow}>
            <View style={[styles.heroBadge, { borderColor: dayMasterEl?.color ?? Colors.gold }]}>
              <Text style={[styles.heroBadgeText, { color: dayMasterEl?.color ?? Colors.gold }]}>
                {dayPillar.stemChar} Day Master
              </Text>
            </View>
            <View style={[styles.heroBadge, { borderColor: zodiacData?.yin ? '#A78BFA' : '#F59E0B' }]}>
              <Text style={[styles.heroBadgeText, { color: zodiacData?.yin ? '#A78BFA' : '#F59E0B' }]}>
                {zodiacData?.yin ? 'Yin 陰' : 'Yang 陽'}
              </Text>
            </View>
          </View>
        </View>

        {/* Core Traits */}
        {zodiacData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CORE TRAITS</Text>
            <View style={styles.traitsGrid}>
              {zodiacData.traits.map(t => (
                <View key={t} style={styles.traitChip}>
                  <Text style={styles.traitText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section tabs */}
        <View style={styles.sectionTabs}>
          {(['pillars','daymaster','elements','luck'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sectionTab, activeSection === s && styles.sectionTabActive]}
              onPress={() => setActiveSection(s)}
            >
              <Text style={[styles.sectionTabText, activeSection === s && styles.sectionTabTextActive]}>
                {s === 'pillars' ? 'Four Pillars' : s === 'daymaster' ? 'Day Master' : s === 'elements' ? 'Five Elements' : 'Luck Pillars'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Four Pillars ── */}
        {activeSection === 'pillars' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Your BaZi chart is built from four pillars — Year, Month, Day, and Hour. Each pillar has a Heavenly Stem (天干) and Earthly Branch (地支), together forming 8 characters that map the energies present at your birth.
            </Text>
            <View style={styles.pillarsRow}>
              <PillarCard label="Year" pillar={yearPillar} />
              <PillarCard label="Month" pillar={monthPillar} />
              <PillarCard label="Day" pillar={dayPillar} />
              <PillarCard label="Hour" pillar={hourPillar} dim={!hourPillar} />
            </View>
            {!hourPillar && (
              <Text style={styles.approxNote}>Hour pillar requires exact birth time. Add yours in settings to complete your chart.</Text>
            )}

            {/* Year pillar note */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Your Year Pillar · {yearPillar.stemChar}{yearPillar.branchChar}</Text>
              <Text style={styles.infoText}>
                The Year Pillar reveals the broad social and ancestral energies you were born into — your relationship with society, early family environment, and the collective karma you inherited. The {yearPillar.stem} stem brings {ELEMENT_DATA[yearPillar.stemElement]?.keywords.join(', ').toLowerCase() ?? ''}, while the {yearPillar.branch} branch shapes the animal nature of this era.
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Your Month Pillar · {monthPillar.stemChar}{monthPillar.branchChar}</Text>
              <Text style={styles.infoText}>
                The Month Pillar governs your career potential, social relationships, and the chapter of life between ages 16–30. It reveals how you naturally build and achieve in the world. The {monthPillar.stem} energy shapes your professional character.
              </Text>
            </View>

            <View style={[styles.infoCard, { borderColor: dayMasterEl?.color ?? Colors.gold, borderWidth: 1.5 }]}>
              <Text style={[styles.infoTitle, { color: dayMasterEl?.color ?? Colors.gold }]}>Your Day Pillar · {dayPillar.stemChar}{dayPillar.branchChar} — The Most Important</Text>
              <Text style={styles.infoText}>
                The Day Pillar's Heavenly Stem is your Day Master — the central element of your entire chart, representing your self, your core identity, and how you engage with the world. Everything else in your chart is interpreted relative to this: {dayPillar.stem} ({dayPillar.stemChar}).
              </Text>
            </View>
          </View>
        )}

        {/* ── Day Master ── */}
        {activeSection === 'daymaster' && dayMaster && (
          <View style={styles.section}>
            <View style={[styles.dayMasterHero, { borderColor: dayMasterEl?.color ?? Colors.gold }]}>
              <Text style={[styles.dayMasterChar, { color: dayMasterEl?.color ?? Colors.gold }]}>{dayMaster.char}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayMasterTitle, { color: dayMasterEl?.color ?? Colors.gold }]}>{dayMaster.title}</Text>
                <Text style={styles.dayMasterNature}>{dayMaster.nature}</Text>
              </View>
            </View>

            <View style={styles.dayMasterCard}>
              <Text style={styles.dayMasterSectionLabel}>WHO YOU ARE</Text>
              <Text style={styles.dayMasterText}>{dayMaster.personality}</Text>
            </View>

            <View style={styles.dayMasterCard}>
              <Text style={styles.dayMasterSectionLabel}>IN RELATIONSHIPS</Text>
              <Text style={styles.dayMasterText}>{dayMaster.relationships}</Text>
            </View>

            <View style={styles.dayMasterCard}>
              <Text style={styles.dayMasterSectionLabel}>IN WORK & CAREER</Text>
              <Text style={styles.dayMasterText}>{dayMaster.career}</Text>
            </View>

            <View style={[styles.dayMasterCard, { borderColor: Colors.amber + '60' }]}>
              <Text style={[styles.dayMasterSectionLabel, { color: Colors.amber }]}>YOUR GROWTH EDGE</Text>
              <Text style={styles.dayMasterText}>{dayMaster.challenge}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Elements that support you</Text>
              <View style={styles.usefulElemsRow}>
                {dayMaster.usefulElements.map(el => {
                  const ed = ELEMENT_DATA[el];
                  return (
                    <View key={el} style={[styles.usefulElemChip, { borderColor: ed?.color ?? Colors.gold }]}>
                      <Text style={[styles.usefulElemChar, { color: ed?.color ?? Colors.gold }]}>{ed?.symbol ?? el[0]}</Text>
                      <Text style={[styles.usefulElemText, { color: ed?.color ?? Colors.gold }]}>{el}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.infoText}>These elements strengthen your Day Master and bring more ease into your life. Favour their colours, directions, and activities.</Text>
            </View>
          </View>
        )}

        {/* ── Five Elements ── */}
        {activeSection === 'elements' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Your BaZi chart contains 8 characters, each carrying one of the Five Elements (五行). The balance — or imbalance — between them shapes your strengths, weaknesses, and what you naturally seek or lack.
            </Text>

            {/* Visual balance bars */}
            {elements.map(({ name, count }) => {
              const ed = ELEMENT_DATA[name];
              const pct = count / maxBalance;
              return (
                <View key={name} style={styles.elementRow}>
                  <Text style={[styles.elementSymbol, { color: ed?.color ?? Colors.gold }]}>{ed?.symbol ?? name[0]}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.elementBarBg}>
                      <View style={[styles.elementBarFill, { width: `${Math.max(pct * 100, 4)}%`, backgroundColor: ed?.color ?? Colors.gold }]} />
                    </View>
                    <Text style={styles.elementName}>{name} — {ed?.keywords.join(', ') ?? ''}</Text>
                  </View>
                  <Text style={[styles.elementCount, { color: ed?.color ?? Colors.gold }]}>{count}</Text>
                </View>
              );
            })}

            {/* Strongest */}
            <View style={[styles.infoCard, { borderColor: (ELEMENT_DATA[balance.strongest]?.color ?? Colors.gold) + '80' }]}>
              <Text style={[styles.infoTitle, { color: ELEMENT_DATA[balance.strongest]?.color ?? Colors.gold }]}>
                Dominant: {balance.strongest} {ELEMENT_DATA[balance.strongest]?.symbol ?? ''}
              </Text>
              <Text style={styles.infoText}>{ELEMENT_BALANCE_TIPS[balance.strongest]?.excess ?? ''}</Text>
            </View>

            {/* Weakest */}
            <View style={[styles.infoCard, { borderColor: (ELEMENT_DATA[balance.weakest]?.color ?? Colors.muted) + '60' }]}>
              <Text style={[styles.infoTitle, { color: ELEMENT_DATA[balance.weakest]?.color ?? Colors.muted }]}>
                Deficient: {balance.weakest} {ELEMENT_DATA[balance.weakest]?.symbol ?? ''}
              </Text>
              <Text style={styles.infoText}>{ELEMENT_BALANCE_TIPS[balance.weakest]?.deficient ?? ''}</Text>
            </View>
          </View>
        )}

        {/* ── Luck Pillars ── */}
        {activeSection === 'luck' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Luck Pillars (大运) are 10-year chapters of your life — the closest Chinese astrology equivalent to Vedic Mahadashas. Each brings a specific elemental energy that activates different parts of your destiny chart. The direction (forward/backward) varies by birth year polarity and gender.
            </Text>

            {luckPillars.map((lp, i) => {
              const stemEl = ELEMENT_DATA[lp.stemElement];
              const branchEl = ELEMENT_DATA[lp.branchElement];
              const isCurrent = (currentYear >= lp.startYear && currentYear < lp.startYear + 10);
              return (
                <View key={i} style={[styles.luckPillarCard, isCurrent && styles.luckPillarActive]}>
                  <View style={styles.luckLeft}>
                    <Text style={[styles.luckChar, { color: stemEl?.color ?? Colors.gold }]}>{lp.stemChar}</Text>
                    <Text style={[styles.luckChar, { color: branchEl?.color ?? Colors.star, fontSize: 18 }]}>{lp.branchChar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.luckTopRow}>
                      <Text style={styles.luckName}>{lp.stem} {lp.branch}</Text>
                      {isCurrent && <View style={styles.nowBadge}><Text style={styles.nowBadgeText}>NOW</Text></View>}
                    </View>
                    <Text style={styles.luckDates}>Ages {lp.startAge}–{lp.endAge} · {lp.startYear}–{lp.startYear + 9}</Text>
                    <View style={styles.luckElemsRow}>
                      <Text style={[styles.luckElem, { color: stemEl?.color ?? Colors.gold }]}>{lp.stemElement}</Text>
                      <Text style={styles.luckElemSep}>·</Text>
                      <Text style={[styles.luckElem, { color: branchEl?.color ?? Colors.star }]}>{lp.branchElement}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <Text style={styles.approxNote}>Start ages are approximate. Precise calculation requires exact solar term distances from birth date.</Text>
          </View>
        )}

        {/* Compatible Signs */}
        {compatibility && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COMPATIBILITY</Text>
            <View style={styles.compatCard}>
              <Text style={styles.compatLabel}>Best Matches</Text>
              <View style={styles.compatRow}>
                {compatibility.best.map(a => (
                  <View key={a} style={styles.compatAnimal}>
                    <Text style={styles.compatEmoji}>{ANIMAL_EMOJIS[a] ?? '?'}</Text>
                    <Text style={styles.compatName}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.compatCard, { borderColor: Colors.ruby + '40' }]}>
              <Text style={[styles.compatLabel, { color: Colors.ruby }]}>Needs Patience</Text>
              <View style={styles.compatRow}>
                {compatibility.challenging.slice(0, 3).map(a => (
                  <View key={a} style={styles.compatAnimal}>
                    <Text style={styles.compatEmoji}>{ANIMAL_EMOJIS[a] ?? '?'}</Text>
                    <Text style={styles.compatName}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Lucky Attributes */}
        {lucky && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LUCKY ATTRIBUTES</Text>
            <View style={styles.luckyGrid}>
              <View style={styles.luckyCard}>
                <Text style={styles.luckyLabel}>Numbers</Text>
                <Text style={styles.luckyValue}>{lucky.numbers}</Text>
              </View>
              <View style={styles.luckyCard}>
                <Text style={styles.luckyLabel}>Direction</Text>
                <Text style={styles.luckyValue}>{lucky.direction}</Text>
              </View>
              <View style={styles.luckyCard}>
                <Text style={styles.luckyLabel}>Season</Text>
                <Text style={styles.luckyValue}>{lucky.season}</Text>
              </View>
            </View>
            <View style={styles.luckyColorsRow}>
              {lucky.colors.map(c => (
                <View key={c} style={styles.luckyColorChip}>
                  <Text style={styles.luckyColorText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Current Year */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT YEAR — {currentYear}</Text>
          <View style={styles.currentYearCard}>
            <Text style={styles.currentYearAnimal}>{currentAnimalEmoji} {currentYearPillar.stem} {currentYearPillar.branch} Year</Text>
            <Text style={styles.currentYearText}>
              The {currentAnimal} year brings {(ELEMENT_DATA[currentYearPillar.stemElement]?.keywords.join(', ').toLowerCase() ?? '')} energy. How this interacts with your {yearPillar.branch} nature and {dayPillar.stem} Day Master is detailed in your personalised reading below.
            </Text>
          </View>
        </View>

        {/* AI Reading */}
        {reading === '' && !loading && (
          <TouchableOpacity style={styles.readingBtn} onPress={fetchReading}>
            <Text style={styles.readingBtnText}>✦ Get My Personalised BaZi Reading ✦</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={styles.loadingText}>Consulting the Four Pillars…</Text>
          </View>
        )}

        {reading !== '' && (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>✦ YOUR BAZI READING ✦{'\n'}AI-Generated Analysis</Text>
            <Text style={styles.readingText}>{reading}</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setReading('')}>
              <Text style={styles.resetBtnText}>Get New Reading</Text>
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
  header: { padding: Spacing.md },
  backText: { fontSize: 14, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.cinzel, color: Colors.gold },
  subtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorantItalic, marginTop: 2 },

  heroCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  animalEmoji: { fontSize: 64 },
  animalName: { fontSize: 22, fontFamily: Fonts.cinzel, color: Colors.gold },
  birthYear: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.cormorant },
  heroRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  heroBadge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  heroBadgeText: { fontSize: 11, fontFamily: Fonts.cinzel, letterSpacing: 0.5 },

  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontFamily: Fonts.cinzel, marginBottom: 10 },
  sectionSubtitle: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20, marginBottom: 16 },

  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitChip: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  traitText: { fontSize: 13, color: Colors.star, fontFamily: Fonts.crimson },

  sectionTabs: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: 4, gap: 4 },
  sectionTab: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
  sectionTabActive: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold },
  sectionTabText: { fontSize: 9, fontFamily: Fonts.cinzel, color: Colors.muted, letterSpacing: 0.3, textAlign: 'center' },
  sectionTabTextActive: { color: Colors.gold },

  pillarsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  approxNote: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.cormorantItalic, textAlign: 'center', marginTop: 8, marginBottom: 12 },

  infoCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 10 },
  infoTitle: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.gold, marginBottom: 8 },
  infoText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 21 },

  dayMasterHero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.card, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 12 },
  dayMasterChar: { fontSize: 48, fontFamily: Fonts.cinzel },
  dayMasterTitle: { fontSize: 16, fontFamily: Fonts.cinzel, marginBottom: 2 },
  dayMasterNature: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  dayMasterCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 10 },
  dayMasterSectionLabel: { fontSize: 9, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, marginBottom: 8 },
  dayMasterText: { fontSize: 14, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 22 },
  usefulElemsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  usefulElemChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  usefulElemChar: { fontSize: 18 },
  usefulElemText: { fontSize: 12, fontFamily: Fonts.cinzel },

  elementRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  elementSymbol: { fontSize: 22, width: 28, textAlign: 'center' },
  elementBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  elementBarFill: { height: '100%', borderRadius: 4 },
  elementName: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson },
  elementCount: { fontSize: 18, fontFamily: Fonts.cinzel, width: 24, textAlign: 'right' },

  luckPillarCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  luckPillarActive: { borderColor: Colors.gold, backgroundColor: 'rgba(201,168,76,0.06)' },
  luckLeft: { alignItems: 'center', width: 36 },
  luckChar: { fontSize: 22, fontFamily: Fonts.cinzel },
  luckTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  luckName: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.star },
  nowBadge: { backgroundColor: Colors.emerald + '22', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  nowBadgeText: { fontSize: 9, color: Colors.emerald, fontFamily: Fonts.cinzel, letterSpacing: 1 },
  luckDates: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.crimson, marginBottom: 2 },
  luckElemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  luckElem: { fontSize: 11, fontFamily: Fonts.crimson },
  luckElemSep: { fontSize: 11, color: Colors.muted },

  compatCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 10 },
  compatLabel: { fontSize: 10, letterSpacing: 1.5, color: Colors.emerald, fontFamily: Fonts.cinzel, marginBottom: 12 },
  compatRow: { flexDirection: 'row', gap: 12 },
  compatAnimal: { alignItems: 'center', gap: 4 },
  compatEmoji: { fontSize: 28 },
  compatName: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.cinzel },

  luckyGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  luckyCard: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 4 },
  luckyLabel: { fontSize: 9, letterSpacing: 1, color: Colors.muted, fontFamily: Fonts.cinzel },
  luckyValue: { fontSize: 12, color: Colors.star, fontFamily: Fonts.cinzel, textAlign: 'center' },
  luckyColorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  luckyColorChip: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  luckyColorText: { fontSize: 12, color: Colors.star, fontFamily: Fonts.crimson },

  currentYearCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.lg, padding: Spacing.md },
  currentYearAnimal: { fontSize: 16, fontFamily: Fonts.cinzel, color: Colors.star, marginBottom: 8 },
  currentYearText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.crimson, lineHeight: 20 },

  readingBtn: { marginHorizontal: Spacing.md, backgroundColor: Colors.gold, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginBottom: Spacing.md },
  readingBtnText: { fontSize: 13, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 0.5, textAlign: 'center' },
  loadingState: { padding: Spacing.xl, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.cormorantItalic },
  readingCard: { margin: Spacing.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radius.xl, padding: Spacing.md },
  readingLabel: { fontSize: 10, letterSpacing: 2, color: Colors.gold, fontFamily: Fonts.cinzel, textAlign: 'center', marginBottom: Spacing.md },
  readingText: { fontSize: 15, color: Colors.star, fontFamily: Fonts.crimson, lineHeight: 26 },
  resetBtn: { marginTop: Spacing.md, alignItems: 'center' },
  resetBtnText: { fontSize: 12, color: Colors.gold, fontFamily: Fonts.cinzel, textDecorationLine: 'underline' },

  lockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  lockedIcon: { fontSize: 56 },
  lockedTitle: { fontSize: 26, fontFamily: Fonts.cinzel, color: Colors.gold },
  lockedText: { fontSize: 15, color: Colors.muted, fontFamily: Fonts.crimson, textAlign: 'center', lineHeight: 24 },
  unlockBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  unlockBtnText: { fontSize: 14, fontFamily: Fonts.cinzel, color: Colors.midnight, letterSpacing: 1 },
});
