import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

const PROD_INTERSTITIAL = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || null;
const PROD_NATIVE = process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || null;

export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? 'ca-app-pub-3940256099942544/1033173712' : PROD_INTERSTITIAL,
  native: __DEV__ ? 'ca-app-pub-3940256099942544/2247696110' : PROD_NATIVE,
};

export const adsConfigured = !!(AD_UNIT_IDS.interstitial && AD_UNIT_IDS.native);

export async function initializeAds() {
  if (!adsConfigured) {
    console.warn('AdMob IDs not configured — ads disabled');
    return;
  }
  await mobileAds().initialize();
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}
