import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Keyboard, Alert, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDreams } from '@/hooks/useDreams';
import { DreamCard } from '@/components/journal/DreamCard';
import { MonthHeader } from '@/components/journal/MonthHeader';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts, spacing } from '@/constants/theme';
import { formatDreamDate } from '@/lib/formatters';
import type { Dream } from '@/types/database';

type ListItem = { type: 'header'; month: string; year: number; count: number } | { type: 'dream'; dream: Dream };

function buildListItems(dreams: Dream[]): ListItem[] {
  // Single O(n) pass: count per-month and emit headers inline. The earlier
  // version re-filtered the full array at each month boundary (O(n^2)).
  const counts = new Map<string, number>();
  const meta = new Map<string, { month: string; year: number }>();
  for (const d of dreams) {
    const date = new Date(d.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!meta.has(key)) {
      meta.set(key, { month: formatDreamDate(d.created_at, 'month-only'), year: date.getFullYear() });
    }
  }

  const items: ListItem[] = [];
  let currentKey = '';
  for (const dream of dreams) {
    const date = new Date(dream.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key !== currentKey) {
      currentKey = key;
      const m = meta.get(key)!;
      items.push({ type: 'header', month: m.month, year: m.year, count: counts.get(key) ?? 0 });
    }
    items.push({ type: 'dream', dream });
  }
  return items;
}

export default function JournalScreen() {
  const { dreams, loading, fetchDreams, softDeleteDream } = useDreams();
  const [search, setSearch] = useState('');

  const handleLongPress = useCallback((dream: Dream) => {
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
  }, [softDeleteDream]);

  const trimmedSearch = search.trim();
  const items = useMemo(() => {
    const filtered = trimmedSearch
      ? dreams.filter(d => {
          const q = trimmedSearch.toLowerCase();
          return (d.title || '').toLowerCase().includes(q) || (d.journal_text || '').toLowerCase().includes(q);
        })
      : dreams;
    return buildListItems(filtered);
  }, [dreams, trimmedSearch]);

  const renderItem = useCallback<ListRenderItem<ListItem>>(({ item }) =>
    item.type === 'header'
      ? <MonthHeader month={item.month} year={item.year} count={item.count} />
      : <DreamCard dream={item.dream} onLongPress={() => handleLongPress(item.dream)} />,
    [handleLongPress]
  );

  const keyExtractor = useCallback((item: ListItem, index: number) =>
    item.type === 'header' ? `h-${index}` : `d-${item.dream.id}`,
    []
  );

  const showEmptyJournal = !loading && dreams.length === 0;
  const showNoResults = !loading && dreams.length > 0 && items.length === 0 && trimmedSearch.length > 0;

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

      {showEmptyJournal ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>
            Your dream journal is empty.{'\n'}Record your first dream to begin.
          </Text>
        </View>
      ) : showNoResults ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>
            No dreams match &ldquo;{trimmedSearch}&rdquo;.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
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
