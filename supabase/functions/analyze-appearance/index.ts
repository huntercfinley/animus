import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const APPEARANCE_PROMPT = `Analyze this photo of a person and provide a concise physical description suitable for use as an AI image generation prompt. Include:
- Apparent ethnicity/skin tone
- Hair color, length, and style
- Facial features (face shape, eyes, any distinguishing features)
- Approximate age range
- Build/body type if visible

Format as a single paragraph, 2-3 sentences max. Use neutral, descriptive language.
Example: "A young East Asian man in his late 20s with short black hair and a lean build. He has warm brown eyes, a defined jawline, and a friendly smile."

Do NOT include clothing, background, or accessories — only physical features that would be consistent across dream scenes.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
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

    // Check premium
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, ai_context')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'premium') {
      return new Response(JSON.stringify({ error: 'Premium feature' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { photo_urls } = await req.json();
    if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return new Response(JSON.stringify({ error: 'No photo_urls provided' }), { status: 400 });
    }

    // SSRF guard: photo_urls must point to OUR supabase storage bucket. An
    // attacker could otherwise pass http://169.254.169.254/ (cloud metadata),
    // internal services, or arbitrary hosts and have the edge function fetch
    // them server-side.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ALLOWED_PREFIX = `${SUPABASE_URL}/storage/v1/object/`;
    for (const url of photo_urls.slice(0, 3)) {
      if (typeof url !== 'string' || !url.startsWith(ALLOWED_PREFIX)) {
        return new Response(
          JSON.stringify({ error: 'invalid_photo_url', must_start_with: ALLOWED_PREFIX }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
    }

    // Rate limit: 5/day — users don't need to re-analyze their appearance
    // frequently. Premium only, but still worth bounding.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: rateErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_user_id: user.id,
      p_limit_key: 'analyze_appearance',
      p_max: 5,
    });
    if (rateErr) {
      if ((rateErr.message || '').includes('rate_limit_exceeded')) {
        return new Response(
          JSON.stringify({ error: 'rate_limit_exceeded', daily_max: 5 }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
      throw rateErr;
    }

    // Download photos and convert to base64 for Gemini Vision. Cap each
    // response body at 10MB so a malicious URL can't blow memory.
    const MAX_BYTES = 10 * 1024 * 1024;
    const imageParts = [];
    for (const url of photo_urls.slice(0, 3)) {
      const imgResponse = await fetch(url);
      const imgBuffer = await imgResponse.arrayBuffer();
      if (imgBuffer.byteLength > MAX_BYTES) {
        return new Response(
          JSON.stringify({ error: 'photo_too_large', max_bytes: MAX_BYTES }),
          { status: 413, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      imageParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64,
        },
      });
    }

    // Call Gemini Flash Vision to analyze appearance
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              ...imageParts,
              { text: APPEARANCE_PROMPT },
            ],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Vision failed: ${errText}`);
    }

    const result = await response.json();
    const description = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!description) throw new Error('No description returned');

    // Store appearance description and photo URLs in profile
    const updatedContext = {
      ...(profile?.ai_context || {}),
      appearance: description.trim(),
      appearance_photos: photo_urls.slice(0, 3),
      appearance_updated: new Date().toISOString(),
    };

    await supabase
      .from('profiles')
      .update({ ai_context: updatedContext })
      .eq('id', user.id);

    return new Response(JSON.stringify({
      appearance: description.trim(),
      photos_stored: photo_urls.length,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    console.error('analyze-appearance error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }
});
