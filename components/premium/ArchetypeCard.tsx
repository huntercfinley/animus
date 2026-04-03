import { View, Text, StyleSheet } from 'react-native';
import { ARCHETYPE_MAP } from '@/constants/archetypes';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { ArchetypeSnapshot } from '@/types/database';

export function ArchetypeCard({ snapshot }: { snapshot: ArchetypeSnapshot }) {
  const sorted = Object.entries(snapshot.archetypes).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <View style={styles.card}>
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
            <Text style={styles.barLabel}>{ARCHETYPE_MAP[key]?.symbol} {ARCHETYPE_MAP[key]?.name || key}</Text>
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
  card: { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.accent },
  title: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.sm },
  dominant: { fontFamily: fonts.serif, fontSize: 15, color: colors.accent, marginBottom: 4 },
  rising: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: spacing.md },
  bars: { gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 120, fontSize: 12, color: colors.textSecondary },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.bgSurface, borderRadius: 3 },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
});
