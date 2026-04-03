import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), { status: 400 });
    }

    // Fetch user context in parallel
    const [profileRes, worldRes, symbolsRes] = await Promise.all([
      supabase.from('profiles').select('ai_context, subscription_tier').eq('id', user.id).single(),
      supabase.from('world_entries').select('category, name, description, relationship').eq('user_id', user.id),
      supabase.from('dream_symbols').select('symbol, archetype, sentiment, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    const profile = profileRes.data;
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

    const isPremium = profile?.subscription_tier === 'premium';
    const wordRange = isPremium ? '300-400' : '150-200';

    const systemPrompt = BASE_SYSTEM_PROMPT + personalContext + historyContext +
      `\n\nInterpretation length target: ${wordRange} words.`;

    // Call Claude Sonnet 4.6
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: 'AI request failed', details: errText }), { status: 502 });
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.content[0].text;

    // Parse JSON response (handle possible markdown wrapping)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: rawContent }), { status: 502 });
    }

    return new Response(JSON.stringify({
      journal_text: parsed.journal_text,
      title: parsed.title,
      interpretation: parsed.interpretation,
      symbols: parsed.symbols || [],
      mood: parsed.mood,
      image_prompt: parsed.image_prompt,
      model_used: 'claude-sonnet-4-6',
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
