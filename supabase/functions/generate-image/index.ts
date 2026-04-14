import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_AI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// --- Image generation by tier ---
// Free → Imagen 4 Fast ($0.02/image), Premium → Imagen 4 Standard ($0.04/image)

// Word replacements that keep dream meaning while avoiding Imagen content filters.
// Nudity + minors are the two hardest blocks; nudity alone is usually rewritten to
// "robed/cloaked", and any reference to a minor is generalized to "a figure".
const PROMPT_REPLACEMENTS: Array<[RegExp, string]> = [
  // Nudity → symbolic covering
  [/\b(completely |fully |totally )?(unclothed|naked|nude|bare|undressed|topless|stripped)\b/gi, 'cloaked in soft light'],
  [/\bnakedness\b/gi, 'vulnerability'],
  [/\bbare (body|skin|chest|flesh)\b/gi, 'luminous form'],
  // Minors → generic figures (Imagen hard-blocks any minor in non-trivial scenes)
  [/\b(teenagers?|teens?|adolescents?|children|kids?|child|kid|boys?|girls?|babies|baby|infants?|infant|minors?|youths?|schoolchildren)\b/gi, 'figures'],
  [/\byoung (man|woman|person|people)\b/gi, 'figure'],
  // Violence / gore → dream-softened
  [/\b(blood|bloody|bleeding|gore|wound|wounded|stabbing|stabbed|corpse|corpses|dead body|dead bodies)\b/gi, 'shadow'],
  [/\b(murder|murdered|killing|killed|slain)\b/gi, 'fading'],
  // Sexual → intimate/symbolic
  [/\b(sexual|erotic|intercourse|explicit)\b/gi, 'intimate'],
];

