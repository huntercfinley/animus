// Verify subscription-sync edge function correctly mirrors RevenueCat
// entitlements into profiles.subscription_tier via the service-role write path.
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
console.log('tier before sync:', before.subscription_tier);

const r = await c.functions.invoke('subscription-sync', { body: {} });
console.log('sync result:', JSON.stringify(r.data));
if (r.error) { console.error('error:', r.error); process.exit(1); }

const { data: after } = await c.from('profiles').select('subscription_tier').eq('id', a.user.id).single();
console.log('tier after sync:', after.subscription_tier);

// Carl has no real RevenueCat purchases so he should be free.
const pass = after.subscription_tier === 'free' && r.data.is_premium === false;
console.log(pass ? '\nPASS — Carl correctly mirrored as free' : '\nFAIL');
process.exit(pass ? 0 : 1);
