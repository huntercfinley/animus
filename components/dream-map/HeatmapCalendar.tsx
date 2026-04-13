import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface HeatmapCalendarProps {
  dreams: Dream[];
}

export function HeatmapCalendar({ dreams }: HeatmapCalendarProps) {
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    const dreamsByDate: Record<string, Dream[]> = {};
    for (const d of dreams) {
      const key = new Date(d.created_at).toISOString().split('T')[0];
      if (!dreamsByDate[key]) dreamsByDate[key] = [];
      dreamsByDate[key].push(d);
    }

    const weeks: { date: Date; count: number; dreams: Dream[] }[][] = [];
    let currentWeek: { date: Date; count: number; dreams: Dream[] }[] = [];
    const labels: { text: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    cursor.setDate(cursor.getDate() - cursor.getDay());

    let weekIndex = 0;
    while (cursor <= today || currentWeek.length > 0) {
      const key = cursor.toISOString().split('T')[0];
      const dayDreams = dreamsByDate[key] || [];
      currentWeek.push({ date: new Date(cursor), count: dayDreams.length, dreams: dayDreams });

      if (cursor.getMonth() !== lastMonth) {
        labels.push({ text: cursor.toLocaleDateString('en-US', { month: 'short' }), weekIndex });
        lastMonth = cursor.getMonth();
      }

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      cursor.setDate(cursor.getDate() + 1);
      if (cursor > today && currentWeek.length === 0) break;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { grid: weeks, monthLabels: labels };
  }, [dreams]);

  const getColor = (count: number) => {
    if (count === 0) return colors.bgCard;
    if (count === 1) return colors.accentDim;
    if (count === 2) return colors.accent;
    return '#b88aee';
  };

  return (
    <View>
      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>{dreams.length}</Text>
        <Text style={styles.totalLabel}>{dreams.length === 1 ? 'Dream mapped' : 'Dreams mapped'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.monthRow}>
            {monthLabels.map((label, i) => (
              <Text key={i} style={[styles.monthLabel, { left: label.weekIndex * 14 }]}>{label.text}</Text>
            ))}
          </View>

          {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
            <View key={dayIndex} style={styles.gridRow}>
              {grid.map((week, weekIndex) => {
                const day = week[dayIndex];
                if (!day) return <View key={weekIndex} style={styles.cell} />;
                return (
                  <Pressable
                    key={weekIndex}
                    style={[styles.cell, { backgroundColor: getColor(day.count) }]}
                    onPress={() => {
                      if (day.dreams.length === 1) {
                        router.push({ pathname: '/dream/[id]', params: { id: day.dreams[0].id } });
                      }
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  totalRow: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  totalValue: { fontFamily: fonts.serifBold, fontSize: 36, color: colors.textPrimary, letterSpacing: -0.5 },
  totalLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  monthRow: { height: 20, position: 'relative', marginLeft: 4 },
  monthLabel: { position: 'absolute', fontSize: 10, color: colors.textMuted },
  gridRow: { flexDirection: 'row', gap: 2 },
  cell: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.bgCard },
});
