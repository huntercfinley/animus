import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { parseDreams, guessMood, generateTitle, type ParsedDream } from '@/lib/import-dreams';
import { colors, fonts, spacing, borderRadius, moodColors, moodTints } from '@/constants/theme';

type Step = 'choose' | 'preview' | 'importing' | 'done';

export default function ImportScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [dreams, setDreams] = useState<ParsedDream[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [progress, setProgress] = useState({ imported: 0, skipped: 0, total: 0 });

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseDreams(content);
      if (parsed.length === 0) {
        Alert.alert('No Dreams Found', 'Could not find any dreams in this file. Try a different format or paste your dreams directly.');
        return;
      }
      setDreams(parsed);
      setStep('preview');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read file');
    }
  }, []);

  const handlePaste = useCallback(() => {
    if (pasteText.trim().length < 20) {
      Alert.alert('Too Short', 'Please enter at least a full dream description.');
      return;
    }
    const parsed = parseDreams(pasteText);
    if (parsed.length === 0) {
      Alert.alert('No Dreams Found', 'Could not parse any dreams from the text.');
      return;
    }
    setDreams(parsed);
    setShowPaste(false);
    setStep('preview');
  }, [pasteText]);

  const startImport = useCallback(async () => {
    if (!user) return;
    setStep('importing');
    setProgress({ imported: 0, skipped: 0, total: dreams.length });
    const { data: existing } = await supabase
      .from('dreams').select('journal_text').eq('user_id', user.id);
    const existingSet = new Set((existing || []).map((d: any) => d.journal_text?.slice(0, 100)));
    let imported = 0;
    let skipped = 0;
    for (const dream of dreams) {
      if (existingSet.has(dream.text.slice(0, 100))) {
        skipped++;
        setProgress(p => ({ ...p, skipped }));
        continue;
      }
      const title = generateTitle(dream.text);
      const mood = guessMood(dream.text);
      const recordedAt = new Date(dream.date + 'T08:00:00Z').toISOString();
      const { error } = await supabase.from('dreams').insert({
        user_id: user.id, title, journal_text: dream.text, mood,
        recorded_at: recordedAt, created_at: recordedAt,
        model_used: `${dream.source}-import`,
      });
      if (!error) { imported++; existingSet.add(dream.text.slice(0, 100)); }
      setProgress(p => ({ ...p, imported }));
    }
    if (imported > 0) await refreshProfile?.();
    setProgress({ imported, skipped, total: dreams.length });
    setStep('done');
  }, [dreams, user, profile, refreshProfile]);

  const reset = () => {
    setStep('choose'); setDreams([]); setPasteText('');
    setShowPaste(false); setProgress({ imported: 0, skipped: 0, total: 0 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header — Stitch: arrow_back + serif title */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Import Dreams</Text>
          <Text style={styles.subtitle}>
            Bring your dream journal into Animus. We support multiple formats.
          </Text>
        </View>

        {/* Step: Choose source */}
        {step === 'choose' && (
          <>
            {/* Option Cards — Stitch: rounded-2xl p-6, icon container, chevron */}
            <View style={styles.optionStack}>
              <Pressable
                style={({ pressed }) => [styles.optionCard, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={pickFile}
              >
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="description" size={28} color={colors.primaryContainer} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>ChatGPT Export</Text>
                  <Text style={styles.optionDesc}>JSON file from ChatGPT data export with dream conversations</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.outlineVariant} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.optionCard, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={pickFile}
              >
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="table-rows" size={28} color={colors.primaryContainer} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Text or CSV File</Text>
                  <Text style={styles.optionDesc}>Plain text or CSV with date and dream columns</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.outlineVariant} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.optionCard, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => setShowPaste(true)}
              >
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="edit-note" size={28} color={colors.primaryContainer} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Paste Text</Text>
                  <Text style={styles.optionDesc}>Copy and paste dreams directly — separate with blank lines</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.outlineVariant} />
              </Pressable>
            </View>

            {showPaste && (
              <View style={styles.pasteSection}>
                <TextInput
                  style={styles.pasteInput}
                  multiline
                  placeholder={'Paste your dreams here...\n\nSeparate each dream with a blank line.\nOptionally start each with a date (2025-03-15).'}
                  placeholderTextColor={`${colors.textMuted}80`}
                  value={pasteText}
                  onChangeText={setPasteText}
                  textAlignVertical="top"
                />
                <Pressable style={styles.parseBtn} onPress={handlePaste}>
                  <Text style={styles.parseBtnText}>Parse Dreams</Text>
                </Pressable>
              </View>
            )}

            {/* Decorative Quote — Stitch */}
            <View style={styles.quoteSection}>
              <LinearGradient
                colors={[`${colors.primaryContainer}40`, `${colors.secondaryContainer}60`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quoteImage}
              />
              <View style={styles.quoteOverlay}>
                <Text style={styles.quoteText}>
                  "The dream is the small hidden door in the deepest and most intimate sanctum of the soul."
                </Text>
              </View>
            </View>

            {/* Supported Formats — Stitch */}
            <View style={styles.formatBox}>
              <View style={styles.formatHeader}>
                <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                <Text style={styles.formatTitle}>Supported formats</Text>
              </View>
              {[
                'ChatGPT data export (conversations.json)',
                'Plain text (.txt, .md)',
                'CSV with \'date\' and \'entry\' columns',
                'Any JSON with date + text fields',
              ].map((item, i) => (
                <View key={i} style={styles.formatItem}>
                  <View style={styles.formatDot} />
                  <Text style={styles.formatItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <Text style={styles.previewSubtitle}>
              Found {dreams.length} dream{dreams.length !== 1 ? 's' : ''} to import. Review below, then tap Import.
            </Text>
            {dreams.map((dream, i) => {
              const mood = guessMood(dream.text);
              return (
                <View key={i} style={[styles.dreamPreview, { backgroundColor: moodTints[mood] || colors.surfaceContainerLowest }]}>
                  <View style={styles.dreamPreviewHeader}>
                    <Text style={styles.dreamDate}>{dream.date}</Text>
                    <View style={[styles.moodBadge, { backgroundColor: moodColors[mood] || colors.primary }]}>
                      <Text style={styles.moodText}>{mood}</Text>
                    </View>
                  </View>
                  <Text style={styles.dreamTitle}>{generateTitle(dream.text)}</Text>
                  <Text style={styles.dreamExcerpt} numberOfLines={3}>{dream.text}</Text>
                </View>
              );
            })}
            <View style={styles.actionRow}>
              <Pressable style={styles.cancelBtn} onPress={reset}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.importBtn} onPress={startImport}>
                <Text style={styles.importBtnText}>Import {dreams.length} Dream{dreams.length !== 1 ? 's' : ''}</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <View style={styles.progressSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressText}>Importing dreams... {progress.imported + progress.skipped} / {progress.total}</Text>
            <Text style={styles.progressDetail}>{progress.imported} imported · {progress.skipped} skipped (duplicates)</Text>
          </View>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <View style={styles.doneSection}>
            <MaterialIcons name="auto-awesome" size={48} color={colors.primary} />
            <Text style={styles.doneTitle}>Import Complete</Text>
            <Text style={styles.doneDetail}>{progress.imported} dream{progress.imported !== 1 ? 's' : ''} imported</Text>
            {progress.skipped > 0 && (
              <Text style={styles.doneSkipped}>{progress.skipped} skipped (already in your journal)</Text>
            )}
            <Pressable style={styles.importBtn} onPress={() => router.replace('/(tabs)/journal')}>
              <Text style={styles.importBtnText}>View Journal</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelBtnText}>Import More</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { maxWidth: 780, alignSelf: 'center', width: '100%', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120 },

  // Header
  header: { marginBottom: 48 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.secondary },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.3, marginBottom: 12 },
  subtitle: { fontFamily: fonts.sans, fontSize: 18, color: colors.textMuted, lineHeight: 28, maxWidth: 400 },

  // Option Cards — Stitch
  optionStack: { gap: 20, marginBottom: 48 },
  optionCard: {
    backgroundColor: '#F7F7FA',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: 'rgba(81, 79, 129, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  optionIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontFamily: fonts.sansSemiBold, fontSize: 18, color: colors.textPrimary, marginBottom: 2 },
  optionDesc: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },

  // Paste
  pasteSection: { marginBottom: 48 },
  pasteInput: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: 20, padding: 24,
    fontFamily: fonts.sans, fontSize: 16, color: colors.textPrimary, minHeight: 160, lineHeight: 24,
  },
  parseBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, marginTop: 12, alignItems: 'center' },
  parseBtnText: { fontFamily: fonts.sansSemiBold, color: '#fff', fontSize: 15 },

  // Quote section
  quoteSection: { height: 192, borderRadius: 24, overflow: 'hidden', marginBottom: 48, position: 'relative', backgroundColor: colors.surfaceContainer },
  quoteImage: { width: '100%', height: '100%', opacity: 0.2, position: 'absolute' },
  quoteOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 20, color: colors.textSecondary, textAlign: 'center' },

  // Format box
  formatBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 24, padding: 32 },
  formatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  formatTitle: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.textPrimary },
  formatItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  formatDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outlineVariant, marginTop: 6 },
  formatItemText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, flex: 1 },

  // Preview
  previewSubtitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  dreamPreview: { borderRadius: 16, padding: 16, marginBottom: 12 },
  dreamPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dreamDate: { fontFamily: fonts.sans, color: colors.textMuted, fontSize: 12 },
  moodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  moodText: { fontFamily: fonts.sansMedium, color: '#fff', fontSize: 11 },
  dreamTitle: { fontFamily: fonts.sansMedium, color: colors.textPrimary, fontSize: 14, marginBottom: 4 },
  dreamExcerpt: { fontFamily: fonts.sans, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.sansMedium, color: colors.textSecondary },
  importBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  importBtnText: { fontFamily: fonts.sansSemiBold, color: '#fff', fontSize: 15 },

  // Progress
  progressSection: { alignItems: 'center', paddingTop: 64 },
  progressText: { fontFamily: fonts.sans, color: colors.textPrimary, fontSize: 18, marginTop: 24 },
  progressDetail: { fontFamily: fonts.sans, color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  // Done
  doneSection: { alignItems: 'center', paddingTop: 48, gap: 12 },
  doneTitle: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary },
  doneDetail: { fontFamily: fonts.sansSemiBold, color: colors.success, fontSize: 18 },
  doneSkipped: { fontFamily: fonts.sans, color: colors.textMuted, fontSize: 14 },
});
