import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/constants/theme';

interface MonthHeaderProps {
  month: string;
  year: number;
  count: number;
}

export function MonthHeader({ month, year, count }: MonthHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{month} {year}</Text>
      <Text style={styles.count}>{count} {count === 1 ? 'dream' : 'dreams'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  text: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  count: { fontSize: 13, color: colors.textMuted },
});
