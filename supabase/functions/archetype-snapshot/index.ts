import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});

  try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: symbols } = await supabase.from('dream_symbols').select('archetype').eq('user_id', user.id).gte('created_at', since);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const s of symbols || []) {
    if (s.archetype) { counts[s.archetype] = (counts[s.archetype] || 0) + 1; total++; }
  }

  const archetypes: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    archetypes[k] = Math.round((v / Math.max(total, 1)) * 100) / 100;
  }

  const sorted = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0]?.[0] || null;

  const { data: prevSnapshot } = await supabase.from('archetype_snapshots').select('archetypes').eq('user_id', user.id).order('snapshot_date', { ascending: false }).limit(1).maybeSingle();

  const rising: string[] = [];
  if (prevSnapshot?.archetypes) {
    for (const [k, v] of Object.entries(archetypes)) {
      const prev = (prevSnapshot.archetypes as Record<string, number>)[k] || 0;
      if (v > prev + 0.1) rising.push(k);
    }
  }

  const { data: snapshot } = await supabase.from('archetype_snapshots').insert({ user_id: user.id, snapshot_date: new Date().toISOString().split('T')[0], archetypes, dominant, rising }).select().single();

  return new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
