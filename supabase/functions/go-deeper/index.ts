import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a warm, wise Jungian dream analyst continuing a conversation about a dream. You ask Socratic questions — never leading ones. You draw connections to the dreamer's life context and previous dreams when relevant. You speak with metaphor and poetic insight. Keep responses to 2-4 sentences — brief, evocative, and thought-provoking.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { dream_id, message } = await req.json();

    if (!dream_id || typeof dream_id !== 'string') {
      return new Response(JSON.stringify({ error: 'dream_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Fetch dream + existing conversation
    const [dreamRes, convRes, profileRes] = await Promise.all([
      supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_id).eq('user_id', user.id).single(),
      supabase.from('dream_conversations').select('role, content').eq('dream_id', dream_id).order('exchange_number'),
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    ]);

    const dream = dreamRes.data;
    if (!dream) return new Response(JSON.stringify({ error: 'Dream not found' }), { status: 404 });
    const conversation = convRes.data || [];
    const isPremium = profileRes.data?.subscription_tier === 'premium';
    const maxExchanges = isPremium ? 10 : 5;

    // Count existing user messages
    const userMessageCount = conversation.filter((c: any) => c.role === 'user').length;
    if (userMessageCount >= maxExchanges) {
      return new Response(JSON.stringify({ error: 'Exchange limit reached', limit: maxExchanges }), { status: 429 });
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
      return new Response(JSON.stringify({ error: 'AI call failed' }), { status: 502 });
    }

    const aiResult = await aiResponse.json();
    const reply = aiResult?.content?.[0]?.text;
    if (!reply) return new Response(JSON.stringify({ error: 'AI returned no response' }), { status: 502 });

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
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
