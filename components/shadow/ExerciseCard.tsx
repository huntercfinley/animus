import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ShadowExercise } from '@/types/database';

export function ExerciseCard({ exercise, onTap }: { exercise: ShadowExercise; onTap: () => void }) {
  const hasResponse = !!exercise.response;
  return (
    <Pressable style={styles.card} onPress={onTap}>
      <Text style={styles.prompt} numberOfLines={3}>{exercise.prompt}</Text>
      <View style={styles.footer}>
        {hasResponse && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Explored</Text>
          </View>
        )}
        <Text style={styles.date}>{new Date(exercise.created_at).toLocaleDateString()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.deepBgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  prompt: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.deepTextPrimary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(196, 181, 253, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    color: colors.deepAccent,
    fontSize: 11,
  },
  date: {
    fontFamily: fonts.sans,
    color: colors.deepTextSecondary,
    fontSize: 11,
  },
});
