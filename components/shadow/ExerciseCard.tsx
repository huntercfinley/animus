import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export function ExerciseCard({ exercise, onTap }: { exercise: ShadowExercise; onTap: () => void }) {
  const hasResponse = !!exercise.response;
  return (
    <Pressable style={[styles.card, hasResponse && styles.cardCompleted]} onPress={onTap}>
      <Text style={styles.prompt} numberOfLines={3}>{exercise.prompt}</Text>
      {hasResponse && <Text style={styles.completed}>Explored</Text>}
      <Text style={styles.date}>{new Date(exercise.created_at).toLocaleDateString()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.deepBgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.deepBorder },
  cardCompleted: { borderColor: colors.deepAccent },
  prompt: { fontFamily: fonts.serif, fontSize: 15, color: colors.deepTextPrimary, lineHeight: 22 },
  completed: { color: colors.deepAccent, fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
  date: { color: colors.deepTextSecondary, fontSize: 11, marginTop: spacing.xs },
});
