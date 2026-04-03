import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { WorldEntryCard } from '@/components/my-world/WorldEntryCard';
import { WorldEntryForm } from '@/components/my-world/WorldEntryForm';
import { colors, fonts, spacing } from '@/constants/theme';

export default function MyWorldScreen() {
  const { entries, loading, fetchEntries, addEntry, deleteEntry } = useWorldEntries();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My World</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addText}>+ Add</Text>
        </Pressable>
      </View>

      {showForm && (
        <WorldEntryForm
          onSubmit={async (entry) => { await addEntry(entry); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        renderItem={({ item }) => <WorldEntryCard entry={item} onDelete={deleteEntry} />}
        onRefresh={fetchEntries}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Add the people, places, and themes that matter to you.{'\n'}This helps Animus interpret your dreams more personally.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary },
  addBtn: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  addText: { color: colors.accent, fontWeight: '500' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 60, lineHeight: 24, fontStyle: 'italic', paddingHorizontal: spacing.lg },
});
