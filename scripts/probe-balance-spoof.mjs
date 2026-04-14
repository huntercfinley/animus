// SECURITY PROBE — verify whether a user can self-credit Lumen via RLS.
// Always reverts Carl back to original balance.
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
const { data: before } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
console.log('before:', before.lumen_balance);
const target = before.lumen_balance + 99999;
const { error } = await c.from('profiles').update({ lumen_balance: target }).eq('id', a.user.id);
console.log('update error:', error?.message ?? '(none)');
const { data: after } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
console.log('after:', after.lumen_balance);
if (after.lumen_balance !== before.lumen_balance) {
  await c.from('profiles').update({ lumen_balance: before.lumen_balance }).eq('id', a.user.id);
  console.log('\n*** SECURITY HOLE: user can self-credit lumen_balance via RLS ***');
  console.log('*** Reverted. ***');
  process.exit(2);
}
console.log('\nOK — RLS blocks lumen_balance self-credit');
