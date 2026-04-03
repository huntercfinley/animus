import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const { isPremium, packages, purchase } = useSubscription();

  if (isPremium) return <>{children}</>;

  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.desc}>{feature} is available with Animus Premium.</Text>
      {monthlyPkg && (
        <Pressable style={styles.upgradeBtn} onPress={() => purchase(monthlyPkg)}>
          <Text style={styles.upgradeText}>Upgrade — {monthlyPkg.product.priceString}/month</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, margin: spacing.lg, borderWidth: 1, borderColor: colors.accent },
  title: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.sm },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  upgradeBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingHorizontal: 32, paddingVertical: 14 },
  upgradeText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
