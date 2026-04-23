import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useDreams } from '@/hooks/useDreams';
import { useAuth } from '@/hooks/useAuth';
import { InsufficientLumenError } from '@/hooks/useLumen';
import { useLumenGate } from '@/hooks/useLumenGate';
import { supabase } from '@/lib/supabase';
import { callEdgeFunction } from '@/lib/ai';
import { HeatmapCalendar } from '@/components/dream-map/HeatmapCalendar';
import { DreamWeb } from '@/components/dream-map/DreamWeb';
import { LumenGateSheets } from '@/components/lumen/LumenGateSheets';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';
import { ARCHETYPES } from '@/constants/archetypes';
import { formatDreamDate } from '@/lib/formatters';
import type { DreamSymbol, PatternReport, DreamConnection } from '@/types/database';

type ViewMode = 'web' | 'heatmap';

export default function DreamMapScreen() {
  const { dreams, loading } = useDreams();
  const { profile, user } = useAuth();
  const [view, setView] = useState<ViewMode>('web');
  const [symbols, setSymbols] = useState<DreamSymbol[]>([]);

  const [latestReport, setLatestReport] = useState<PatternReport | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const lumenGate = useLumenGate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [symbolsRes, reportRes] = await Promise.all([
        supabase.from('dream_symbols').select('*').eq('user_id', user.id),
        supabase
          .from('pattern_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setSymbols(symbolsRes.data || []);
      if (reportRes.data?.[0]) setLatestReport(reportRes.data[0]);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const generateInsights = useCallback(async (periodType: 'weekly' | 'monthly') => {
    setInsightsLoading(true);
    try {
      // dream-insights deducts Lumen server-side (was client-side until the
      // migration 20 lockdown — a tampered client could bypass the charge).
      const report = await callEdgeFunction<PatternReport>('dream-insights', { period_type: periodType });
      setLatestReport(report);
    } catch (err) {
      if (err instanceof InsufficientLumenError) {
        lumenGate.openInsufficient(err.current, err.required);
      }
    } finally {
      setInsightsLoading(false);
    }
  }, [lumenGate]);

  const [selectedDreams, setSelectedDreams] = useState<string[]>([]);
  const [connectionResult, setConnectionResult] = useState<DreamConnection | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);

  const toggleDreamSelect = (dreamId: string) => {
    setSelectedDreams(prev => {
      if (prev.includes(dreamId)) return prev.filter(id => id !== dreamId);
      if (prev.length >= 2) return [prev[1], dreamId];
      return [...prev, dreamId];
    });
  };

  const connectDreams = useCallback(async () => {
    if (selectedDreams.length !== 2) return;
    setConnectionLoading(true);
    try {
      // dream-connection deducts Lumen server-side.
      const result = await callEdgeFunction<DreamConnection>('dream-connection', {
        dream_a_id: selectedDreams[0],
        dream_b_id: selectedDreams[1],
      });
      setConnectionResult(result);
      setSelectedDreams([]);
    } catch (err) {
      if (err instanceof InsufficientLumenError) {
        lumenGate.openInsufficient(err.current, err.required);
      }
    } finally {
      setConnectionLoading(false);
    }
  }, [selectedDreams, lumenGate]);

  // Normalize symbol.archetype (canonical id like "shadow" OR display name
  // like "Shadow" / "Wise Old Man/Woman") to the canonical id so counts
  // aggregate correctly. Memoized — previously recomputed on every render.
  const { archetypeRows, totalArchetypeHits } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of symbols) {
      if (!s.archetype) continue;
      const lower = s.archetype.trim().toLowerCase();
      const noPrefix = lower.replace(/^the\s+/, '');
      const match = ARCHETYPES.find(a =>
        a.id === lower ||
        a.id === noPrefix ||
        a.name.toLowerCase() === lower ||
        a.name.toLowerCase().replace(/^the\s+/, '') === noPrefix ||
        // "Wise Old Man" → match "Wise Old Man/Woman" prefix
        a.name.toLowerCase().replace(/^the\s+/, '').startsWith(noPrefix.split('/')[0])
      );
      if (match) counts[match.id] = (counts[match.id] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const rows = ARCHETYPES
      .map(a => ({
        id: a.id,
        name: a.name,
        symbol: a.symbol,
        count: counts[a.id] || 0,
        pct: total > 0 ? Math.round(((counts[a.id] || 0) / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return { archetypeRows: rows, totalArchetypeHits: total };
  }, [symbols]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* View Toggle — Stitch: bg-surface-container-high p-1.5 rounded-full */}
        <View style={styles.toggleWrap}>
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, view === 'web' && styles.toggleActive]}
              onPress={() => setView('web')}
            >
              <Text style={[styles.toggleText, view === 'web' && styles.toggleTextActive]}>Dream Web</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, view === 'heatmap' && styles.toggleActive]}
              onPress={() => setView('heatmap')}
            >
              <Text style={[styles.toggleText, view === 'heatmap' && styles.toggleTextActive]}>Heatmap</Text>
            </Pressable>
          </View>
        </View>

        {/* Section Title — Stitch: serif text-4xl font-bold tracking-tight */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>The Constellation</Text>
          <Text style={styles.subtitle}>
            Mapping your subconscious archetypes through the collective web of the Animus.
          </Text>
        </View>

        {/* Visualization — Stitch: aspect-[4/5] rounded-xxl bg-surface-container-low */}
        <View style={styles.vizContainer}>
          {view === 'heatmap' ? (
            <HeatmapCalendar dreams={dreams} />
          ) : (
            <DreamWeb dreams={dreams} symbols={symbols} />
          )}
        </View>

        {/* Metrics Section — Stitch bento grid */}
        <View style={styles.metricsRow}>
          {/* Archetypal Density — vertical list of horizontal bars */}
          <View style={styles.densityCard}>
            <Text style={styles.densityTitle}>Archetypal Density</Text>
            {totalArchetypeHits === 0 && (
              <Text style={styles.densityEmpty}>
                Record dreams to see your archetypal pattern emerge.
              </Text>
            )}
            <View style={styles.densityRows}>
              {archetypeRows.map(row => (
                <View key={row.id} style={styles.densityRow}>
                  <View style={styles.densityRowHeader}>
                    <Text style={styles.densityRowLabel} numberOfLines={1}>
                      {row.symbol} {row.name}
                    </Text>
                    <Text style={styles.densityRowPct}>{row.pct}%</Text>
                  </View>
                  <View style={styles.densityBarTrack}>
                    <View
                      style={[
                        styles.densityBarFill,
                        { width: `${row.pct}%`, opacity: row.count > 0 ? 0.2 + Math.min(row.pct / 100, 1) * 0.8 : 0.12 },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Collective Alignment Card — Stitch: bg-primary, big percentage */}
          <View style={styles.alignmentCard}>
            <View style={styles.alignmentGlow} />
            <MaterialIcons name="public" size={36} color="#ffffff" style={{ marginBottom: 16 }} />
            <Text style={styles.alignmentPct}>
              {dreams.length > 0 ? `${Math.min(Math.round((symbols.length / Math.max(dreams.length, 1)) * 20), 100)}%` : '—'}
            </Text>
            <Text style={styles.alignmentLabel}>Collective Unconscious Alignment</Text>
            <Pressable style={styles.alignmentBtn} onPress={() => Alert.alert('Coming Soon', 'Global dream nodes will be available in a future update.')}>
              <Text style={styles.alignmentBtnText}>Explore Global Nodes</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Insights Section — dream-insights edge function */}
        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Dream Insights</Text>
          <Text style={styles.insightsDesc}>
            AI-generated analyst reports from your recent dreams.
          </Text>
          <View style={styles.insightsBtns}>
            <Pressable
              style={[styles.insightsBtn, insightsLoading && { opacity: 0.5 }]}
              onPress={() => generateInsights('weekly')}
              disabled={insightsLoading}
            >
              <MaterialIcons name="date-range" size={16} color={colors.primary} />
              <Text style={styles.insightsBtnText}>
                {insightsLoading ? 'Generating...' : 'Weekly Report'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.insightsBtn, insightsLoading && { opacity: 0.5 }]}
              onPress={() => generateInsights('monthly')}
              disabled={insightsLoading}
            >
              <MaterialIcons name="calendar-month" size={16} color={colors.primary} />
              <Text style={styles.insightsBtnText}>
                {insightsLoading ? 'Generating...' : 'Monthly Report'}
              </Text>
            </Pressable>
          </View>
          {latestReport && (
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <MaterialIcons name="psychology" size={18} color={colors.primary} />
                <Text style={styles.reportPeriod}>
                  {latestReport.period_type === 'weekly' ? 'Weekly' : 'Monthly'} — {latestReport.period_start} to {latestReport.period_end}
                </Text>
              </View>
              <Text style={styles.reportText}>{latestReport.report}</Text>
            </View>
          )}
        </View>

        {/* Isolated Nodes + Dream Connection */}
        {dreams.length > 0 && (
          <View style={styles.nodesSection}>
            <Text style={styles.nodesTitle}>Isolated Nodes</Text>
            <Text style={styles.nodesHint}>
              Select two dreams to discover hidden connections.
            </Text>
            {dreams.slice(0, 6).map(dream => {
              const isSelected = selectedDreams.includes(dream.id);
              return (
                <Pressable
                  key={dream.id}
                  style={[styles.nodeRow, isSelected && styles.nodeRowSelected]}
                  onPress={() => toggleDreamSelect(dream.id)}
                >
                  <View style={styles.nodeLeft}>
                    <View style={[styles.nodeIcon, isSelected && styles.nodeIconSelected]}>
                      <MaterialIcons
                        name={isSelected ? 'check-circle' : 'nights-stay'}
                        size={22}
                        color={isSelected ? '#ffffff' : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nodeName}>{dream.title ?? 'Untitled Dream'}</Text>
                      <Text style={styles.nodeMeta}>
                        {formatDreamDate(dream.created_at, 'long')}
                        {dream.mood ? ` • ${dream.mood}` : ''}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.outlineVariant} />
                </Pressable>
              );
            })}

            {/* Connect button */}
            {selectedDreams.length === 2 && (
              <Pressable
                style={[styles.connectBtn, connectionLoading && { opacity: 0.5 }]}
                onPress={connectDreams}
                disabled={connectionLoading}
              >
                <MaterialIcons name="link" size={18} color={colors.primary} />
                <Text style={styles.connectBtnText}>
                  {connectionLoading ? 'Analyzing...' : 'Connect These Dreams'}
                </Text>
              </Pressable>
            )}

            {/* Connection result */}
            {connectionResult && (
              <View style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <MaterialIcons name="hub" size={18} color={colors.primary} />
                  <Text style={styles.connectionLabel}>Dream Connection</Text>
                </View>
                <Text style={styles.connectionText}>{connectionResult.analysis}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <LumenGateSheets gate={lumenGate} action="connection" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Toggle — Stitch
  toggleWrap: {
    alignItems: 'center',
    marginBottom: 48, // mb-12
  },
  toggle: {
    backgroundColor: colors.surfaceContainerHigh,
    padding: 6, // p-1.5
    borderRadius: 999,
    flexDirection: 'row',
  },
  toggleBtn: {
    paddingHorizontal: 32, // px-8
    paddingVertical: 10, // py-2.5
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.card,
  },
  toggleText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    fontFamily: fonts.sansSemiBold,
    color: colors.primary,
  },

  // Header
  headerSection: {
    paddingHorizontal: 24,
    marginBottom: 40, // mb-10
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 36, // text-4xl
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 18, // text-lg
    color: colors.textSecondary,
    lineHeight: 28, // leading-relaxed
    maxWidth: 400,
  },

  // Visualization
  vizContainer: {
    marginHorizontal: 24,
    aspectRatio: 4 / 5,
    borderRadius: 24, // rounded-xxl
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
    marginBottom: 48,
  },

  // Metrics
  metricsRow: {
    paddingHorizontal: 24,
    gap: 24,
    marginBottom: 64,
  },
  densityCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 32,
  },
  densityTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  densityEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  densityRows: {
    gap: spacing.md,
  },
  densityRow: {
    gap: 6,
  },
  densityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  densityRowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  densityRowPct: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  densityBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  densityBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  // Alignment card
  alignmentCard: {
    backgroundColor: colors.primary,
    padding: 32,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  alignmentGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  alignmentPct: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: '#ffffff',
    marginBottom: 4,
  },
  alignmentLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  alignmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  alignmentBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: '#ffffff',
  },

  // Insights
  insightsSection: {
    paddingHorizontal: 24,
    marginBottom: 64,
  },
  insightsTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  insightsDesc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  insightsBtns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  insightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
  },
  insightsBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.primary,
  },
  reportCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    shadowColor: 'rgba(81, 79, 129, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reportPeriod: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reportText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Isolated Nodes
  nodesSection: {
    paddingHorizontal: 24,
  },
  nodesTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  nodesHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 18,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flex: 1,
  },
  nodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeName: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  nodeMeta: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  nodeRowSelected: {
    backgroundColor: `${colors.primary}0D`,
    borderRadius: 12,
  },
  nodeIconSelected: {
    backgroundColor: colors.primary,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  connectBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  connectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: 'rgba(81, 79, 129, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  connectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  connectionText: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
