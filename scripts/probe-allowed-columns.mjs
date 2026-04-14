// Verify legitimate profile updates (display_name, onboarding_completed, etc.)
// still work after the column lockdown migration.
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

const { data: before } = await c.from('profiles').select('display_name, onboarding_completed, ai_context').eq('id', a.user.id).single();
console.log('before:', before);

const probe = `Carl ${Date.now()}`;
const { error: e1 } = await c.from('profiles').update({ display_name: probe }).eq('id', a.user.id);
console.log('display_name update:', e1?.message ?? 'OK');

const { error: e2 } = await c.from('profiles').update({ onboarding_completed: true }).eq('id', a.user.id);
console.log('onboarding_completed update:', e2?.message ?? 'OK');

const { error: e3 } = await c.from('profiles').update({ ai_context: { test: true } }).eq('id', a.user.id);
console.log('ai_context update:', e3?.message ?? 'OK');

// Restore original display_name
await c.from('profiles').update({ display_name: before.display_name, ai_context: before.ai_context }).eq('id', a.user.id);

const pass = !e1 && !e2 && !e3;
console.log(pass ? '\nPASS — allowed columns still writable' : '\nFAIL');
process.exit(pass ? 0 : 1);
