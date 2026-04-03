import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useDreams } from '@/hooks/useDreams';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { HeatmapCalendar } from '@/components/dream-map/HeatmapCalendar';
import { DreamWeb } from '@/components/dream-map/DreamWeb';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { DreamSymbol } from '@/types/database';

type ViewMode = 'calendar' | 'web';

export default function DreamMapScreen() {
  const { dreams, loading } = useDreams();
  const { profile, user } = useAuth();
  const [view, setView] = useState<ViewMode>('calendar');
  const [symbols, setSymbols] = useState<DreamSymbol[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('dream_symbols').select('*').eq('user_id', user.id)
      .then(({ data }) => setSymbols(data || []));
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dream Map</Text>

      <View style={styles.toggle}>
        <Pressable style={[styles.toggleBtn, view === 'calendar' && styles.toggleActive]} onPress={() => setView('calendar')}>
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, view === 'web' && styles.toggleActive]} onPress={() => setView('web')}>
          <Text style={[styles.toggleText, view === 'web' && styles.toggleTextActive]}>Dream Web</Text>
        </Pressable>
      </View>

      {view === 'calendar' ? (
        <HeatmapCalendar
          dreams={dreams}
          streakCurrent={profile?.streak_current || 0}
          streakLongest={profile?.streak_longest || 0}
        />
      ) : (
        <DreamWeb dreams={dreams} symbols={symbols} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toggle: { flexDirection: 'row', marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.sm, padding: 2 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm - 2, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.accent },
  toggleText: { color: colors.textMuted, fontSize: 14 },
  toggleTextActive: { color: '#fff', fontWeight: '500' },
});
