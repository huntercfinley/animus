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
      <Text style={styles.month}>{month}</Text>
      <Text style={styles.count}>{count} {count === 1 ? 'Entry' : 'Entries'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 16, // gap-4
    paddingHorizontal: spacing.lg,
    marginBottom: 32, // mb-8
    marginTop: spacing.lg,
  },
  month: {
    fontFamily: fonts.serif, // font-serif (not bold in Stitch)
    fontSize: 30, // text-3xl
    color: colors.textPrimary,
  },
  count: {
    fontFamily: fonts.sans,
    fontSize: 14, // text-sm
    color: colors.textSecondary,
    letterSpacing: 2, // tracking-widest
    textTransform: 'uppercase',
  },
});
