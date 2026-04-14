import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };
const GO_DEEPER_COST = 10;

const SYSTEM_PROMPT = `You are a warm, wise Jungian dream analyst continuing a conversation about a dream. You ask Socratic questions — never leading ones. You draw connections to the dreamer's life context and previous dreams when relevant. You speak with metaphor and poetic insight. Keep responses to 2-4 sentences — brief, evocative, and thought-provoking.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  let deductedForUser: string | null = null;
  let deductedDreamId: string | null = null;
  let deductedViaAdCredit = false;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

    const { dream_id, message, use_ad_credit } = await req.json();

    if (!dream_id || typeof dream_id !== 'string') {
      return new Response(JSON.stringify({ error: 'dream_id is required' }), { status: 400, headers: CORS });
    }
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: CORS });
    }
    // UI caps input at 500 chars; enforce server-side at 2000 for slack.
    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'message_too_long', max: 2000, got: message.length }),
        { status: 413, headers: CORS }
      );
    }

    // Fetch dream + existing conversation + tier in parallel. Premium is
    // unmetered per spec; free gets charged 10 Lumen server-side (was
    // client-side until migration 20 — a tampered client could call this
    // function directly and burn Claude API credit for free).
    const [dreamRes, convRes, profRes] = await Promise.all([
      supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_id).eq('user_id', user.id).single(),
      supabase.from('dream_conversations').select('role, content').eq('dream_id', dream_id).order('exchange_number'),
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    ]);

    const dream = dreamRes.data;
    if (!dream) return new Response(JSON.stringify({ error: 'Dream not found' }), { status: 404, headers: CORS });
    const conversation = convRes.data || [];
    const maxExchanges = 10;

    // Count existing user messages
    const userMessageCount = conversation.filter((c: any) => c.role === 'user').length;
    if (userMessageCount >= maxExchanges) {
      return new Response(JSON.stringify({ error: 'Exchange limit reached', limit: maxExchanges }), { status: 429, headers: CORS });
    }

    const isPremium = profRes.data?.subscription_tier === 'premium';

    // Deduct Lumen before calling Claude. Premium is unmetered. Ad-credit
    // substitution: if the user clicked "watch ad" and has an available
    // credit, consume it instead of charging Lumen.
    if (!isPremium) {
      if (use_ad_credit === true) {
        const { data: consumed, error: consumeErr } = await admin.rpc('consume_ad_credit', { p_user_id: user.id });
        if (consumeErr) throw consumeErr;
        if (!consumed) {
          return new Response(
            JSON.stringify({ error: 'no_ad_credit_available' }),
            { status: 402, headers: CORS },
          );
        }
        deductedViaAdCredit = true;
      } else {
        const { error: spendErr } = await admin.rpc('lumen_spend_atomic', {
          p_user_id: user.id,
          p_amount: GO_DEEPER_COST,
          p_type: 'spend_go_deeper',
          p_dream_id: dream_id,
          p_exercise_id: null,
        });
        if (spendErr) {
          const msg = spendErr.message || '';
          if (msg.includes('insufficient_lumen')) {
            const { data: p } = await admin.from('profiles').select('lumen_balance').eq('id', user.id).single();
            return new Response(
              JSON.stringify({ error: 'insufficient_lumen', current_balance: p?.lumen_balance ?? 0, required: GO_DEEPER_COST }),
              { status: 402, headers: CORS },
            );
          }
          throw spendErr;
        }
        deductedForUser = user.id;
        deductedDreamId = dream_id;
      }
    }

    // Build messages for Claude
    const messages: { role: string; content: string }[] = [
      { role: 'user', content: `Dream: "${dream.journal_text}"\n\nInitial interpretation: ${dream.interpretation}` },
    ];
    for (const c of conversation) {
      messages.push({ role: c.role, content: c.content });
    }
    messages.push({ role: 'user', content: message });

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, system: SYSTEM_PROMPT, messages }),
    });

    if (!aiResponse.ok) {
      throw new Error('ai_call_failed');
    }

    const aiResult = await aiResponse.json();
    const reply = aiResult?.content?.[0]?.text;
    if (!reply) throw new Error('ai_empty_response');

    // Save both messages to conversation
    const nextExchange = userMessageCount + 1;
    await supabase.from('dream_conversations').insert([
      { dream_id, role: 'user', content: message, exchange_number: nextExchange },
      { dream_id, role: 'assistant', content: reply, exchange_number: nextExchange },
    ]);

    return new Response(JSON.stringify({
      reply,
      exchange_number: nextExchange,
      remaining: maxExchanges - nextExchange,
    }), { headers: CORS });
  } catch (err) {
    // Refund on failure. Ad credits are single-use and not refundable (same
    // as lumen-spend); the user loses the credit if Claude blows up. That
    // matches the "you watched the ad, you're committed" contract.
    if (deductedForUser) {
      const { error: refundErr } = await admin.rpc('lumen_refund_atomic', {
        p_user_id: deductedForUser,
        p_amount: GO_DEEPER_COST,
        p_type: 'refund_go_deeper',
        p_dream_id: deductedDreamId,
        p_exercise_id: null,
      });
      if (refundErr) console.error('[go-deeper] refund failed', refundErr);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS });
  }
});
