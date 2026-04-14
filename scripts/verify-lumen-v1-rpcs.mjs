// Verify the new Lumen v1.0 RPCs from migration 20260414000007.
// Signs in as Carl, calls each RPC, prints results.
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

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: home.ANIMUS_TEST_EMAIL,
  password: home.ANIMUS_TEST_PASSWORD,
});
if (authErr) { console.error('auth failed:', authErr); process.exit(1); }
const userId = auth.user.id;
console.log('Signed in as Carl:', userId);

console.log('\n--- ad_credits table query (own row) ---');
const { data: adRow, error: adErr } = await supabase.from('ad_credits').select('*').eq('user_id', userId);
console.log('rows:', adRow, 'error:', adErr?.message);

console.log('\n--- lumen_ad_credit (grant) ---');
const { data: g1, error: e1 } = await supabase.rpc('lumen_ad_credit', { p_user_id: userId });
console.log(g1, e1?.message);

console.log('\n--- consume_ad_credit ---');
const { data: c1, error: ce1 } = await supabase.rpc('consume_ad_credit', { p_user_id: userId });
console.log(c1, ce1?.message);

console.log('\n--- lumen_monthly_grant (Carl is not premium → expect not_premium) ---');
const { data: mg, error: mgErr } = await supabase.rpc('lumen_monthly_grant', { p_user_id: userId });
console.log(mg, mgErr?.message);

console.log('\n--- lumen_purchase_atomic (fake transaction) ---');
const txid = 'verify-' + Date.now();
const { data: pur, error: purErr } = await supabase.rpc('lumen_purchase_atomic', {
  p_user_id: userId,
  p_amount: 50,
  p_type: 'purchase_small',
  p_transaction_id: txid,
  p_metadata: { source: 'verify-script' },
});
console.log(pur, purErr?.message);

console.log('\n--- lumen_purchase_atomic (replay same txid → should be duplicate=true) ---');
const { data: pur2, error: pur2Err } = await supabase.rpc('lumen_purchase_atomic', {
  p_user_id: userId,
  p_amount: 50,
  p_type: 'purchase_small',
  p_transaction_id: txid,
  p_metadata: {},
});
console.log(pur2, pur2Err?.message);

console.log('\n--- profile balance after verification ---');
const { data: prof } = await supabase.from('profiles').select('lumen_balance').eq('id', userId).single();
console.log(prof);
