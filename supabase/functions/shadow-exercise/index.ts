import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a Jungian shadow work facilitator. Generate a single shadow work exercise prompt. The prompt should be:
- Introspective and personally confronting but never aggressive
- Framed as "diving deeper beneath the surface"
- Connected to the dream symbols if provided
- 2-4 sentences maximum
- End with a question the user can journal about

Respond with ONLY the exercise prompt text, no JSON or formatting.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { dream_id, symbols } = await req.json();

    let context = '';
    if (symbols?.length) {
      context = `\n\nDream symbols to weave into the exercise: ${symbols.map((s: any) => s.symbol).join(', ')}`;
    }

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, system: SYSTEM_PROMPT + context, messages: [{ role: 'user', content: 'Generate a shadow work exercise.' }] }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      return new Response(JSON.stringify({ error: 'AI service unavailable', detail: errBody }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const aiResult = await aiResponse.json();
    const prompt = aiResult.content[0].text;

    // Save exercise
    const { data: exercise } = await supabase
      .from('shadow_exercises')
      .insert({ user_id: user.id, dream_id: dream_id || null, prompt })
      .select()
      .single();

    return new Response(JSON.stringify(exercise), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
