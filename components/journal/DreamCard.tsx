import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, spacing, borderRadius, moodColors, moodTints } from '@/constants/theme';
import type { Dream } from '@/types/database';

// Accent stripe colors per mood — mapped from Stitch palette
const accentColors: Record<string, string> = {
  peaceful: colors.secondaryContainer,       // bg-secondary-container
  anxious: colors.error,
  surreal: `${colors.tertiary}66`,           // bg-tertiary/40
  dark: colors.outlineVariant,               // bg-outline-variant
  joyful: colors.secondaryContainer,
  mysterious: `${colors.primary}4D`,         // bg-primary/30
  chaotic: colors.tertiaryContainer,         // bg-tertiary-container
  melancholic: `${colors.secondary}33`,      // bg-secondary/20
};

interface DreamCardProps {
  dream: Dream;
}

export function DreamCard({ dream }: DreamCardProps) {
  const mood = dream.mood || 'mysterious';
  const accentColor = accentColors[mood] || `${colors.primary}4D`;
  const dateStr = new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hasImage = !!dream.image_url;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/dream/[id]', params: { id: dream.id } })}
    >
      {/* Dream image */}
      {hasImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: dream.image_url! }} style={styles.image} contentFit="cover" />
          <View style={styles.imageGradient} />
        </View>
      )}

      {/* Content area with mood accent stripe */}
      <View style={styles.content}>
        {/* Mood accent stripe */}
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

        {/* Date + type badge */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {dateStr.toUpperCase()}
            {dream.lucidity_level != null && dream.lucidity_level > 0 ? ' • Lucid' : ''}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {dream.title || 'Untitled Dream'}
        </Text>

        {/* Preview text */}
        <Text style={styles.preview} numberOfLines={3}>
          {dream.journal_text}
        </Text>

        {/* Tags — populated when symbols are joined */}
        {dream.themes && dream.themes.length > 0 && (
          <View style={styles.tags}>
            {dream.themes.slice(0, 3).map((tag: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24, // rounded-2xl
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    // dream-shadow from Stitch: 0 24px 40px -4px rgba(81, 79, 129, 0.06)
    shadowColor: 'rgba(81, 79, 129, 1)',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 4,
  },
  imageContainer: {
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    // Approximation of from-black/20 to-transparent gradient overlay
  },
  content: {
    padding: 24, // p-6
    position: 'relative',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 24, // matches content padding
    bottom: 24,
    width: 4, // w-1 = 4px
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  dateRow: {
    marginBottom: 12,
  },
  dateText: {
    fontFamily: fonts.sans,
    fontSize: 10, // text-[10px]
    letterSpacing: 2, // tracking-[0.2em] ≈ 2px at 10px
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.serif, // font-serif (not bold per Stitch)
    fontSize: 22, // between text-xl and text-2xl for mobile
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 28, // leading-tight
  },
  preview: {
    fontFamily: fonts.sans,
    fontSize: 14, // text-sm
    color: colors.textSecondary,
    lineHeight: 22, // leading-relaxed
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    gap: 8, // gap-2
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 4, // py-1
    borderRadius: 999, // rounded-full
    backgroundColor: colors.surfaceContainer, // bg-surface-container
  },
  tagText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11, // text-[11px]
    color: colors.textSecondary,
  },
});
