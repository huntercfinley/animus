// Verify lumen-purchase dedupes by transaction_id. A user double-tapping the
// Buy button (or the same RC purchase event delivered twice) must credit
// exactly once.
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

const { data: prof0 } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
const start = prof0.lumen_balance;
const txId = `idempotency-test-${Date.now()}`;
const body = { pack: 'small', transaction_id: txId, product_id: 'animus_lumen_small' };

// Fire the same purchase 5 times in parallel — only the first should credit.
const results = await Promise.all(
  Array.from({ length: 5 }, () => c.functions.invoke('lumen-purchase', { body })),
);
for (let i = 0; i < results.length; i++) {
  console.log(`call ${i + 1}: ${JSON.stringify(results[i].data)}`);
}

const { data: profEnd } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
console.log(`\nbalance: ${start} → ${profEnd.lumen_balance}  (delta=${profEnd.lumen_balance - start})`);

const credited = profEnd.lumen_balance - start;
const ok = credited === 50; // small pack = 50

// Count ledger rows for this transaction_id
const { data: rows } = await c.from('lumen_transactions')
  .select('id, type, amount')
  .eq('user_id', a.user.id)
  .filter('metadata->>transaction_id', 'eq', txId);
console.log(`ledger rows for tx_id: ${rows?.length}  (must be exactly 1)`);

const pass = ok && rows?.length === 1;
console.log(pass ? '\nPASS — purchase is idempotent under double-fire' : '\nFAIL');
process.exit(pass ? 0 : 1);
