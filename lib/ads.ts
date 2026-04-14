import { Platform } from 'react-native';

const PROD_INTERSTITIAL = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || null;
const PROD_NATIVE = process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || null;
const PROD_REWARDED = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || null;

export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? 'ca-app-pub-3940256099942544/1033173712' : PROD_INTERSTITIAL,
  native: __DEV__ ? 'ca-app-pub-3940256099942544/2247696110' : PROD_NATIVE,
  rewarded: __DEV__ ? 'ca-app-pub-3940256099942544/5224354917' : PROD_REWARDED,
};

export const adsConfigured = Platform.OS !== 'web' && !!(AD_UNIT_IDS.interstitial && AD_UNIT_IDS.native);
export const rewardedAdsConfigured = Platform.OS !== 'web' && !!AD_UNIT_IDS.rewarded;
const anyAdsConfigured = Platform.OS !== 'web' && !!(AD_UNIT_IDS.interstitial || AD_UNIT_IDS.native || AD_UNIT_IDS.rewarded);

export async function initializeAds() {
  if (Platform.OS === 'web') return;
  if (!anyAdsConfigured) {
    console.warn('AdMob IDs not configured — ads disabled');
    return;
  }

  // Request App Tracking Transparency (required by Apple before showing ads)
  try {
    const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
    await requestTrackingPermissionsAsync();
  } catch {
    // ATT not available (e.g. Android or older iOS) — continue
  }

  const { default: mobileAds, MaxAdContentRating } = await import('react-native-google-mobile-ads');
  await mobileAds().initialize();
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}

// Show a rewarded ad. Resolves with `true` if the user earned the reward,
// `false` if they dismissed early or the SDK rejected the request.
export async function showRewardedAd(): Promise<boolean> {
  if (Platform.OS === 'web' || !AD_UNIT_IDS.rewarded) return false;

  const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
  const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, { requestNonPersonalizedAdsOnly: true });

  return new Promise<boolean>((resolve) => {
    let earned = false;
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { unsubLoaded(); unsubEarned(); unsubError(); unsubClosed(); } catch {}
      resolve(value);
    };
    // Safety timeout — if AdMob never fires LOADED/ERROR/CLOSED (dead network,
    // SDK hang) the sheet's spinner would spin forever. 30s is longer than
    // any healthy ad load.
    const timeout = setTimeout(() => settle(false), 30000);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try { ad.show(); } catch { settle(false); }
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => settle(earned));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => settle(false));

    try { ad.load(); } catch { settle(false); }
  });
}
