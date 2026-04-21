import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
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

    // Verify the transaction with RevenueCat before crediting Lumen
    const RC_API_KEY = Deno.env.get('REVENUECAT_API_KEY');
    if (!RC_API_KEY) {
      console.error('REVENUECAT_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'purchase_verification_unavailable' }), { status: 503, headers: CORS });
    }

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${user.id}`,
      { headers: { 'Authorization': `Bearer ${RC_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    if (!rcRes.ok) {
      console.error('RevenueCat verification failed:', rcRes.status);
      return new Response(JSON.stringify({ error: 'purchase_verification_failed' }), { status: 502, headers: CORS });
    }

    const rcData = await rcRes.json();
    // Check if the transaction exists in the subscriber's non-subscription purchases
    const allTransactions = rcData?.subscriber?.non_subscriptions || {};
    const allTxIds = Object.values(allTransactions).flat().map((t: any) => t.store_transaction_id);
    if (!allTxIds.includes(transactionId)) {
      return new Response(JSON.stringify({ error: 'transaction_not_found' }), { status: 403, headers: CORS });
    }

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
    console.error('lumen-purchase error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: CORS },
    );
  }
});
