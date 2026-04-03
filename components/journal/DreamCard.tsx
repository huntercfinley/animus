import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, spacing, moodColors, borderRadius, moodTints, moodBorders } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface DreamCardProps {
  dream: Dream;
}

export function DreamCard({ dream }: DreamCardProps) {
  const cardBg = moodTints[dream.mood || 'mysterious'] || colors.bgCard;
  const cardBorder = moodBorders[dream.mood || 'mysterious'] || colors.border;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => router.push({ pathname: '/dream/[id]', params: { id: dream.id } })}
    >
      <View style={styles.content}>
        {dream.image_url ? (
          <Image source={{ uri: dream.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>Painting...</Text>
          </View>
        )}

        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>{dream.title || 'Untitled Dream'}</Text>
          <Text style={styles.preview} numberOfLines={2}>{dream.journal_text}</Text>
          <View style={styles.footer}>
            <Text style={styles.date}>
              {new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            {dream.mood && <Text style={[styles.moodLabel, { color: moodColors[dream.mood] || colors.textMuted }]}>{dream.mood}</Text>}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  content: { flex: 1, flexDirection: 'row' },
  image: { width: 80, height: 100 },
  imagePlaceholder: { backgroundColor: '#E8ECFF', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  textContent: { flex: 1, padding: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
  preview: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  date: { fontSize: 11, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodLabel: { fontSize: 11, textTransform: 'capitalize' },
});
