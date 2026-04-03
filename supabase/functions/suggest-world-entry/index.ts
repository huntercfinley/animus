import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

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

  return new Response(JSON.stringify({ suggestions }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
