import { View, Text, FlatList, Pressable, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useShadowExercises } from '@/hooks/useShadowExercises';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { ExerciseCard } from '@/components/shadow/ExerciseCard';
import { ExerciseSheet } from '@/components/shadow/ExerciseSheet';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export default function ShadowWorkScreen() {
  const { exercises, loading, fetchExercises, generateExercise, saveResponse } = useShadowExercises();
  const { checkLimit, incrementLimit } = useUsageLimits();
  const [activeExercise, setActiveExercise] = useState<ShadowExercise | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const { allowed, remaining } = await checkLimit('shadow_exercise');
    if (!allowed) {
      Alert.alert('Daily limit reached', 'You\'ve completed your shadow exercises for today. Return tomorrow to continue your inner work.');
      return;
    }
    setGenerating(true);
    try {
      await generateExercise();
      await incrementLimit('shadow_exercise');
    } catch (err) { console.warn(err); }
    setGenerating(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Shadow Work</Text>
      <Text style={styles.subtitle}>Dive beneath the surface</Text>

      <Pressable style={[styles.generateBtn, generating && { opacity: 0.6 }]} onPress={handleGenerate} disabled={generating}>
        <Text style={styles.generateText}>{generating ? 'Surfacing an exercise...' : 'New exercise'}</Text>
      </Pressable>

      <FlatList
        data={exercises}
        keyExtractor={e => e.id}
        renderItem={({ item }) => <ExerciseCard exercise={item} onTap={() => setActiveExercise(item)} />}
        onRefresh={fetchExercises}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Shadow exercises will appear here.{'\n'}Tap "New exercise" to begin.</Text>}
      />

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
  container: { flex: 1, backgroundColor: colors.deepBg },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.deepTextPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  subtitle: { fontFamily: fonts.serif, fontSize: 14, color: colors.deepAccent, fontStyle: 'italic', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  generateBtn: { backgroundColor: colors.deepBgCard, borderRadius: 12, paddingVertical: 14, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.deepBorder },
  generateText: { color: colors.deepAccent, textAlign: 'center', fontWeight: '500' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 16, color: colors.deepTextSecondary, textAlign: 'center', marginTop: 60, lineHeight: 24, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
});
