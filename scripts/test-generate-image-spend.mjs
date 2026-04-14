// Verify generate-image deducts Lumen server-side (was client-side, which let
// a tampered client burn Imagen credit for free). On a successful call the
// balance must drop by exactly 20. Free Carl only — premium path is unmetered.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const line of readFileSync('./.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const home = {};
for (const line of readFileSync(process.env.USERPROFILE + '/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) home[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const c = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: a } = await c.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });

const { data: prof0 } = await c.from('profiles').select('lumen_balance, subscription_tier').eq('id', a.user.id).single();
console.log(`before: balance=${prof0.lumen_balance} tier=${prof0.subscription_tier}`);

if (prof0.subscription_tier === 'premium') {
  console.log('SKIP — Carl is premium, path is unmetered');
  process.exit(0);
}
if (prof0.lumen_balance < 20) {
  console.log('SKIP — Carl is under 20 Lumen, cannot afford a test generation');
  process.exit(0);
}

// Fire the edge function directly (no auto-flow side effects).
const r = await c.functions.invoke('generate-image', {
  body: {
    image_prompt: 'a spiral staircase of glowing moths climbing into a starlit sky',
    style_prefix: 'surreal oil painting,',
    dream_id: null,
  },
});
if (r.error) {
  console.error('generate-image error:', r.error);
  // Try to surface the body
  try { console.error('body:', await r.error.context.text()); } catch {}
  process.exit(1);
}
console.log('image_url:', r.data?.image_url?.slice(0, 80), '...');
console.log('model_used:', r.data?.model_used);

const { data: prof1 } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
const delta = prof1.lumen_balance - prof0.lumen_balance;
console.log(`after:  balance=${prof1.lumen_balance}  delta=${delta}`);

// Ledger row must exist for this spend
const { data: rows } = await c.from('lumen_transactions')
  .select('id, type, amount, created_at')
  .eq('user_id', a.user.id)
  .eq('type', 'spend_image_gen')
  .order('created_at', { ascending: false })
  .limit(1);
const latest = rows?.[0];
console.log('latest spend_image_gen ledger row:', latest ? `${latest.amount} at ${latest.created_at}` : 'NONE');

const pass = delta === -20 && latest?.amount === -20;
console.log(pass ? '\nPASS — generate-image deducted 20 Lumen server-side' : '\nFAIL');
process.exit(pass ? 0 : 1);
