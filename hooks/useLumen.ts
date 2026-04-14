import { useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { InsufficientLumenError } from '@/lib/lumen-errors';

export { InsufficientLumenError };

// Spend now happens inside each paid edge function (generate-image, go-deeper,
// dream-insights, dream-connection). The client never calls lumen-spend
// directly — these constants stay only so UI screens can display costs and
// build an InsufficientLumenError from the server's 402 response.
export type LumenAction = 'go_deeper' | 'image_gen' | 'image_refine' | 'insights' | 'connection';

export const LUMEN_COSTS: Record<LumenAction, number> = {
  go_deeper: 10,
  image_gen: 20,
  image_refine: 20,
  insights: 25,
  connection: 15,
};

export interface EarnResult {
  new_balance: number;
  earned: number;
  reason?: 'response_too_short';
}

export type LumenPack = 'small' | 'medium' | 'large' | 'mega';

export const LUMEN_PACKS: Record<LumenPack, { amount: number; price: string; product_id: string; name: string; tagline: string }> = {
  small:  { amount: 50,  price: '$1.99',  product_id: 'animus_lumen_small',  name: "The Initiate's Pouch",     tagline: 'A first taste of the work' },
  medium: { amount: 150, price: '$4.99',  product_id: 'animus_lumen_medium', name: "The Seeker's Purse",       tagline: 'For those who descend often' },
  large:  { amount: 350, price: '$9.99',  product_id: 'animus_lumen_large',  name: "The Alchemist's Coffer",   tagline: 'Best value — most chosen' },
  mega:   { amount: 800, price: '$19.99', product_id: 'animus_lumen_mega',   name: "The Philosopher's Stone",  tagline: 'For the dedicated' },
};

export interface PurchaseResult {
  new_balance: number;
  lumen_added: number;
  duplicate: boolean;
}

export interface AdCreditResult {
  credits_used_today: number;
  credits_remaining_today: number;
}

export function useLumen() {
  const { profile, refreshProfile } = useAuth();
  const balance = profile?.lumen_balance ?? 0;

  const earnShadow = useCallback(async (exercise_id: string): Promise<EarnResult> => {
    const { data, error } = await supabase.functions.invoke<EarnResult>(
      'lumen-earn-shadow',
      { body: { exercise_id } },
    );
    if (error) {
      Sentry.captureException(error, { tags: { edgeFunction: 'lumen-earn-shadow' } });
      throw new Error(error.message || 'lumen-earn-shadow failed');
    }
    if (!data) throw new Error('lumen-earn-shadow returned no data');
    await refreshProfile();
    return data;
  }, [refreshProfile]);

  const purchase = useCallback(async (
    pack: LumenPack,
    transaction_id: string,
    metadata?: Record<string, unknown>,
  ): Promise<PurchaseResult> => {
    const { data, error } = await supabase.functions.invoke<PurchaseResult>(
      'lumen-purchase',
      { body: { pack, transaction_id, product_id: LUMEN_PACKS[pack].product_id, metadata } },
    );
    if (error) {
      Sentry.captureException(error, { tags: { edgeFunction: 'lumen-purchase', pack } });
      throw new Error(error.message || 'lumen-purchase failed');
    }
    if (!data) throw new Error('lumen-purchase returned no data');
    await refreshProfile();
    return data;
  }, [refreshProfile]);

  const grantAdCredit = useCallback(async (): Promise<AdCreditResult> => {
    const { data, error } = await supabase.functions.invoke<AdCreditResult>('lumen-ad-credit', { body: {} });
    if (error) {
      Sentry.captureException(error, { tags: { edgeFunction: 'lumen-ad-credit' } });
      throw new Error(error.message || 'lumen-ad-credit failed');
    }
    if (!data) throw new Error('lumen-ad-credit returned no data');
    return data;
  }, []);

  const claimMonthlyGrant = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke<{ new_balance: number; granted: number; already_granted: boolean }>(
      'lumen-monthly-grant',
      { body: {} },
    );
    if (error) {
      Sentry.captureException(error, { tags: { edgeFunction: 'lumen-monthly-grant' } });
      throw new Error(error.message || 'lumen-monthly-grant failed');
    }
    if (!data) throw new Error('lumen-monthly-grant returned no data');
    await refreshProfile();
    return data;
  }, [refreshProfile]);

  return { balance, earnShadow, purchase, grantAdCredit, claimMonthlyGrant, costs: LUMEN_COSTS, packs: LUMEN_PACKS };
}
