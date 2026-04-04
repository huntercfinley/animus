import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;

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

    // Download photos and convert to base64 for Gemini Vision
    const imageParts = [];
    for (const url of photo_urls.slice(0, 3)) {
      const imgResponse = await fetch(url);
      const imgBuffer = await imgResponse.arrayBuffer();
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
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
