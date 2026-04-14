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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await admin.rpc('lumen_monthly_grant', { p_user_id: user.id });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('not_premium')) {
        return new Response(JSON.stringify({ error: 'not_premium' }), { status: 403, headers: CORS });
      }
      if (msg.includes('profile_not_found')) {
        return new Response(JSON.stringify({ error: 'profile_not_found' }), { status: 404, headers: CORS });
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        new_balance: row?.new_balance,
        granted: row?.granted,
        already_granted: row?.already_granted,
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
