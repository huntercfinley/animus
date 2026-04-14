// Verify the new Lumen v1.0 edge functions: signs in as Carl, calls each.
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
const supabase = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: auth, error } = await supabase.auth.signInWithPassword({
  email: home.ANIMUS_TEST_EMAIL,
  password: home.ANIMUS_TEST_PASSWORD,
});
if (error) { console.error('auth failed:', error); process.exit(1); }
const jwt = auth.session.access_token;
console.log('Signed in:', auth.user.id);

async function callFn(name, body) {
  const r = await fetch(`${URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.text() };
}

console.log('\n--- lumen-monthly-grant (Carl is not premium) ---');
console.log(await callFn('lumen-monthly-grant', {}));

console.log('\n--- lumen-ad-credit (grant 1) ---');
console.log(await callFn('lumen-ad-credit', {}));

console.log('\n--- lumen-spend with use_ad_credit (consume) ---');
console.log(await callFn('lumen-spend', { action: 'go_deeper', use_ad_credit: true }));

console.log('\n--- lumen-spend with use_ad_credit on insights (should reject) ---');
console.log(await callFn('lumen-spend', { action: 'insights', use_ad_credit: true }));

console.log('\n--- lumen-purchase (small pack, fake txid) ---');
const txid = 'verify-fn-' + Date.now();
console.log(await callFn('lumen-purchase', { pack: 'small', transaction_id: txid, product_id: 'animus_lumen_small' }));

console.log('\n--- lumen-purchase replay same txid ---');
console.log(await callFn('lumen-purchase', { pack: 'small', transaction_id: txid }));

console.log('\n--- lumen-purchase wrong pack ---');
console.log(await callFn('lumen-purchase', { pack: 'jumbo', transaction_id: 'x' }));

console.log('\n--- profile balance ---');
const { data: prof } = await supabase.from('profiles').select('lumen_balance').eq('id', auth.user.id).single();
console.log(prof);
