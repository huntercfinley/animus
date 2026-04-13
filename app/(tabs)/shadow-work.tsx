import { View, Text, FlatList, Pressable, Modal, Alert, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useShadowExercises } from '@/hooks/useShadowExercises';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ExerciseCard } from '@/components/shadow/ExerciseCard';
import { ExerciseSheet } from '@/components/shadow/ExerciseSheet';
import { getTodaysPrompt } from '@/lib/shadow-pool';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export default function ShadowWorkScreen() {
  const { user } = useAuth();
  const { exercises, loading, fetchExercises, generateExercise, saveResponse } = useShadowExercises();
  const { checkLimit, incrementLimit } = useUsageLimits();
  const [activeExercise, setActiveExercise] = useState<ShadowExercise | null>(null);
  const [generating, setGenerating] = useState(false);
  const [featuredJournal, setFeaturedJournal] = useState('');
  const featured = useMemo(() => getTodaysPrompt(), []);
  const { open: openExerciseId } = useLocalSearchParams<{ open?: string }>();
  const handledOpenParam = useRef<string | null>(null);

  // When arriving from a dream with ?open=<exerciseId>, open that exercise's sheet.
  useEffect(() => {
    if (!openExerciseId || handledOpenParam.current === openExerciseId) return;
    const match = exercises.find(e => e.id === openExerciseId);
    if (match) {
      handledOpenParam.current = openExerciseId;
      setActiveExercise(match);
      router.setParams({ open: undefined });
    }
  }, [openExerciseId, exercises]);

  const handleGenerate = async () => {
    const { allowed } = await checkLimit('shadow_exercise');
    if (!allowed) {
      Alert.alert('Daily limit reached', 'You\'ve completed your shadow exercises for today. Return tomorrow to continue your inner work.');
      return;
    }
    setGenerating(true);
    try {
      const exercise = await generateExercise();
      await incrementLimit('shadow_exercise');
      if (exercise) setActiveExercise(exercise);
    } catch (err) {
      Alert.alert('Couldn\'t generate exercise', 'Something went wrong reaching the depths. Please try again in a moment.');
    }
    setGenerating(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Background glow effects — Stitch */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Header — deep zone */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Animus</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <FlatList
        data={exercises}
        keyExtractor={e => e.id}
        renderItem={({ item }) => <ExerciseCard exercise={item} onTap={() => setActiveExercise(item)} />}
        onRefresh={fetchExercises}
        refreshing={loading}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={
          <>
            {/* Intro Header — Stitch */}
            <View style={styles.introSection}>
              <Text style={styles.introLabel}>ENTERING THE ABYSS</Text>
              <Text style={styles.introTitle}>The Shadow Work</Text>
              <Text style={styles.introQuote}>
                "Until you make the unconscious conscious, it will direct your life and you will call it fate."
              </Text>
            </View>

            {/* Featured Exercise Card — Stitch: deep-zone-card, full width */}
            <View style={styles.featuredCard}>
              <View style={styles.featuredHeader}>
                <MaterialIcons name="nights-stay" size={36} color={colors.tertiaryFixedDim} />
                <View style={styles.depthBadge}>
                  <Text style={styles.depthBadgeText}>DEPTH LEVEL {featured.depth_level}</Text>
                </View>
              </View>

              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <Text style={styles.featuredDesc}>{featured.prompt}</Text>

              <View style={styles.journalArea}>
                <Text style={styles.journalLabel}>JOURNAL ENTRY</Text>
                <TextInput
                  style={styles.journalInput}
                  placeholder="Begin your reflection here..."
                  placeholderTextColor={`${colors.deepTextPrimary}4D`}
                  multiline
                  textAlignVertical="top"
                  value={featuredJournal}
                  onChangeText={setFeaturedJournal}
                />
              </View>

              <View style={styles.featuredActions}>
                <Pressable
                  style={({ pressed }) => [styles.archiveBtn, pressed && { transform: [{ scale: 0.95 }] }, !featuredJournal.trim() && { opacity: 0.4 }]}
                  disabled={!featuredJournal.trim()}
                  onPress={async () => {
                    if (!user) return;
                    const { allowed } = await checkLimit('shadow_exercise');
                    if (!allowed) {
                      Alert.alert('Daily limit reached', 'You\'ve completed your shadow exercises for today. Return tomorrow to continue your inner work.');
                      return;
                    }
                    try {
                      const { error } = await supabase.from('shadow_exercises').insert({
                        user_id: user.id,
                        prompt: `${featured.title}: ${featured.prompt}`,
                        response: featuredJournal,
                      }).select().single();
                      if (error) throw error;
                      await incrementLimit('shadow_exercise');
                      Alert.alert('Session Archived', 'Your reflection has been saved.');
                      setFeaturedJournal('');
                      fetchExercises();
                    } catch (err) {
                      Alert.alert('Error', 'Could not archive session.');
                    }
                  }}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.archiveBtnGradient}
                  >
                    <Text style={styles.archiveBtnText}>ARCHIVE SESSION</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {/* Side Exercise Cards — Stitch bento grid */}
            <View style={styles.sideCardsRow}>
              <Pressable style={styles.sideCard} onPress={handleGenerate} disabled={generating}>
                <MaterialIcons name="auto-stories" size={22} color={colors.tertiaryFixedDim} />
                <Text style={styles.sideCardTitle}>Archetypal Roots</Text>
                <Text style={styles.sideCardDesc}>
                  Recall a recurring figure from your dreams. Does it represent the Sage, the Trickster, or the Orphan?
                </Text>
                <Text style={styles.sideCardLink}>
                  {generating ? 'Generating...' : 'Start Prompt'}
                </Text>
              </Pressable>

              <Pressable style={styles.sideCard} onPress={() => router.push('/(tabs)/record')}>
                <MaterialIcons name="mic" size={22} color={colors.tertiaryFixedDim} />
                <Text style={styles.sideCardTitle}>Vocalize the Void</Text>
                <Text style={styles.sideCardDesc}>
                  Speak your unspoken frustrations into the silence. Observe the tone of your voice without judgment.
                </Text>
                <Text style={styles.sideCardLink}>Begin Recording</Text>
              </Pressable>
            </View>

            {/* Previous Descents — Stitch */}
            {exercises.length > 0 && (
              <View style={styles.prevSection}>
                <Text style={styles.prevTitle}>Previous Descents</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Shadow exercises will appear here.{'\n'}Tap an exercise card to begin your inner work.
          </Text>
        }
      />
      </KeyboardAvoidingView>

      <Modal visible={!!activeExercise} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {activeExercise && (
            <ExerciseSheet
              prompt={activeExercise.prompt}
              existingResponse={activeExercise.response}
              onSave={(text) => saveResponse(activeExercise.id, text)}
              onClose={() => setActiveExercise(null)}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepBg, // #1E1048
  },
  // Background glow — Stitch
  glowTopRight: {
    position: 'absolute',
    top: '-25%',
    right: '-25%',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: 'rgba(79, 70, 229, 0.2)', // indigo-600 blur
    opacity: 0.2,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: '-25%',
    left: '-25%',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: `${colors.primaryContainer}33`,
    opacity: 0.2,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: '#E0E0FF', // indigo-100
    letterSpacing: -0.5,
  },

  list: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // Intro Section — Stitch
  introSection: {
    marginBottom: 48,
  },
  introLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.tertiaryFixedDim, // #ccbeff
    letterSpacing: 3, // tracking-[0.2em]
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  introTitle: {
    fontFamily: fonts.serif,
    fontSize: 36, // text-4xl
    color: colors.deepTextPrimary, // tertiary-fixed #e7deff
    lineHeight: 42,
    marginBottom: 24,
  },
  introQuote: {
    fontFamily: fonts.sans,
    fontSize: 18, // text-lg
    color: `${colors.deepTextPrimary}B3`, // /70
    lineHeight: 28,
    fontStyle: 'italic',
    fontWeight: '300',
  },

  // Featured Card — Stitch deep-zone-card
  featuredCard: {
    backgroundColor: colors.deepBgCard, // rgba(120,107,173,0.4)
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  depthBadge: {
    backgroundColor: 'rgba(30, 16, 72, 0.4)', // indigo-900/40
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  depthBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.deepTextPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  featuredTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.deepTextPrimary,
    marginBottom: 12,
  },
  featuredDesc: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: `${colors.deepTextPrimary}CC`, // /80
    lineHeight: 26,
    marginBottom: 24,
  },
  journalArea: {
    marginBottom: 24,
  },
  journalLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.tertiaryFixedDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  journalInput: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.deepTextPrimary,
    lineHeight: 28,
    minHeight: 120,
    padding: 0,
  },
  featuredActions: {
    alignItems: 'flex-end',
  },
  archiveBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: 'rgba(70, 72, 212, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  archiveBtnGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  archiveBtnText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Side Cards — Stitch
  sideCardsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 48,
  },
  sideCard: {
    flex: 1,
    backgroundColor: colors.deepBgCard,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  sideCardTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.deepTextPrimary,
  },
  sideCardDesc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: `${colors.deepTextPrimary}B3`, // /70
    lineHeight: 22,
  },
  sideCardLink: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.tertiaryFixedDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 'auto',
  },

  // Previous Descents
  prevSection: {
    marginTop: 32,
  },
  prevTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.deepTextPrimary,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  empty: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.deepTextSecondary,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
