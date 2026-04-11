import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { LimitType } from '@/types/database';

const LIMITS = {
  free: { go_deeper: 5, image_refinement: 1, image_generation: 10, shadow_exercise: 3, dream_connection: 999, dream_insights: 1 },
  premium: { go_deeper: 10, image_refinement: 3, image_generation: 30, shadow_exercise: 5, dream_connection: 999, dream_insights: 999 },
};

export function useUsageLimits() {
  const { user, profile } = useAuth();
  const tier = profile?.subscription_tier || 'free';

  const checkLimit = useCallback(async (limitType: LimitType, dreamId?: string): Promise<{ allowed: boolean; remaining: number }> => {
    if (!user) return { allowed: false, remaining: 0 };

    const maxCount = LIMITS[tier][limitType];
    const isDailyLimit = limitType === 'shadow_exercise' || limitType === 'dream_insights' || limitType === 'dream_connection';
    const isMonthlyLimit = limitType === 'image_generation';

    let query = supabase.from('usage_limits').select('count').eq('user_id', user.id).eq('limit_type', limitType);

    if (isMonthlyLimit) {
      const monthKey = new Date().toISOString().substring(0, 7) + '-01';
      query = query.eq('period_date', monthKey);
    } else if (isDailyLimit) {
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

    const isDailyLimit = limitType === 'shadow_exercise' || limitType === 'dream_insights' || limitType === 'dream_connection';
    const isMonthlyLimit = limitType === 'image_generation';
    const today = new Date().toISOString().split('T')[0];
    const monthKey = today.substring(0, 7) + '-01';

    if (!isDailyLimit && !isMonthlyLimit && !dreamId) {
      console.error('incrementLimit called without dreamId for per-dream limit:', limitType);
      return;
    }

    const periodKey = isMonthlyLimit ? monthKey : isDailyLimit ? today : null;
    const lookupField = (isDailyLimit || isMonthlyLimit) ? 'period_date' : 'dream_id';
    const lookupValue = (isDailyLimit || isMonthlyLimit) ? periodKey! : dreamId!;

    const { data: existing } = await supabase.from('usage_limits')
      .select('id, count')
      .eq('user_id', user.id)
      .eq('limit_type', limitType)
      .eq(lookupField, lookupValue)
      .maybeSingle();

    if (existing) {
      await supabase.from('usage_limits').update({ count: existing.count + 1, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('usage_limits').insert({
        user_id: user.id,
        dream_id: (isDailyLimit || isMonthlyLimit) ? null : dreamId,
        limit_type: limitType,
        count: 1,
        period_date: periodKey,
      });
    }
  }, [user]);

  return { checkLimit, incrementLimit, tier };
}
