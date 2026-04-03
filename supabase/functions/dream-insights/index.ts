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

  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (profile?.subscription_tier !== 'premium') return new Response(JSON.stringify({ error: 'Premium required' }), { status: 403 });

  const { period_type } = await req.json();
  const daysBack = period_type === 'weekly' ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const { data: dreams } = await supabase.from('dreams').select('title, journal_text, interpretation, mood, created_at').eq('user_id', user.id).gte('created_at', since).order('created_at');
  const { data: symbols } = await supabase.from('dream_symbols').select('symbol, archetype, sentiment').eq('user_id', user.id).gte('created_at', since);
  const { data: exercises } = await supabase.from('shadow_exercises').select('prompt, response').eq('user_id', user.id).gte('created_at', since).not('response', 'is', null);

  if (!dreams?.length) return new Response(JSON.stringify({ error: 'No dreams in this period' }), { status: 400 });

  const dreamSummaries = dreams.map((d: any) => `"${d.title}" (${d.mood}) — ${d.interpretation?.slice(0, 100)}...`).join('\n');
  const symbolList = symbols?.map((s: any) => `${s.symbol} (${s.archetype})`).join(', ');
  const exerciseSummary = exercises?.map((e: any) => `Q: ${e.prompt?.slice(0, 50)}... A: ${e.response?.slice(0, 50)}...`).join('\n');

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      system: `You are a Jungian analyst delivering a ${period_type} dream analysis session. Write a therapist-level report covering: dominant themes, emerging patterns, archetype activity, shadow work progress, and suggested focus areas. Be warm, insightful, and personal. Write 400-600 words.`,
      messages: [{ role: 'user', content: `Dreams this ${period_type === 'weekly' ? 'week' : 'month'}:\n${dreamSummaries}\n\nSymbols: ${symbolList}\n\nShadow work:\n${exerciseSummary || 'None this period'}` }],
    }),
  });

  if (!aiResponse.ok) {
    const errBody = await aiResponse.text();
    return new Response(JSON.stringify({ error: 'AI service unavailable', detail: errBody }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  const aiResult = await aiResponse.json();
  const report = aiResult.content[0].text;
  const periodStart = since.split('T')[0];
  const periodEnd = new Date().toISOString().split('T')[0];

  const { data: saved } = await supabase.from('pattern_reports').insert({ user_id: user.id, period_type, period_start: periodStart, period_end: periodEnd, report }).select().single();

  return new Response(JSON.stringify(saved), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
