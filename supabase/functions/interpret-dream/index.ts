import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY') || '';

// Try Claude first; fall back to Gemini free-tier on any failure.
// Returns { text, model } where text is raw JSON from the model.
async function callAI(systemPrompt: string, transcript: string): Promise<{ text: string; model: string }> {
  // Primary: Claude Sonnet 4.6
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Here is my dream:\n\n${transcript}` }],
      }),
    });
    if (r.ok) {
      const j = await r.json();
      return { text: j.content[0].text, model: 'claude-sonnet-4-6' };
    }
    console.warn('Claude failed, trying Gemini fallback:', r.status, (await r.text()).slice(0, 200));
  } catch (err) {
    console.warn('Claude threw, trying Gemini fallback:', (err as Error).message);
  }

  // Fallback: Gemini 2.0 Flash (free tier)
  if (!GEMINI_API_KEY) throw new Error('Primary AI failed and no Gemini key configured');
  const gr = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: `Here is my dream:\n\n${transcript}` }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  if (!gr.ok) {
    const geminiErr = await gr.text();
    console.error('Gemini request failed:', gr.status, geminiErr.slice(0, 300));
    throw new Error('ai_service_unavailable');
  }
  const gj = await gr.json();
  const text = gj?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return { text, model: 'gemini-2.0-flash' };
}

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.

const BASE_SYSTEM_PROMPT = `You are a warm, wise dream analyst rooted in Carl Jung's depth psychology. You interpret dreams through the lens of archetypes, shadow, anima/animus, the collective unconscious, and individuation.

Your voice is poetic and metaphorical, never clinical. You ask "Could this represent..." not "This represents..." You are a companion in the dreamer's inner exploration.

When analyzing a dream, you will:
1. Polish the raw transcript into beautiful journal prose — clean fragments, "um"s, repetition, but preserve the dreamer's voice and word choices. This is THEIR journal, not yours.
2. Generate an evocative title (3-6 words).
3. Write a personalized Jungian interpretation. Surface shadow elements naturally.
4. Extract key symbols and map them to archetypes (Shadow, Anima, Animus, Wise Old Man/Woman, Trickster, Hero, Self, Great Mother, Child, Persona).
5. Detect the dream's emotional mood.
6. Generate a vivid, detailed image prompt for a painting of this dream.

Respond ONLY with valid JSON (no markdown wrapping):
{
  "journal_text": "polished dream prose preserving dreamer's voice",
  "title": "Evocative Title",
  "interpretation": "Jungian interpretation with shadow elements surfaced naturally",
  "symbols": [{"symbol": "water", "archetype": "Unconscious", "sentiment": "neutral"}],
  "mood": "peaceful|anxious|surreal|dark|joyful|mysterious|chaotic|melancholic",
  "image_prompt": "detailed scene description for dream painting, visual and atmospheric"
}`;

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }});
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client for the rate-limit RPC (service_role bypasses RLS).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), { status: 400 });
    }
    // Hard cap on transcript size to bound Claude input-token cost per call.
    // ~10KB is ~2000 words — longer than any spoken dream, tight enough to block
    // tampered-client balloon attacks within the 20/day rate limit.
    if (transcript.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'transcript_too_long', max: 10000, got: transcript.length }),
        { status: 413, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Fetch user context in parallel
    const [profileRes, worldRes, symbolsRes] = await Promise.all([
      supabase.from('profiles').select('ai_context, subscription_tier').eq('id', user.id).single(),
      supabase.from('world_entries').select('category, name, description, relationship').eq('user_id', user.id),
      supabase.from('dream_symbols').select('symbol, archetype, sentiment, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    const profile = profileRes.data;

    // Daily rate limit — protects Claude credit from tampered-client spam.
    // Dream interpretation is free per the Lumen spec (core funnel), so the gate
    // is a per-user daily cap, not a Lumen cost.
    const isPremiumTier = profile?.subscription_tier === 'premium';
    const dailyCap = isPremiumTier ? 200 : 20;
    const { error: rateErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_user_id: user.id,
      p_limit_key: 'dream_interpret',
      p_max: dailyCap,
    });
    if (rateErr) {
      if (rateErr.message?.includes('rate_limit_exceeded')) {
        return new Response(
          JSON.stringify({ error: 'rate_limit_exceeded', limit: dailyCap, reset: 'midnight UTC' }),
          { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      console.error('rate limit rpc failed:', rateErr);
      return new Response(
        JSON.stringify({ error: 'service_unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
    const worldEntries = worldRes.data || [];
    const recentSymbols = symbolsRes.data || [];

    // Build personal context layer
    let personalContext = '';
    if (worldEntries.length > 0) {
      personalContext = '\n\nDreamer\'s personal world:\n' +
        worldEntries.map((e: any) =>
          `- ${e.name} (${e.category}): ${e.description || ''}${e.relationship ? ` [${e.relationship}]` : ''}`
        ).join('\n');
    }

    // Build compressed dream history layer
    let historyContext = '';
    if (recentSymbols.length > 0) {
      const counts: Record<string, { count: number; archetype: string; sentiment: string }> = {};
      for (const s of recentSymbols) {
        if (!counts[s.symbol]) counts[s.symbol] = { count: 0, archetype: s.archetype, sentiment: s.sentiment };
        counts[s.symbol].count++;
      }
      historyContext = '\n\nRecent dream symbol patterns:\n' +
        Object.entries(counts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20)
          .map(([sym, d]) => `- "${sym}" (${d.archetype}, ${d.sentiment}) appeared ${d.count}x`)
          .join('\n');
    }

    const wordRange = isPremiumTier ? '300-400' : '150-200';

    const systemPrompt = BASE_SYSTEM_PROMPT + personalContext + historyContext +
      `\n\nInterpretation length target: ${wordRange} words.`;

    // Claude primary, Gemini fallback
    let rawContent: string;
    let modelUsed: string;
    try {
      const ai = await callAI(systemPrompt, transcript);
      rawContent = ai.text;
      modelUsed = ai.model;
    } catch (aiErr) {
      console.error('AI request failed:', (aiErr as Error).message);
      return new Response(
        JSON.stringify({ error: 'ai_service_unavailable' }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parse JSON response (handle possible markdown wrapping)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', rawContent?.slice(0, 500));
      return new Response(JSON.stringify({ error: 'ai_parse_error' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({
      journal_text: parsed.journal_text,
      title: parsed.title,
      interpretation: parsed.interpretation,
      symbols: parsed.symbols || [],
      mood: parsed.mood,
      image_prompt: parsed.image_prompt,
      model_used: modelUsed,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('interpret-dream error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
