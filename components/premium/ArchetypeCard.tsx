import { View, Text, StyleSheet } from 'react-native';
import { ARCHETYPE_MAP } from '@/constants/archetypes';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';
import type { ArchetypeSnapshot } from '@/types/database';

export function ArchetypeCard({ snapshot }: { snapshot: ArchetypeSnapshot }) {
  const sorted = Object.entries(snapshot.archetypes).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <View style={[styles.card, shadows.card]}>
      <Text style={styles.title}>Archetype Profile</Text>
      {snapshot.dominant && (
        <Text style={styles.dominant}>
          {ARCHETYPE_MAP[snapshot.dominant]?.symbol} {ARCHETYPE_MAP[snapshot.dominant]?.name || snapshot.dominant} is dominant
        </Text>
      )}
      {snapshot.rising?.length > 0 && (
        <Text style={styles.rising}>Rising: {snapshot.rising.map(r => ARCHETYPE_MAP[r]?.name || r).join(', ')}</Text>
      )}
      <View style={styles.bars}>
        {sorted.slice(0, 5).map(([key, value]) => (
          <View key={key} style={styles.barRow}>
            <View style={styles.barRowHeader}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {ARCHETYPE_MAP[key]?.symbol} {ARCHETYPE_MAP[key]?.name || key}
              </Text>
              <Text style={styles.barPct}>{Math.round((value as number) * 100)}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(value as number) * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dominant: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 4,
  },
  rising: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  bars: { gap: spacing.sm },
  barRow: {
    gap: 4,
  },
  barRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  barPct: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});
