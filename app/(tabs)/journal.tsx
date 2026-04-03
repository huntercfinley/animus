import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDreams } from '@/hooks/useDreams';
import { DreamCard } from '@/components/journal/DreamCard';
import { MonthHeader } from '@/components/journal/MonthHeader';
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
  const { dreams, loading, fetchDreams } = useDreams();
  const items = groupDreamsByMonth(dreams);

  if (!loading && dreams.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Your dream journal is empty.{'\n'}Record your first dream to begin.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Dream Journal</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.type === 'header' ? `h-${index}` : `d-${(item as any).dream.id}`}
        renderItem={({ item }) =>
          item.type === 'header'
            ? <MonthHeader month={item.month} year={item.year} count={item.count} />
            : <DreamCard dream={item.dream} />
        }
        onRefresh={fetchDreams}
        refreshing={loading}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  screenTitle: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingBottom: 100 },
  empty: { fontFamily: fonts.serif, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 100, lineHeight: 28, fontStyle: 'italic' },
});
