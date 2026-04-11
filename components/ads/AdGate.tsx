import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AD_UNIT_IDS, adsConfigured } from '@/lib/ads';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

const TRANSPARENT_MESSAGES = [
  'This ad keeps Animus free. AI dreams aren\'t cheap \u2014 thank you for supporting us.',
  'Dream interpretation and image generation cost real money. This ad helps us keep Animus open to everyone.',
  'You\'re about to go deeper. This ad helps us keep the lights on so everyone can explore their dreams.',
];

interface AdGateProps {
  children: React.ReactNode;
  onAdComplete: () => void;
  actionLabel?: string;
}

export function AdGate({ children, onAdComplete, actionLabel = 'Continue' }: AdGateProps) {
  const { profile } = useAuth();
  const [adLoaded, setAdLoaded] = useState(false);
  const [showingMessage, setShowingMessage] = useState(false);
  const [interstitial, setInterstitial] = useState<any>(null);
  const [message] = useState(() => TRANSPARENT_MESSAGES[Math.floor(Math.random() * TRANSPARENT_MESSAGES.length)]);

  const isPremium = profile?.subscription_tier === 'premium';
  const onAdCompleteRef = useRef(onAdComplete);
  onAdCompleteRef.current = onAdComplete;

  useEffect(() => {
    if (Platform.OS === 'web' || isPremium || !adsConfigured || !AD_UNIT_IDS.interstitial) return;

    let loadListener: (() => void) | undefined;
    let closeListener: (() => void) | undefined;
    let errorListener: (() => void) | undefined;

    import('react-native-google-mobile-ads').then(({ InterstitialAd, AdEventType }) => {
      const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial!);

      loadListener = ad.addAdEventListener(AdEventType.LOADED, () => setAdLoaded(true));
      closeListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
        onAdCompleteRef.current();
        setShowingMessage(false);
      });
      errorListener = ad.addAdEventListener(AdEventType.ERROR, () => {
        setAdLoaded(false);
        setInterstitial(null);
      });

      ad.load();
      setInterstitial(ad);
    });

    return () => { loadListener?.(); closeListener?.(); errorListener?.(); };
  }, [isPremium]);

  const handlePress = useCallback(() => {
    if (!showingMessage) {
      setShowingMessage(true);
      return;
    }
    if (adLoaded && interstitial) {
      interstitial.show();
    } else {
      onAdComplete();
    }
  }, [showingMessage, adLoaded, interstitial, onAdComplete]);

  if (isPremium) {
    return <>{children}</>;
  }

  if (showingMessage) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{message}</Text>
        <Pressable style={styles.continueBtn} onPress={handlePress}>
          <Text style={styles.continueText}>
            {adLoaded ? actionLabel : 'Loading...'}
          </Text>
          {!adLoaded && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageContainer: { padding: spacing.lg, alignItems: 'center' },
  message: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueText: {
    fontFamily: fonts.sansMedium,
    color: colors.primary,
  },
});
