import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { LimitType } from '@/types/database';

const LIMITS = {
  free: { go_deeper: 5, image_refinement: 1, image_generation: 10, shadow_exercise: 3, dream_connection: 999, dream_insights: 1 },
  premium: { go_deeper: 10, image_refinement: 3, image_generation: 30, shadow_exercise: 5, dream_connection: 999, dream_insights: 999 },
};

const DAILY_LIMIT_TYPES: ReadonlySet<LimitType> = new Set(['shadow_exercise', 'dream_insights', 'dream_connection']);
const MONTHLY_LIMIT_TYPES: ReadonlySet<LimitType> = new Set(['image_generation']);

export function useUsageLimits() {
  const { user, profile } = useAuth();
  const tier = profile?.subscription_tier || 'free';

  const checkLimit = useCallback(async (limitType: LimitType, dreamId?: string): Promise<{ allowed: boolean; remaining: number }> => {
    if (!user) return { allowed: false, remaining: 0 };

    const maxCount = LIMITS[tier][limitType];

    let query = supabase.from('usage_limits').select('count').eq('user_id', user.id).eq('limit_type', limitType);

    if (MONTHLY_LIMIT_TYPES.has(limitType)) {
      const monthKey = new Date().toISOString().substring(0, 7) + '-01';
      query = query.eq('period_date', monthKey);
    } else if (DAILY_LIMIT_TYPES.has(limitType)) {
      query = query.eq('period_date', new Date().toISOString().split('T')[0]);
    } else if (dreamId) {
      query = query.eq('dream_id', dreamId);
    }

    const { data } = await query.maybeSingle();
    const currentCount = data?.count || 0;

    return { allowed: currentCount < maxCount, remaining: maxCount - currentCount };
  }, [user, tier]);

  const incrementLimit = useCallback(async (limitType: LimitType, dreamId?: string) => {
    if (!user) return;

    const isDaily = DAILY_LIMIT_TYPES.has(limitType);
    const isMonthly = MONTHLY_LIMIT_TYPES.has(limitType);

    if (!isDaily && !isMonthly && !dreamId) {
      if (__DEV__) console.error('incrementLimit called without dreamId for per-dream limit:', limitType);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const periodDate = isMonthly ? today.substring(0, 7) + '-01' : isDaily ? today : null;

    const { error } = await supabase.rpc('increment_usage_limit', {
      p_user_id: user.id,
      p_limit_type: limitType,
      p_dream_id: isDaily || isMonthly ? null : dreamId ?? null,
      p_period_date: periodDate,
    });

    if (error) {
      if (__DEV__) console.error('increment_usage_limit RPC failed:', error.message);
    }
  }, [user]);

  return { checkLimit, incrementLimit, tier };
}
