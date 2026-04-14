import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

// Pack table — mirrors docs/lumen-economy-spec.md.
// product_id matches the RevenueCat / App Store Connect identifier.
const PACKS: Record<string, { amount: number; type: string; product_id: string }> = {
  small:  { amount: 50,  type: 'purchase_small',  product_id: 'animus_lumen_small' },
  medium: { amount: 150, type: 'purchase_medium', product_id: 'animus_lumen_medium' },
  large:  { amount: 350, type: 'purchase_large',  product_id: 'animus_lumen_large' },
  mega:   { amount: 800, type: 'purchase_mega',   product_id: 'animus_lumen_mega' },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const packKey = body?.pack as string | undefined;
    const transactionId = body?.transaction_id as string | undefined;
    const productId = body?.product_id as string | undefined;
    const metadata = (body?.metadata && typeof body.metadata === 'object') ? body.metadata : {};

    const pack = packKey ? PACKS[packKey] : undefined;
    if (!pack) {
      return new Response(
        JSON.stringify({ error: 'unknown_pack', valid: Object.keys(PACKS) }),
        { status: 400, headers: CORS },
      );
    }
    if (!transactionId || typeof transactionId !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_transaction_id' }), { status: 400, headers: CORS });
    }
    if (productId && productId !== pack.product_id) {
      return new Response(
        JSON.stringify({ error: 'product_id_mismatch', expected: pack.product_id, got: productId }),
        { status: 400, headers: CORS },
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await admin.rpc('lumen_purchase_atomic', {
      p_user_id: user.id,
      p_amount: pack.amount,
      p_type: pack.type,
      p_transaction_id: transactionId,
      p_metadata: { ...metadata, pack: packKey, product_id: pack.product_id },
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        new_balance: row?.new_balance,
        lumen_added: row?.lumen_added,
        duplicate: row?.duplicate,
      }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: CORS },
    );
  }
});
