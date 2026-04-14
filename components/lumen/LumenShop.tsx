import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLumen, LUMEN_PACKS, type LumenPack } from '@/hooks/useLumen';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/contexts/ToastContext';
import { LumenHistory } from '@/components/lumen/LumenHistory';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PACK_ORDER: LumenPack[] = ['small', 'medium', 'large', 'mega'];

export function LumenShop({ visible, onClose }: Props) {
  const { balance, purchase } = useLumen();
  const { restore } = useSubscription();
  const toast = useToast();
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [purchasingPack, setPurchasingPack] = useState<LumenPack | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { default: Purchases, PRODUCT_CATEGORY } = await import('react-native-purchases');
        const ids = PACK_ORDER.map(p => LUMEN_PACKS[p].product_id);
        const fetched = await Purchases.getProducts(ids, PRODUCT_CATEGORY.NON_SUBSCRIPTION);
        if (cancelled) return;
        const map: Record<string, any> = {};
        for (const p of fetched) map[p.identifier] = p;
        setProducts(map);
      } catch (err) {
        if (__DEV__) console.warn('[LumenShop] getProducts failed', err);
        Sentry.captureException(err, { tags: { feature: 'lumen.shop.load' } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      toast.show('Restore is only available in the iOS app.', { tone: 'info' });
      return;
    }
    setRestoring(true);
    try {
      // Lumen packs are consumables — Apple does not restore them, and they're
      // already credited server-side at purchase time. Restore exists to refresh
      // the premium subscription entitlement (and satisfy Apple's UI requirement
      // that every IAP-enabled app expose a restore action).
      const hasPremium = await restore();
      toast.show(
        hasPremium ? 'Premium restored.' : 'No active purchases to restore.',
        { tone: hasPremium ? 'lumen' : 'info', icon: hasPremium ? 'auto-awesome' : undefined }
      );
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'lumen.shop.restore' } });
      toast.show('Could not restore purchases. Please try again.', { tone: 'error', icon: 'error-outline' });
    } finally {
      setRestoring(false);
    }
  };

  const handleBuy = async (packKey: LumenPack) => {
    if (Platform.OS === 'web') {
      toast.show('Purchases are only available in the iOS app.', { tone: 'info' });
      return;
    }
    setPurchasingPack(packKey);
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const product = products[LUMEN_PACKS[packKey].product_id];
      if (!product) throw new Error('Product not loaded');

      const result: any = await Purchases.purchaseStoreProduct(product);
      const transactionId =
        result?.transaction?.transactionIdentifier ||
        result?.productIdentifier + ':' + Date.now();

      const credit = await purchase(packKey, transactionId, { rc_product: product.identifier });
      if (credit.duplicate) {
        toast.show('Already credited — your Lumen are safe.', { tone: 'lumen', icon: 'auto-awesome' });
      } else {
        toast.showLumen(credit.lumen_added, `+${credit.lumen_added} Lumen — the work continues`);
      }
      onClose();
    } catch (err: any) {
      if (err?.userCancelled) {
        // silent — user backed out
      } else {
        Sentry.captureException(err, { tags: { feature: 'lumen.shop.purchase', pack: packKey } });
        toast.show(err?.message || 'Purchase failed. Please try again.', { tone: 'error', icon: 'error-outline' });
      }
    } finally {
      setPurchasingPack(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Lumen Packs</Text>
              <Text style={styles.subtitle}>Fuel for the inner work</Text>
            </View>
            <View style={styles.balancePill}>
              <MaterialIcons name="auto-awesome" size={14} color={colors.tertiaryFixedDim} />
              <Text style={styles.balanceText}>{balance}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {PACK_ORDER.map((packKey) => {
                const pack = LUMEN_PACKS[packKey];
                const product = products[pack.product_id];
                const displayPrice = product?.priceString || pack.price;
                const isLarge = packKey === 'large';
                const isPurchasing = purchasingPack === packKey;
                const disabled = !product || purchasingPack !== null;

                return (
                  <Pressable
                    key={packKey}
                    onPress={() => handleBuy(packKey)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.packCard,
                      isLarge && styles.packCardFeatured,
                      pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      disabled && !isPurchasing && { opacity: 0.5 },
                    ]}
                  >
                    {isLarge && (
                      <LinearGradient
                        colors={[`${colors.primary}40`, `${colors.primaryContainer}30`]}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={styles.packLeft}>
                      <Text style={styles.packName}>{pack.name}</Text>
                      <Text style={styles.packTagline}>{pack.tagline}</Text>
                      <View style={styles.packAmountRow}>
                        <MaterialIcons name="auto-awesome" size={16} color={colors.tertiaryFixedDim} />
                        <Text style={styles.packAmount}>{pack.amount} Lumen</Text>
                      </View>
                    </View>
                    <View style={styles.packRight}>
                      {isPurchasing ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Text style={styles.packPrice}>{displayPrice}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              <Text style={styles.disclaimer}>
                One-time purchases. Lumen never expire. Free Lumen also earned by tending the shadow.
              </Text>

              <Pressable style={styles.ledgerLink} onPress={() => setHistoryOpen(true)}>
                <MaterialIcons name="receipt-long" size={14} color={colors.textSecondary} />
                <Text style={styles.ledgerLinkText}>View ledger</Text>
              </Pressable>
            </ScrollView>
          )}

          <View style={styles.footerRow}>
            <Pressable
              style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }, restoring && { opacity: 0.5 }]}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator color={colors.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <LumenHistory visible={historyOpen} onClose={() => setHistoryOpen(false)} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 36, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.deepBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  balanceText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.deepTextPrimary,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  packCardFeatured: {
    borderColor: `${colors.primary}55`,
  },
  packLeft: {
    flex: 1,
  },
  packName: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  packTagline: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  packAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packAmount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.tertiaryFixedDim,
  },
  packRight: {
    paddingLeft: spacing.md,
    minWidth: 70,
    alignItems: 'flex-end',
  },
  packPrice: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  disclaimer: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  ledgerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  ledgerLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  restoreBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  restoreText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  closeBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
