import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// --- Image generation by tier ---

async function generateWithGeminiFlash(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          responseMimeType: 'image/png',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Flash failed: ${errText}`);
  }

  const result = await response.json();
  for (const part of result.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }
  throw new Error('No image in Gemini Flash response');
}

async function generateWithImagen4(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Imagen 4 Standard failed: ${errText}`);
  }

  const result = await response.json();
  const image = result.predictions?.[0]?.bytesBase64Encoded;
  if (!image) throw new Error('No image in Imagen 4 response');
  return image;
}

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

    const { image_prompt, style_prefix, dream_id } = await req.json();
    if (!image_prompt) {
      return new Response(JSON.stringify({ error: 'No image_prompt provided' }), { status: 400 });
    }

    // Check subscription tier to determine image quality
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_tier === 'premium';
    const fullPrompt = `${style_prefix || ''} ${image_prompt}. Dreamlike, evocative, no text or words in the image.`;

    // Free → Gemini Flash (free), Premium → Imagen 4 Standard ($0.04/image)
    let imageBase64: string;
    let modelUsed: string;

    if (isPremium) {
      imageBase64 = await generateWithImagen4(fullPrompt);
      modelUsed = 'imagen-4.0-standard';
    } else {
      imageBase64 = await generateWithGeminiFlash(fullPrompt);
      modelUsed = 'gemini-flash';
    }

    // Decode base64 and upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const fileName = `${user.id}/${dream_id || crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('dream-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Upload failed', details: uploadError.message }), { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('dream-images')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      image_url: publicUrl,
      model_used: modelUsed,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
