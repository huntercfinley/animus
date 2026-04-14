// Verify lumen-monthly-grant rejects non-premium callers and returns the
// expected error shape. Carl is on the free tier, so this only covers the
// rejection path — the happy-path grant requires a premium account.
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

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const c = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: a, error: e1 } = await c.auth.signInWithPassword({
  email: home.ANIMUS_TEST_EMAIL,
  password: home.ANIMUS_TEST_PASSWORD,
});
if (e1) { console.error(e1); process.exit(1); }

const { data: prof } = await c.from('profiles').select('subscription_tier, lumen_balance').eq('id', a.user.id).single();
console.log(`Carl: tier=${prof.subscription_tier}  balance=${prof.lumen_balance}`);

// Hit the edge function directly so we can read the HTTP status code.
const r = await fetch(`${URL}/functions/v1/lumen-monthly-grant`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${a.session.access_token}`,
    apikey: ANON,
  },
  body: JSON.stringify({}),
});
const body = await r.json();
console.log(`status: ${r.status}  body: ${JSON.stringify(body)}`);

let pass = true;
if (prof.subscription_tier === 'premium') {
  if (r.status !== 200) { console.log('FAIL: premium user got non-200'); pass = false; }
} else {
  if (r.status !== 403) { console.log(`FAIL: expected 403 for non-premium, got ${r.status}`); pass = false; }
  if (body.error !== 'not_premium') { console.log(`FAIL: expected error=not_premium, got ${body.error}`); pass = false; }
}

const { data: after } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
if (after.lumen_balance !== prof.lumen_balance) {
  console.log(`FAIL: balance changed for non-premium: ${prof.lumen_balance} → ${after.lumen_balance}`);
  pass = false;
}

console.log(pass ? '\nPASS' : '\nFAIL');
process.exit(pass ? 0 : 1);
