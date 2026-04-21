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
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // Daily rate limit — shadow-exercise hits Claude on every call.
    // 20/day is generous given the spec's 3/day earn cap on lumen-earn-shadow.
    const { error: rateErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_user_id: user.id,
      p_limit_key: 'shadow_exercise_gen',
      p_max: 20,
    });
    if (rateErr) {
      if (rateErr.message?.includes('rate_limit_exceeded')) {
        return new Response(
          JSON.stringify({ error: 'rate_limit_exceeded' }),
          { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      console.error('rate limit check failed:', rateErr);
      return new Response(
        JSON.stringify({ error: 'service_unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { dream_id, symbols } = await req.json();

    // Validate symbols array
    if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 20) {
      return new Response(JSON.stringify({ error: 'invalid_symbols' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const sanitizedSymbols = symbols.map((s: any) => {
      const sym = String(s.symbol || s).slice(0, 50).replace(/[^\w\s'-]/g, '');
      return sym;
    }).filter(Boolean);
    if (sanitizedSymbols.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_symbols' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Verify dream ownership if dream_id provided
    if (dream_id) {
      const { data: dream } = await supabase.from('dreams').select('id').eq('id', dream_id).eq('user_id', user.id).single();
      if (!dream) {
        return new Response(JSON.stringify({ error: 'dream_not_found' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    let context = '';
    if (sanitizedSymbols.length) {
      context = `\n\nDream symbols to weave into the exercise: ${sanitizedSymbols.join(', ')}`;
    }

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, system: SYSTEM_PROMPT + context, messages: [{ role: 'user', content: 'Generate a shadow work exercise.' }] }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error('Claude API failed:', aiResponse.status, errBody.slice(0, 200));
      return new Response(JSON.stringify({ error: 'ai_service_unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
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
    console.error('shadow-exercise error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
