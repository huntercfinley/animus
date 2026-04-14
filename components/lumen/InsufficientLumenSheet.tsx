import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useLumen, type LumenAction } from '@/hooks/useLumen';
import { showRewardedAd, rewardedAdsConfigured } from '@/lib/ads';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface Props {
  visible: boolean;
  current: number;
  required: number;
  action?: LumenAction;
  onClose: () => void;
  // Caller should retry the action with use_ad_credit=true
  onAdCredited?: () => void;
  // Caller should open the LumenShop sheet
  onBuyLumen?: () => void;
}

export function InsufficientLumenSheet({ visible, current, required, action, onClose, onAdCredited, onBuyLumen }: Props) {
  const [watchingAd, setWatchingAd] = useState(false);
  const { grantAdCredit } = useLumen();
  const toast = useToast();

  const short = required - current;
  const adAllowed = action === 'go_deeper' && rewardedAdsConfigured;

  const goShadow = () => {
    onClose();
    router.push('/(tabs)/shadow-work');
  };

  const handleWatchAd = async () => {
    if (Platform.OS === 'web') return;
    setWatchingAd(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) {
        toast.show('Ad not completed — no credit granted.', { tone: 'info' });
        return;
      }
      await grantAdCredit();
      toast.show('Ad credit granted — Go Deeper unlocked once.', { tone: 'lumen', icon: 'auto-awesome' });
      onClose();
      onAdCredited?.();
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'lumen.watch_ad' } });
      toast.show('Could not load an ad. Please try again.', { tone: 'error', icon: 'error-outline' });
    } finally {
      setWatchingAd(false);
    }
  };

  const handleBuyLumen = () => {
    onClose();
    onBuyLumen?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="auto-awesome" size={28} color={colors.primary} />
          </View>

          <Text style={styles.title}>Not enough Lumen</Text>
          <Text style={styles.body}>
            This action needs {required} Lumen — you have {current}. {short} more to go.
          </Text>

          <View style={styles.actions}>
            {adAllowed && (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, watchingAd && { opacity: 0.6 }]}
                onPress={handleWatchAd}
                disabled={watchingAd}
              >
                {watchingAd ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="play-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryText}>Watch ad — unlock once</Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [adAllowed ? styles.secondaryActionBtn : styles.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleBuyLumen}
            >
              <MaterialIcons name="auto-awesome" size={18} color={adAllowed ? colors.primary : '#ffffff'} />
              <Text style={adAllowed ? styles.secondaryActionText : styles.primaryText}>Buy Lumen pack</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.tertiaryBtn, pressed && { opacity: 0.7 }]}
              onPress={goShadow}
            >
              <MaterialIcons name="nightlight-round" size={16} color={colors.textSecondary} />
              <Text style={styles.tertiaryText}>Tend the shadow (+10 each)</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.dismissText}>Maybe later</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 36, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
  },
  primaryText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: '#ffffff',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}14`,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    borderRadius: borderRadius.full,
    paddingVertical: 13,
  },
  secondaryActionText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  tertiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tertiaryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dismissBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