function sanitizePrompt(prompt: string): string {
  let result = prompt;
  for (const [pattern, replacement] of PROMPT_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Aggressive fallback: replace every person reference with abstract silhouettes
// and drop physical descriptors. Used when the sanitized prompt still fails.
function abstractifyPrompt(prompt: string): string {
  let result = sanitizePrompt(prompt);
  result = result.replace(
    /\b(a |the |one |two |three |several |many |crowds? of |groups? of )?(man|woman|men|women|person|people|figure|figures|dreamer|audience|crowd|viewer|viewers|stranger|strangers|he|she|they)\b/gi,
    'an ethereal silhouette',
  );
  // Strip explicit body / physical descriptors that can still trigger filters
  result = result.replace(/\b(body|bodies|skin|flesh|chest|breast|breasts|torso|thigh|thighs|buttocks|genitals?)\b/gi, 'form');
  return result;
}

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

// Try Imagen with sanitized prompt; on failure, rewrite abstractly and retry once.
async function generateWithFallback(rawPrompt: string, model: string): Promise<{ image: string; promptUsed: string }> {
  const sanitized = sanitizePrompt(rawPrompt);
  try {
    const image = await generateWithImagen(sanitized, model);
    return { image, promptUsed: sanitized };
  } catch (firstErr) {
    const abstract = abstractifyPrompt(rawPrompt);
    if (abstract === sanitized) throw firstErr; // nothing more we can do
    const image = await generateWithImagen(abstract, model);
    return { image, promptUsed: abstract };
  }
}

// Image generation cost in Lumen. Mirrors lumen-spend COSTS['image_gen'].
const IMAGE_GEN_COST = 20;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Track whether we already deducted so the catch block knows to refund.
  let deductedForUser: string | null = null;
  let deductedDreamId: string | null = null;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: CORS_HEADERS });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const { image_prompt, style_prefix, dream_id } = await req.json();
    if (!image_prompt || typeof image_prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'No image_prompt provided' }), { status: 400, headers: CORS_HEADERS });
    }
    // Caps on user-controlled prompt fields. Our own interpret-dream output is
    // typically ~1-2KB; 4KB is comfortable headroom. style_prefix is a short
    // art-style tag from the client picker ("impressionist oil painting,") so
    // 200 chars is plenty.
    if (image_prompt.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'image_prompt_too_long', max: 4000, got: image_prompt.length }),
        { status: 413, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }
    if (style_prefix && (typeof style_prefix !== 'string' || style_prefix.length > 200)) {
      return new Response(
        JSON.stringify({ error: 'style_prefix_too_long', max: 200 }),
        { status: 413, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    // Check subscription tier and appearance data; simultaneously verify
    // dream_id ownership (if provided) so the ledger + storage path cannot be
    // scoped to another user's dream.
    const [profileRes, dreamRes] = await Promise.all([
      supabase.from('profiles').select('subscription_tier, ai_context').eq('id', user.id).single(),
      dream_id
        ? supabase.from('dreams').select('id').eq('id', dream_id).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (dream_id && !dreamRes.data) {
      return new Response(
        JSON.stringify({ error: 'dream_not_found_or_not_owned' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    const profile = profileRes.data;
    const isPremium = profile?.subscription_tier === 'premium';
    const appearance = isPremium ? profile?.ai_context?.appearance : null;

    // Deduct Lumen BEFORE calling Imagen. Premium is unmetered per spec.
    // The client cannot be trusted to charge itself — a tampered build could
    // call this function directly and burn our Imagen budget for free. See
    // docs/lumen-economy-spec.md for the cost table.
    if (!isPremium) {
      const { error: spendErr } = await admin.rpc('lumen_spend_atomic', {
        p_user_id: user.id,
        p_amount: IMAGE_GEN_COST,
        p_type: 'spend_image_gen',
        p_dream_id: dream_id ?? null,
        p_exercise_id: null,
      });
      if (spendErr) {
        const msg = spendErr.message || '';
        if (msg.includes('insufficient_lumen')) {
          const { data: p } = await admin
            .from('profiles')
            .select('lumen_balance')
            .eq('id', user.id)
            .single();
          return new Response(
            JSON.stringify({
              error: 'insufficient_lumen',
              current_balance: p?.lumen_balance ?? 0,
              required: IMAGE_GEN_COST,
            }),
            { status: 402, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }
        throw spendErr;
      }
      deductedForUser = user.id;
      deductedDreamId = dream_id ?? null;
    }

    // Inject user appearance for premium users who have set it up
    const appearanceClause = appearance
      ? `The main figure/dreamer in this scene is: ${appearance}. `
      : '';
    const fullPrompt = `${appearanceClause}${style_prefix || ''} ${image_prompt}. Dreamlike, evocative, no text or words in the image.`;

    // Free → Imagen 4 Fast ($0.02), Premium → Imagen 4 Standard ($0.04)
    // generateWithFallback sanitizes the prompt, then abstracts and retries on failure.
    const model = isPremium ? 'imagen-4.0-generate-001' : 'imagen-4.0-fast-generate-001';
    const modelUsed = isPremium ? 'imagen-4.0-standard' : 'imagen-4.0-fast';
    const { image: imageBase64 } = await generateWithFallback(fullPrompt, model);

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
      throw new Error(`upload_failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('dream-images')
      .getPublicUrl(fileName);

    // Success — Lumen stays spent.
    return new Response(JSON.stringify({
      image_url: publicUrl,
      model_used: modelUsed,
      show_ad: !isPremium,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    // Refund the spend if Imagen or upload failed after we already deducted.
    if (deductedForUser) {
      const { error: refundErr } = await admin.rpc('lumen_refund_atomic', {
        p_user_id: deductedForUser,
        p_amount: IMAGE_GEN_COST,
        p_type: 'refund_image_gen',
        p_dream_id: deductedDreamId,
        p_exercise_id: null,
      });
      if (refundErr) {
        console.error('[generate-image] refund failed — user is down 20 Lumen', refundErr);
      }
    }
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }
});
