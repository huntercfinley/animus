import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };
const INSIGHTS_COST = 25;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let deductedForUser: string | null = null;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

  const { period_type } = await req.json();
  // Validate to an enum — period_type is interpolated into the system prompt
  // and the user message, so an unvalidated string would be a prompt-injection
  // surface.
  if (period_type !== 'weekly' && period_type !== 'monthly') {
    return new Response(
      JSON.stringify({ error: 'invalid_period_type', valid: ['weekly', 'monthly'] }),
      { status: 400, headers: CORS },
    );
  }
  const daysBack = period_type === 'weekly' ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Parallel fetch: dream content + tier. Premium is unmetered; free pays 25.
  // Server-side spend closes the client-side bypass: a tampered client could
  // previously call this function directly without paying.
  const [dreamsRes, symbolsRes, exercisesRes, profRes] = await Promise.all([
    supabase.from('dreams').select('title, journal_text, interpretation, mood, created_at').eq('user_id', user.id).gte('created_at', since).order('created_at'),
    supabase.from('dream_symbols').select('symbol, archetype, sentiment').eq('user_id', user.id).gte('created_at', since),
    supabase.from('shadow_exercises').select('prompt, response').eq('user_id', user.id).gte('created_at', since).not('response', 'is', null),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
  ]);
  const dreams = dreamsRes.data;
  const symbols = symbolsRes.data;
  const exercises = exercisesRes.data;
  const isPremium = profRes.data?.subscription_tier === 'premium';

  if (!dreams?.length) return new Response(JSON.stringify({ error: 'No dreams in this period' }), { status: 400, headers: CORS });

  if (!isPremium) {
    const { error: spendErr } = await admin.rpc('lumen_spend_atomic', {
      p_user_id: user.id,
      p_amount: INSIGHTS_COST,
      p_type: 'spend_insights',
      p_dream_id: null,
      p_exercise_id: null,
    });
    if (spendErr) {
      const msg = spendErr.message || '';
      if (msg.includes('insufficient_lumen')) {
        const { data: p } = await admin.from('profiles').select('lumen_balance').eq('id', user.id).single();
        return new Response(
          JSON.stringify({ error: 'insufficient_lumen', current_balance: p?.lumen_balance ?? 0, required: INSIGHTS_COST }),
          { status: 402, headers: CORS },
        );
      }
      throw spendErr;
    }
    deductedForUser = user.id;
  }

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
    throw new Error(`ai_service_unavailable: ${errBody.slice(0, 200)}`);
  }
  const aiResult = await aiResponse.json();
  const report = aiResult.content[0].text;
  const periodStart = since.split('T')[0];
  const periodEnd = new Date().toISOString().split('T')[0];

  const { data: saved } = await supabase.from('pattern_reports').insert({ user_id: user.id, period_type, period_start: periodStart, period_end: periodEnd, report }).select().single();

  return new Response(JSON.stringify(saved), { headers: CORS });
  } catch (err) {
    if (deductedForUser) {
      const { error: refundErr } = await admin.rpc('lumen_refund_atomic', {
        p_user_id: deductedForUser,
        p_amount: INSIGHTS_COST,
        p_type: 'refund_insights',
        p_dream_id: null,
        p_exercise_id: null,
      });
      if (refundErr) console.error('[dream-insights] refund failed', refundErr);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS });
  }
});
