import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

  // Rate limit: 10/day
  const { error: rateErr } = await admin.rpc('check_and_increment_rate_limit', {
    p_user_id: user.id,
    p_limit_key: 'suggest_world_entry',
    p_max: 10,
  });
  if (rateErr) {
    if (rateErr.message?.includes('rate_limit_exceeded')) {
      return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), { status: 429, headers: CORS });
    }
    console.error('rate limit check failed:', rateErr);
    return new Response(JSON.stringify({ error: 'service_unavailable' }), { status: 503, headers: CORS });
  }

  const { data: symbols } = await supabase.from('dream_symbols').select('symbol').eq('user_id', user.id);
  const { data: existing } = await supabase.from('world_entries').select('name').eq('user_id', user.id);

  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()));
  const symbolCounts: Record<string, number> = {};
  for (const s of symbols || []) {
    symbolCounts[s.symbol] = (symbolCounts[s.symbol] || 0) + 1;
  }

  const suggestions = Object.entries(symbolCounts)
    .filter(([sym, count]) => count >= 3 && !existingNames.has(sym.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symbol, count]) => ({ symbol, count }));

  return new Response(JSON.stringify({ suggestions }), { headers: CORS });
  } catch (err) {
    console.error('suggest-world-entry error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: CORS });
  }
});
