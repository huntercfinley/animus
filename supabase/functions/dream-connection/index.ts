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

  const { dream_a_id, dream_b_id } = await req.json();

  const [dreamARes, dreamBRes] = await Promise.all([
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_a_id).eq('user_id', user.id).single(),
    supabase.from('dreams').select('title, journal_text, interpretation').eq('id', dream_b_id).eq('user_id', user.id).single(),
  ]);

  if (!dreamARes.data || !dreamBRes.data) {
    return new Response(JSON.stringify({ error: 'Dream not found' }), { status: 404 });
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
    return new Response(JSON.stringify({ error: 'AI service unavailable', detail: errBody }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  const aiResult = await aiResponse.json();
  const analysis = aiResult.content[0].text;

  const { data: connection } = await supabase.from('dream_connections').insert({ user_id: user.id, dream_a_id, dream_b_id, analysis }).select().single();

  return new Response(JSON.stringify(connection), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
