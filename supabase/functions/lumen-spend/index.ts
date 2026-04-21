import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

// Cost table — mirrors docs/lumen-economy-spec.md.
// "go_deeper" = one exchange pair (question + reply).
const COSTS: Record<string, { amount: number; type: string }> = {
  go_deeper:    { amount: 10, type: 'spend_go_deeper' },
  image_gen:    { amount: 20, type: 'spend_image_gen' },
  image_refine: { amount: 20, type: 'spend_image_refine' },
  insights:     { amount: 25, type: 'spend_insights' },
  connection:   { amount: 15, type: 'spend_connection' },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    // User-scoped client for auth resolution
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const dreamId = body?.dream_id ?? null;
    const exerciseId = body?.exercise_id ?? null;
    const useAdCredit = body?.use_ad_credit === true;

    const cost = action ? COSTS[action] : undefined;
    if (!cost) {
      return new Response(
        JSON.stringify({ error: 'unknown_action', valid: Object.keys(COSTS) }),
        { status: 400, headers: CORS },
      );
    }

    // Service-role client for the atomic RPC
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Ad-credit substitution: only Go Deeper supports it per spec.
    if (useAdCredit) {
      if (action !== 'go_deeper') {
        return new Response(
          JSON.stringify({ error: 'ad_credit_not_allowed', action }),
          { status: 400, headers: CORS },
        );
      }
      const { data: consumed, error: consumeErr } = await admin.rpc('consume_ad_credit', { p_user_id: user.id });
      if (consumeErr) throw consumeErr;
      if (!consumed) {
        return new Response(
          JSON.stringify({ error: 'no_ad_credit_available' }),
          { status: 402, headers: CORS },
        );
      }
      const { data: profile } = await admin.from('profiles').select('lumen_balance').eq('id', user.id).single();
      return new Response(
        JSON.stringify({
          new_balance: profile?.lumen_balance ?? 0,
          ad_credit_used: true,
        }),
        { headers: CORS },
      );
    }

    const { data, error } = await admin.rpc('lumen_spend_atomic', {
      p_user_id: user.id,
      p_amount: cost.amount,
      p_type: cost.type,
      p_dream_id: dreamId,
      p_exercise_id: exerciseId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('insufficient_lumen')) {
        const { data: profile } = await admin
          .from('profiles')
          .select('lumen_balance')
          .eq('id', user.id)
          .single();
        return new Response(
          JSON.stringify({
            error: 'insufficient_lumen',
            current_balance: profile?.lumen_balance ?? 0,
            required: cost.amount,
          }),
          { status: 402, headers: CORS },
        );
      }
      throw error;
    }

    // TABLE-returning RPCs come back as an array
    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        new_balance: row?.new_balance,
        transaction_id: row?.transaction_id,
      }),
      { headers: CORS },
    );
  } catch (err) {
    console.error('lumen-spend error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: CORS },
    );
  }
});
