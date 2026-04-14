// SECURITY PROBE — verify whether a user can self-promote to premium via RLS.
// If this returns "after: premium", we have a launch-blocking hole.
// Always reverts Carl back to free at the end.
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
const { data: before } = await c.from('profiles').select('subscription_tier').eq('id', a.user.id).single();
console.log('before:', before.subscription_tier);
const { error } = await c.from('profiles').update({ subscription_tier: 'premium' }).eq('id', a.user.id);
console.log('update error:', error?.message ?? '(none)');
const { data: after } = await c.from('profiles').select('subscription_tier').eq('id', a.user.id).single();
console.log('after:', after.subscription_tier);
if (after.subscription_tier === 'premium') {
  await c.from('profiles').update({ subscription_tier: 'free' }).eq('id', a.user.id);
  console.log('\n*** SECURITY HOLE: user can self-promote to premium via RLS ***');
  console.log('*** Reverted Carl back to free. ***');
  process.exit(2);
}
console.log('\nOK — RLS blocks tier self-promotion');
