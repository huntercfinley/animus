import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type PurchaseResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

interface SubscriptionState {
  isPremium: boolean;
  packages: any[];
  loading: boolean;
  purchase: (pkg: any) => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

// RevenueCat requires distinct keys per platform. Fall back to the legacy
// shared key only when a platform-specific one isn't set so iOS keeps working
// during the launch window.
const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
}) || '';

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const configuredRef = useRef(false);

  useEffect(() => {
    async function init() {
      if (user && authProfile?.is_admin === true) {
        setIsPremium(true);
        setLoading(false);
        return;
      }
      if (Platform.OS === 'web') {
        if (user) {
          const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
          setIsPremium(data?.subscription_tier === 'premium');
        }
        setLoading(false);
        return;
      }
      if (!REVENUECAT_API_KEY) {
        // No key set for this platform — skip RevenueCat entirely so the
        // offerings fetch doesn't error-toast on every launch (common on
        // Android dev builds while we ship iOS first).
        if (__DEV__) {
          console.warn(
            `[SubscriptionContext] No RevenueCat API key for ${Platform.OS} — skipping init`
          );
        }
        setIsPremium(false);
        setLoading(false);
        return;
      }
      const { default: Purchases } = await import('react-native-purchases');
      if (!configuredRef.current) {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        configuredRef.current = true;
      }
      if (user) await Purchases.logIn(user.id);
      await checkPremiumStatus();
      await loadPackages();
      setLoading(false);
    }
    init();
  }, [user, authProfile]);

  async function checkPremiumStatus() {
    if (Platform.OS === 'web') return;
    if (user && authProfile?.is_admin === true) {
      setIsPremium(true);
      return;
    }
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const info = await Purchases.getCustomerInfo();
      const premium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(premium);

      if (user) {
        // profiles.subscription_tier is server-managed (column-level revoke
        // since migration 19). subscription-sync re-checks the entitlement
        // against RevenueCat's REST API and updates the row via service_role,
        // so a tampered client can't promote itself to premium.
        try {
          await supabase.functions.invoke('subscription-sync', { body: {} });
          await refreshProfile();
        } catch (syncErr) {
          if (__DEV__) console.warn('[SubscriptionContext] subscription-sync failed', syncErr);
        }

        // Premium subscribers get 1500 Lumen/month, capped at a 3000 stockpile.
        // The RPC is idempotent per calendar month, so calling it on every app
        // launch is safe — it no-ops after the first claim of the period.
        if (premium) {
          try {
            await supabase.functions.invoke('lumen-monthly-grant', { body: {} });
            await refreshProfile();
          } catch (grantErr) {
            if (__DEV__) console.warn('[SubscriptionContext] monthly grant skipped', grantErr);
          }
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[SubscriptionContext] checkPremiumStatus failed', err);
      setIsPremium(false);
    }
  }

  async function loadPackages() {
    if (Platform.OS === 'web') return;
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const offerings = await Purchases.getOfferings();
      if (offerings.current) setPackages(offerings.current.availablePackages);
    } catch (err) {
      if (__DEV__) console.warn('[SubscriptionContext] loadPackages failed', err);
    }
  }

  const purchase = async (pkg: any): Promise<PurchaseResult> => {
    if (Platform.OS === 'web') {
      return { status: 'error', message: 'Purchases are not available on web.' };
    }
    if (!pkg) {
      return { status: 'error', message: 'This plan is not available right now. Please try again shortly.' };
    }
    try {
      const { default: Purchases } = await import('react-native-purchases');
      await Purchases.purchasePackage(pkg);
      await checkPremiumStatus();
      await refreshProfile();
      return { status: 'success' };
    } catch (err: any) {
      if (err?.userCancelled) return { status: 'cancelled' };
      Sentry.captureException(err, { tags: { feature: 'subscription.purchase' } });
      const message = err?.underlyingErrorMessage || err?.message || 'The purchase could not be completed.';
      return { status: 'error', message };
    }
  };

  const restore = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    if (user && authProfile?.is_admin === true) {
      setIsPremium(true);
      return true;
    }
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);
      if (user) {
        // Server-side mirror via subscription-sync (the column is locked from
        // direct client writes — see migration 19).
        try {
          await supabase.functions.invoke('subscription-sync', { body: {} });
        } catch (syncErr) {
          if (__DEV__) console.warn('[SubscriptionContext] sync after restore failed', syncErr);
        }
      }
      await refreshProfile();
      return hasPremium;
    } catch (err) {
      if (__DEV__) console.warn('[SubscriptionContext] restore failed', err);
      return false;
    }
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, packages, loading, purchase, restore }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
