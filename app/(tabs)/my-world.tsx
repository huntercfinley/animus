import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { WorldEntryCard } from '@/components/my-world/WorldEntryCard';
import { WorldEntryForm } from '@/components/my-world/WorldEntryForm';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { callEdgeFunction } from '@/lib/ai';
import { colors, fonts } from '@/constants/theme';
import type { WorldEntry } from '@/types/database';

const SECTION_ORDER = ['person', 'place', 'theme', 'life_event'];
const SECTION_TITLES: Record<string, string> = {
  person: 'Recurring People',
  place: 'Recurring Places',
  theme: 'Inner Thoughts & Themes',
  life_event: 'Life Events',
};
const SECTION_ADD_LABELS: Record<string, string> = {
  person: 'Add another person...',
  place: 'Add another place...',
  theme: 'Add another theme...',
  life_event: 'Add another event...',
};

function groupByCategory(entries: WorldEntry[]) {
  const grouped: Record<string, WorldEntry[]> = {};
  entries.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });
  return SECTION_ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => ({ title: SECTION_TITLES[cat], category: cat, data: grouped[cat] }));
}

export default function MyWorldScreen() {
  const { entries, loading, fetchEntries, addEntry, updateEntry, deleteEntry } = useWorldEntries();
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<string>('person');
  const [suggestions, setSuggestions] = useState<{ symbol: string; count: number }[]>([]);
  const sections = groupByCategory(entries);

  useEffect(() => {
    callEdgeFunction<{ suggestions: { symbol: string; count: number }[] }>('suggest-world-entry', {}, { silent: true })
      .then(res => setSuggestions(res.suggestions))
      .catch(() => {});
  }, [entries.length]);

  const handleAddFor = (category: string) => {
    setFormCategory(category);
    setShowForm(true);
  };

  const handleAddSuggestion = async (symbol: string) => {
    await addEntry({ category: 'theme', name: symbol });
    setSuggestions(prev => prev.filter(s => s.symbol !== symbol));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />

      <SectionList
        sections={sections}
        keyExtractor={e => e.id}
        renderItem={({ item, index }) => (
          <WorldEntryCard
            entry={item}
            isEven={index % 2 === 0}
            onDelete={deleteEntry}
            onUpdate={updateEntry}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderSectionFooter={({ section }) => (
          <Pressable
            style={styles.addRowBtn}
            onPress={() => handleAddFor(section.category)}
          >
            <MaterialIcons name="add" size={16} color={colors.primary} />
            <Text style={styles.addRowText}>{SECTION_ADD_LABELS[section.category]}</Text>
          </Pressable>
        )}
        onRefresh={fetchEntries}
        refreshing={loading}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Intro — Stitch: title + subtitle, no hero image */}
            <View style={styles.introSection}>
              <Text style={styles.title}>The Foundation of Context</Text>
              <Text style={styles.subtitle}>
                Define the recurring archetypes, spaces, and memories that anchor your subconscious journey.
              </Text>
            </View>

            {/* AI Suggestions — from suggest-world-entry edge function */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsCard}>
                <View style={styles.suggestionsHeader}>
                  <MaterialIcons name="auto-awesome" size={18} color={colors.primary} />
                  <Text style={styles.suggestionsTitle}>Suggested by Animus</Text>
                </View>
                <Text style={styles.suggestionsDesc}>
                  These symbols appear frequently in your dreams but aren't in your world yet.
                </Text>
                <View style={styles.suggestionChips}>
                  {suggestions.map(s => (
                    <Pressable
                      key={s.symbol}
                      style={styles.suggestionChip}
                      onPress={() => handleAddSuggestion(s.symbol)}
                    >
                      <Text style={styles.suggestionChipText}>{s.symbol}</Text>
                      <Text style={styles.suggestionCount}>{s.count}x</Text>
                      <MaterialIcons name="add" size={14} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Add entry button — compact pill */}
            {showForm ? (
              <WorldEntryForm
                onSubmit={async (entry) => { await addEntry(entry); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            ) : null}
          </>
        }
        ListFooterComponent={
          <>
            {/* Bottom "Add to Your World" gradient pill — Stitch */}
            <View style={styles.bottomBtnWrap}>
              <Pressable
                style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => setShowForm(!showForm)}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addBtn}
                >
                  <MaterialIcons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.addBtnText}>Add to Your World</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          !showForm ? (
            <Text style={styles.empty}>
              Add the people, places, and themes that matter to you.{'\n'}This helps Animus interpret your dreams more personally.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    maxWidth: 672,
    alignSelf: 'center',
    width: '100%',
  },

  // Intro — Stitch: serif title + body subtitle
  introSection: {
    marginBottom: 48,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 36,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 28,
    maxWidth: 580,
  },

  // Section headers — Stitch: Noto Serif text-xl font-semibold, mb-4, px-2
  sectionHeader: {
    marginTop: 48,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  // "Add another" link — Stitch: mt-3 ml-3 text-primary font-medium text-sm
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    marginLeft: 12,
    marginBottom: 8,
  },
  addRowText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.primary,
  },

  // Bottom gradient button — Stitch: from-primary to-primary-container, rounded-full, px-8 py-3
  bottomBtnWrap: {
    alignItems: 'center',
    marginTop: 64,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: `${colors.primary}33`,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  addBtnText: {
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
    fontSize: 15,
  },

  // AI Suggestions banner
  suggestionsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  suggestionsTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  suggestionsDesc: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
  },
  suggestionChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  suggestionCount: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
  },

  empty: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
    paddingHorizontal: 24,
  },
});
