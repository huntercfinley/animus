import { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDreams } from '@/hooks/useDreams';
import { DreamCard } from '@/components/journal/DreamCard';
import { MonthHeader } from '@/components/journal/MonthHeader';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream } from '@/types/database';

type ListItem = { type: 'header'; month: string; year: number; count: number } | { type: 'dream'; dream: Dream };

function groupDreamsByMonth(dreams: Dream[]): ListItem[] {
  const items: ListItem[] = [];
  let currentKey = '';

  for (const dream of dreams) {
    const date = new Date(dream.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key !== currentKey) {
      currentKey = key;
      const monthDreams = dreams.filter(d => {
        const dd = new Date(d.created_at);
        return dd.getFullYear() === date.getFullYear() && dd.getMonth() === date.getMonth();
      });
      items.push({
        type: 'header',
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        year: date.getFullYear(),
        count: monthDreams.length,
      });
    }
    items.push({ type: 'dream', dream });
  }

  return items;
}

export default function JournalScreen() {
  const { dreams, loading, fetchDreams, softDeleteDream } = useDreams();
  const [search, setSearch] = useState('');

  const handleLongPress = (dream: Dream) => {
    Alert.alert(
      dream.title || 'Untitled Dream',
      'Move this dream to the trash? You can restore it later from Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteDream(dream.id);
            } catch {
              Alert.alert('Error', 'Could not move dream to trash.');
            }
          },
        },
      ]
    );
  };

  const filtered = search.trim()
    ? dreams.filter(d =>
        (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.journal_text || '').toLowerCase().includes(search.toLowerCase())
      )
    : dreams;

  const items = groupDreamsByMonth(filtered);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />

      {/* Search Bar — Stitch: bg-surface-container-high rounded-2xl px-6 py-4 */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search the subconscious..."
            placeholderTextColor={`${colors.textSecondary}99`}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </View>

      {!loading && dreams.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>
            Your dream journal is empty.{'\n'}Record your first dream to begin.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `h-${index}` : `d-${(item as any).dream.id}`
          }
          renderItem={({ item }) =>
            item.type === 'header'
              ? <MonthHeader month={item.month} year={item.year} count={item.count} />
              : <DreamCard dream={item.dream} onLongPress={() => handleLongPress(item.dream)} />
          }
          onRefresh={fetchDreams}
          refreshing={loading}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 48, // mb-12
  },
  searchBar: {
    backgroundColor: colors.surfaceContainerHigh, // bg-surface-container-high
    borderRadius: 24, // rounded-2xl (1.5rem = 24)
    paddingHorizontal: 24, // px-6
    paddingVertical: 16, // py-4
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  list: {
    paddingBottom: 120,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  empty: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
    fontStyle: 'italic',
  },
});
