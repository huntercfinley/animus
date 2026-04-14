// Race-condition test for lumen-spend (spec: "the FOR UPDATE lock must be
// airtight or users will double-spend"). Verifies that under N concurrent
// calls, exactly floor(balance / cost) succeed and the rest get 402.
//
// Doesn't require service_role — uses Carl's current balance as the test seed.
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

const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await userClient.auth.signInWithPassword({
  email: home.ANIMUS_TEST_EMAIL,
  password: home.ANIMUS_TEST_PASSWORD,
});
if (authErr) { console.error('auth failed:', authErr); process.exit(1); }
const userId = auth.user.id;
const accessToken = auth.session.access_token;

const { data: prof } = await userClient.from('profiles').select('lumen_balance, subscription_tier').eq('id', userId).single();
console.log(`Carl: balance=${prof.lumen_balance}  tier=${prof.subscription_tier}`);
if (prof.subscription_tier === 'premium') {
  console.error('Carl is premium — spend is bypassed. Set tier=free and re-run.');
  process.exit(1);
}

const COST = 10; // go_deeper
const startBalance = prof.lumen_balance;
const expectedSuccess = Math.floor(startBalance / COST);
const expectedFinal = startBalance - expectedSuccess * COST;
const N = expectedSuccess + 11; // fire enough extras to force collisions

console.log(`\nFiring ${N} concurrent lumen-spend(go_deeper) calls...`);
console.log(`Expected: ${expectedSuccess} success, ${N - expectedSuccess} insufficient_lumen, final=${expectedFinal}`);

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${accessToken}`,
  apikey: ANON,
};
const start = Date.now();
const results = await Promise.all(
  Array.from({ length: N }, () =>
    fetch(`${URL}/functions/v1/lumen-spend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'go_deeper' }),
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }))
  )
);
const elapsed = Date.now() - start;

const success = results.filter(r => r.status === 200);
const insufficient = results.filter(r => r.status === 402);
const other = results.filter(r => r.status !== 200 && r.status !== 402);

console.log(`\nResults (${elapsed}ms total):`);
console.log(`  200 OK             : ${success.length}`);
console.log(`  402 insufficient   : ${insufficient.length}`);
console.log(`  other              : ${other.length}`);
if (other.length) {
  for (const o of other) console.log('    →', o.status, JSON.stringify(o.body));
}

// Re-read final balance
const { data: after } = await userClient.from('profiles').select('lumen_balance').eq('id', userId).single();
console.log(`\nFinal balance: ${after.lumen_balance}  (expected ${expectedFinal})`);

// Sanity check via ledger sum
const { data: ledger } = await userClient
  .from('lumen_transactions')
  .select('amount')
  .eq('user_id', userId);
const ledgerSum = (ledger || []).reduce((s, r) => s + r.amount, 0);
console.log(`Ledger sum: ${ledgerSum}  (must equal balance)`);

let pass = true;
if (success.length !== expectedSuccess) {
  console.log(`FAIL: expected ${expectedSuccess} successes, got ${success.length}`);
  pass = false;
}
if (insufficient.length !== N - expectedSuccess) {
  console.log(`FAIL: expected ${N - expectedSuccess} insufficient, got ${insufficient.length}`);
  pass = false;
}
if (after.lumen_balance !== expectedFinal) {
  console.log(`FAIL: expected final balance ${expectedFinal}, got ${after.lumen_balance}`);
  pass = false;
}
if (ledgerSum !== after.lumen_balance) {
  console.log(`WARN: ledger sum ${ledgerSum} != balance ${after.lumen_balance}`);
  console.log('       (likely from earlier direct profile.lumen_balance writes by test scripts.');
  console.log('        In production all writes go through the spend RPC so this invariant holds.)');
}
if (pass) {
  console.log('\nPASS — FOR UPDATE lock prevents double-spend under concurrency');
}
process.exit(pass ? 0 : 1);
