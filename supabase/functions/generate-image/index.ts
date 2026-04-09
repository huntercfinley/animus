import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Monthly image limits
const MONTHLY_LIMITS = { free: 10, premium: 30 };

// --- Image generation by tier ---
// Free → Imagen 4 Fast ($0.02/image), Premium → Imagen 4 Standard ($0.04/image)

async function generateWithImagen(prompt: string, model: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '3:4',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${model} failed: ${errText}`);
  }

  const result = await response.json();
  const image = result.predictions?.[0]?.bytesBase64Encoded;
  if (!image) throw new Error(`No image in ${model} response`);
  return image;
}

// Check monthly image generation count
async function getMonthlyImageCount(supabase: any, userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from('usage_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('limit_type', 'image_generation')
    .gte('period_date', monthStart.split('T')[0])
    .maybeSingle();

  return data?.count || 0;
}

// Increment monthly image generation count
async function incrementMonthlyImageCount(supabase: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = today.substring(0, 7) + '-01'; // YYYY-MM-01

  const { data: existing } = await supabase
    .from('usage_limits')
    .select('id, count')
    .eq('user_id', userId)
    .eq('limit_type', 'image_generation')
    .eq('period_date', monthKey)
    .maybeSingle();

  if (existing) {
    await supabase.from('usage_limits')
      .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('usage_limits').insert({
      user_id: userId,
      dream_id: null,
      limit_type: 'image_generation',
      count: 1,
      period_date: monthKey,
    });
  }
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

    // Check subscription tier and appearance data
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, ai_context')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_tier === 'premium';
    const monthlyLimit = isPremium ? MONTHLY_LIMITS.premium : MONTHLY_LIMITS.free;
    const appearance = isPremium ? profile?.ai_context?.appearance : null;

    // Check monthly limit
    const currentCount = await getMonthlyImageCount(supabase, user.id);
    if (currentCount >= monthlyLimit) {
      return new Response(JSON.stringify({
        error: 'Monthly image limit reached',
        limit: monthlyLimit,
        used: currentCount,
        upgrade: !isPremium,
      }), { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // Inject user appearance for premium users who have set it up
    const appearanceClause = appearance
      ? `The main figure/dreamer in this scene is: ${appearance}. `
      : '';
    const fullPrompt = `${appearanceClause}${style_prefix || ''} ${image_prompt}. Dreamlike, evocative, no text or words in the image.`;

    // Free → Imagen 4 Fast ($0.02), Premium → Imagen 4 Standard ($0.04)
    let imageBase64: string;
    let modelUsed: string;

    if (isPremium) {
      imageBase64 = await generateWithImagen(fullPrompt, 'imagen-4.0-generate-001');
      modelUsed = 'imagen-4.0-standard';
    } else {
      imageBase64 = await generateWithImagen(fullPrompt, 'imagen-4.0-fast-generate-001');
      modelUsed = 'imagen-4.0-fast';
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

    // Increment monthly usage
    await incrementMonthlyImageCount(supabase, user.id);

    return new Response(JSON.stringify({
      image_url: publicUrl,
      model_used: modelUsed,
      show_ad: !isPremium,
      images_remaining: monthlyLimit - currentCount - 1,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
