import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  isPremium: boolean;
  packages: PurchasesPackage[];
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
}) || '';

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      if (user) await Purchases.logIn(user.id);
      await checkPremiumStatus();
      await loadPackages();
      setLoading(false);
    }
    init();
  }, [user]);

  async function checkPremiumStatus() {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const premium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(premium);

      if (user) {
        await supabase.from('profiles')
          .update({ subscription_tier: premium ? 'premium' : 'free' })
          .eq('id', user.id);
      }
    } catch {
      setIsPremium(false);
    }
  }

  async function loadPackages() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) setPackages(offerings.current.availablePackages);
    } catch {}
  }

  const purchase = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      await Purchases.purchasePackage(pkg);
      await checkPremiumStatus();
      await refreshProfile();
      return true;
    } catch { return false; }
  };

  const restore = async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);
      if (user) {
        await supabase.from('profiles')
          .update({ subscription_tier: hasPremium ? 'premium' : 'free' })
          .eq('id', user.id);
      }
      await refreshProfile();
      return hasPremium;
    } catch { return false; }
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
