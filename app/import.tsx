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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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

    // Get existing dreams to avoid duplicates
    const { data: existing } = await supabase
      .from('dreams')
      .select('journal_text')
      .eq('user_id', user.id);

    const existingSet = new Set(
      (existing || []).map((d: any) => d.journal_text?.slice(0, 100))
    );

    let imported = 0;
    let skipped = 0;

    for (const dream of dreams) {
      // Check duplicate
      if (existingSet.has(dream.text.slice(0, 100))) {
        skipped++;
        setProgress(p => ({ ...p, skipped }));
        continue;
      }

      const title = generateTitle(dream.text);
      const mood = guessMood(dream.text);
      const recordedAt = new Date(dream.date + 'T08:00:00Z').toISOString();

      const { error } = await supabase.from('dreams').insert({
        user_id: user.id,
        title,
        journal_text: dream.text,
        mood,
        recorded_at: recordedAt,
        created_at: recordedAt,
        model_used: `${dream.source}-import`,
      });

      if (!error) {
        imported++;
        existingSet.add(dream.text.slice(0, 100));
      }
      setProgress(p => ({ ...p, imported }));
    }

    // Dream count is handled by the database trigger (update_dream_stats)
    if (imported > 0) {
      await refreshProfile?.();
    }

    setProgress({ imported, skipped, total: dreams.length });
    setStep('done');
  }, [dreams, user, profile, refreshProfile]);

  const reset = () => {
    setStep('choose');
    setDreams([]);
    setPasteText('');
    setShowPaste(false);
    setProgress({ imported: 0, skipped: 0, total: 0 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Import Dreams</Text>
        </View>

        {/* Step: Choose source */}
        {step === 'choose' && (
          <>
            <Text style={styles.subtitle}>
              Bring your dream journal into Animus. We support multiple formats.
            </Text>

            <Pressable style={styles.optionCard} onPress={pickFile}>
              <Text style={styles.optionIcon}>📄</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>ChatGPT Export</Text>
                <Text style={styles.optionDesc}>
                  JSON file from ChatGPT data export with dream conversations
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.optionCard} onPress={pickFile}>
              <Text style={styles.optionIcon}>📝</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Text or CSV File</Text>
                <Text style={styles.optionDesc}>
                  Plain text (one dream per paragraph) or CSV with date and dream columns
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.optionCard} onPress={() => setShowPaste(true)}>
              <Text style={styles.optionIcon}>✍️</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Paste Text</Text>
                <Text style={styles.optionDesc}>
                  Copy and paste dreams directly — separate with blank lines
                </Text>
              </View>
            </Pressable>

            {showPaste && (
              <View style={styles.pasteSection}>
                <TextInput
                  style={styles.pasteInput}
                  multiline
                  placeholder="Paste your dreams here...&#10;&#10;Separate each dream with a blank line.&#10;Optionally start each with a date (2025-03-15)."
                  placeholderTextColor={colors.textMuted}
                  value={pasteText}
                  onChangeText={setPasteText}
                  textAlignVertical="top"
                />
                <Pressable style={styles.parseBtn} onPress={handlePaste}>
                  <Text style={styles.parseBtnText}>Parse Dreams</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.formatInfo}>
              <Text style={styles.formatTitle}>Supported formats</Text>
              <Text style={styles.formatItem}>• ChatGPT data export (conversations JSON)</Text>
              <Text style={styles.formatItem}>• Plain text (dreams separated by blank lines)</Text>
              <Text style={styles.formatItem}>• CSV with date + dream_text columns</Text>
              <Text style={styles.formatItem}>• Any JSON with date + text fields</Text>
            </View>
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <Text style={styles.subtitle}>
              Found {dreams.length} dream{dreams.length !== 1 ? 's' : ''} to import.
              Review them below, then tap Import.
            </Text>

            {dreams.map((dream, i) => {
              const mood = guessMood(dream.text);
              return (
                <View key={i} style={[styles.dreamPreview, { backgroundColor: moodTints[mood] || colors.bgCard }]}>
                  <View style={styles.dreamPreviewHeader}>
                    <Text style={styles.dreamDate}>{dream.date}</Text>
                    <View style={[styles.moodBadge, { backgroundColor: moodColors[mood] || colors.accent }]}>
                      <Text style={styles.moodText}>{mood}</Text>
                    </View>
                  </View>
                  <Text style={styles.dreamTitle}>{generateTitle(dream.text)}</Text>
                  <Text style={styles.dreamExcerpt} numberOfLines={3}>
                    {dream.text}
                  </Text>
                </View>
              );
            })}

            <View style={styles.actionRow}>
              <Pressable style={styles.cancelBtn} onPress={reset}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.importBtn} onPress={startImport}>
                <Text style={styles.importBtnText}>
                  Import {dreams.length} Dream{dreams.length !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <View style={styles.progressSection}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.progressText}>
              Importing dreams... {progress.imported + progress.skipped} / {progress.total}
            </Text>
            <Text style={styles.progressDetail}>
              {progress.imported} imported · {progress.skipped} skipped (duplicates)
            </Text>
          </View>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <View style={styles.doneSection}>
            <Text style={styles.doneIcon}>✨</Text>
            <Text style={styles.doneTitle}>Import Complete</Text>
            <Text style={styles.doneDetail}>
              {progress.imported} dream{progress.imported !== 1 ? 's' : ''} imported
            </Text>
            {progress.skipped > 0 && (
              <Text style={styles.doneSkipped}>
                {progress.skipped} skipped (already in your journal)
              </Text>
            )}
            <Pressable
              style={styles.importBtn}
              onPress={() => router.replace('/(tabs)/journal')}
            >
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
  container: { flex: 1, backgroundColor: colors.bgSurface },
  content: { padding: spacing.lg, paddingBottom: 100 },

  header: { marginBottom: spacing.lg },
  backText: { color: colors.accent, fontSize: 16, marginBottom: spacing.sm },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary },

  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },

  // Source options
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIcon: { fontSize: 28, marginRight: spacing.md },
  optionInfo: { flex: 1 },
  optionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  optionDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  // Paste section
  pasteSection: { marginTop: spacing.sm, marginBottom: spacing.md },
  pasteInput: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 160,
    lineHeight: 20,
  },
  parseBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  parseBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Format info
  formatInfo: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatTitle: { color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  formatItem: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },

  // Dream previews
  dreamPreview: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dreamPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  dreamDate: { color: colors.textMuted, fontSize: 12 },
  moodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  moodText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  dreamTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: spacing.xs },
  dreamExcerpt: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '500' },
  importBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Progress
  progressSection: { alignItems: 'center', paddingTop: spacing.xxl },
  progressText: { color: colors.textPrimary, fontSize: 18, marginTop: spacing.lg },
  progressDetail: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs },

  // Done
  doneSection: { alignItems: 'center', paddingTop: spacing.xl },
  doneIcon: { fontSize: 48, marginBottom: spacing.md },
  doneTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.textPrimary, marginBottom: spacing.sm },
  doneDetail: { color: colors.success, fontSize: 18, fontWeight: '600', marginBottom: spacing.xs },
  doneSkipped: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
});
