import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const { isPremium, packages, purchase } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);

  if (isPremium) return <>{children}</>;

  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');

  const handleUpgrade = async () => {
    if (!monthlyPkg) return;
    setPurchasing(true);
    const result = await purchase(monthlyPkg);
    setPurchasing(false);
    if (result.status === 'error') {
      Alert.alert('Purchase failed', result.message);
    }
  };

  return (
    <View style={[styles.container, shadows.cardLifted]}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.desc}>{feature} is available with Animus Premium.</Text>
      {monthlyPkg && (
        <Pressable
          style={[styles.upgradeBtn, purchasing && { opacity: 0.5 }]}
          onPress={handleUpgrade}
          disabled={purchasing}
        >
          <Text style={styles.upgradeText}>
            {purchasing ? 'Processing...' : `Upgrade — ${monthlyPkg.product.priceString}/month`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    margin: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  upgradeText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 16,
  },
});
