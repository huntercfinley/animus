import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };
const CONNECTION_COST = 15;

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

  const { dream_a_id, dream_b_id } = await req.json();

  const [dreamARes, dreamBRes, profRes] = await Promise.all([
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_a_id).eq('user_id', user.id).single(),
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_b_id).eq('user_id', user.id).single(),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
  ]);

  if (!dreamARes.data || !dreamBRes.data) {
    return new Response(JSON.stringify({ error: 'Dream not found' }), { status: 404, headers: CORS });
  }

  const isPremium = profRes.data?.subscription_tier === 'premium';

  // Deduct 15 Lumen before Claude call. Premium is unmetered. Closes the
  // client-side bypass where a tampered build could call this function
  // directly without paying.
  if (!isPremium) {
    const { error: spendErr } = await admin.rpc('lumen_spend_atomic', {
      p_user_id: user.id,
      p_amount: CONNECTION_COST,
      p_type: 'spend_connection',
      p_dream_id: null,
      p_exercise_id: null,
    });
    if (spendErr) {
      const msg = spendErr.message || '';
      if (msg.includes('insufficient_lumen')) {
        const { data: p } = await admin.from('profiles').select('lumen_balance').eq('id', user.id).single();
        return new Response(
          JSON.stringify({ error: 'insufficient_lumen', current_balance: p?.lumen_balance ?? 0, required: CONNECTION_COST }),
          { status: 402, headers: CORS },
        );
      }
      throw spendErr;
    }
    deductedForUser = user.id;
  }

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 300,
      system: 'You are a Jungian analyst. Analyze how two dreams connect — shared symbols, narrative threads, archetypal patterns. Write 2-4 sentences. Be poetic and insightful.',
      messages: [{ role: 'user', content: `Dream A: "${dreamARes.data?.title}" — ${dreamARes.data?.journal_text}\n\nDream B: "${dreamBRes.data?.title}" — ${dreamBRes.data?.journal_text}` }],
    }),
  });

  if (!aiResponse.ok) {
    const errBody = await aiResponse.text();
    throw new Error(`ai_service_unavailable: ${errBody.slice(0, 200)}`);
  }
  const aiResult = await aiResponse.json();
  const analysis = aiResult.content[0].text;

  const { data: connection } = await supabase.from('dream_connections').insert({ user_id: user.id, dream_a_id, dream_b_id, analysis }).select().single();

  return new Response(JSON.stringify(connection), { headers: CORS });
  } catch (err) {
    if (deductedForUser) {
      const { error: refundErr } = await admin.rpc('lumen_refund_atomic', {
        p_user_id: deductedForUser,
        p_amount: CONNECTION_COST,
        p_type: 'refund_connection',
        p_dream_id: null,
        p_exercise_id: null,
      });
      if (refundErr) console.error('[dream-connection] refund failed', refundErr);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS });
  }
});
