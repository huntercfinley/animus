import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

// Server-side mirror of profiles.subscription_tier. The client cannot update
// that column anymore (column-level grant revoked in migration 19), so this
// function is the only legitimate write path. We don't trust the client's
// claim of premium — we hit the RevenueCat REST API ourselves with the user's
// auth.uid (which is the RevenueCat app_user_id, set via Purchases.logIn).
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

    const rcKey = Deno.env.get('REVENUECAT_REST_API_KEY');
    if (!rcKey) {
      return new Response(
        JSON.stringify({ error: 'revenuecat_not_configured' }),
        { status: 500, headers: CORS },
      );
    }

    // Ask RevenueCat for the source of truth on this user's entitlements.
    // RevenueCat creates the subscriber on first GET if it doesn't exist.
    const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
      headers: { Authorization: `Bearer ${rcKey}` },
    });
    if (!rcRes.ok) {
      const text = await rcRes.text();
      console.error('RevenueCat fetch failed:', rcRes.status, text.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'subscription_check_failed', status: rcRes.status }),
        { status: 502, headers: CORS },
      );
    }
    const rcBody = await rcRes.json();
    const entitlements = rcBody?.subscriber?.entitlements || {};
    const premiumEnt = entitlements['premium'];

    // RevenueCat marks an entitlement active by setting expires_date in the
    // future (or null for lifetime). Anything in the past = not premium.
    const nowMs = Date.now();
    const expiresMs = premiumEnt?.expires_date ? Date.parse(premiumEnt.expires_date) : null;
    const isPremium = !!premiumEnt && (expiresMs === null || expiresMs > nowMs);

    const newTier = isPremium ? 'premium' : 'free';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: updErr } = await admin
      .from('profiles')
      .update({ subscription_tier: newTier, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        is_premium: isPremium,
        subscription_tier: newTier,
        expires_at: premiumEnt?.expires_date ?? null,
      }),
      { headers: CORS },
    );
  } catch (err) {
    console.error('subscription-sync error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: CORS },
    );
  }
});
