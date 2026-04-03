import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { WorldEntry } from '@/types/database';

const CATEGORY_LABELS: Record<string, string> = { person: 'Person', place: 'Place', theme: 'Theme', life_event: 'Life Event' };

export function WorldEntryCard({ entry, onDelete }: { entry: WorldEntry; onDelete: (id: string) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{entry.name}</Text>
        <Text style={styles.category}>{CATEGORY_LABELS[entry.category]}</Text>
      </View>
      {entry.description && <Text style={styles.desc}>{entry.description}</Text>}
      {entry.relationship && <Text style={styles.rel}>{entry.relationship}</Text>}
      {entry.ai_suggested && <Text style={styles.aiTag}>Suggested by Animus</Text>}
      <Pressable onPress={() => onDelete(entry.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary },
  category: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  desc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  rel: { fontSize: 13, color: colors.accent, fontStyle: 'italic', marginTop: 4 },
  aiTag: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-end' },
  deleteText: { color: colors.textMuted, fontSize: 12 },
});
