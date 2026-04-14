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
const c = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const { data: a } = await c.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
const { data: prof } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
const { data: ledger } = await c.from('lumen_transactions').select('type, amount, balance_after, created_at').order('created_at', { ascending: true });
const sum = ledger.reduce((s, r) => s + r.amount, 0);
console.log(`balance: ${prof.lumen_balance}`);
console.log(`ledger rows: ${ledger.length}, sum: ${sum}`);
console.log('\nLast 15 rows:');
for (const r of ledger.slice(-15)) {
  console.log(`  ${r.created_at.slice(0, 19)}  ${r.type.padEnd(20)} ${String(r.amount).padStart(5)}  →  ${r.balance_after}`);
}
