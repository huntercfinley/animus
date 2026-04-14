import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
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
    const exerciseId = body?.exercise_id as string | undefined;
    if (!exerciseId) {
      return new Response(
        JSON.stringify({ error: 'exercise_id required' }),
        { status: 400, headers: CORS },
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await admin.rpc('lumen_earn_shadow', {
      p_user_id: user.id,
      p_exercise_id: exerciseId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('exercise_not_found')) {
        return new Response(
          JSON.stringify({ error: 'exercise_not_found' }),
          { status: 404, headers: CORS },
        );
      }
      if (msg.includes('response_too_short')) {
        // Not an error for clients — tell them no Lumen earned and why.
        const { data: profile } = await admin
          .from('profiles')
          .select('lumen_balance')
          .eq('id', user.id)
          .single();
        return new Response(
          JSON.stringify({
            new_balance: profile?.lumen_balance ?? 0,
            earned: 0,
            reason: 'response_too_short',
          }),
          { headers: CORS },
        );
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        new_balance: row?.new_balance,
        earned: row?.earned,
      }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: CORS },
    );
  }
});
