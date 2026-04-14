// Verify Carl can read his own lumen_transactions via RLS.
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

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: home.ANIMUS_TEST_EMAIL,
  password: home.ANIMUS_TEST_PASSWORD,
});
if (signInErr) { console.error(signInErr); process.exit(1); }

const { data, error } = await supabase
  .from('lumen_transactions')
  .select('id, type, amount, balance_after, created_at')
  .order('created_at', { ascending: false })
  .limit(10);
if (error) { console.error(error); process.exit(1); }

console.log(`\nCarl has ${data.length} recent transactions:`);
for (const tx of data) {
  console.log(`  ${tx.created_at.slice(0, 19)}  ${tx.type.padEnd(20)} ${String(tx.amount).padStart(5)}  →  ${tx.balance_after}`);
}
