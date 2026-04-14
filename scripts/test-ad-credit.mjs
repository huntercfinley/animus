// Verify lumen-ad-credit caps grants at 3 per day. Reads existing ad_credits
// row first so the test doesn't fail if Carl already watched ads today.
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
const { data: a, error: e1 } = await c.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
if (e1) { console.error(e1); process.exit(1); }

// Read starting state — ad_credits is RLS'd to the user so this is fine.
const today = new Date().toISOString().slice(0, 10);
const { data: existing } = await c.from('ad_credits').select('*').eq('user_id', a.user.id).eq('day', today).maybeSingle();
const startGranted = existing?.granted || 0;
console.log(`Starting state for ${today}: granted=${startGranted}, consumed=${existing?.consumed || 0}`);

const CAP = 3;
const callsToFire = (CAP - startGranted) + 2; // enough to push past the cap
console.log(`Firing ${callsToFire} ad-credit calls (expected: ${Math.max(0, CAP - startGranted)} new grants, then capped)`);

const results = [];
for (let i = 0; i < callsToFire; i++) {
  const r = await c.functions.invoke('lumen-ad-credit', { body: {} });
  if (r.error) { console.error(`call ${i}:`, r.error); process.exit(1); }
  results.push(r.data);
  console.log(`  call ${i + 1}: ${JSON.stringify(r.data)}`);
}

// Verify final state
const { data: final } = await c.from('ad_credits').select('*').eq('user_id', a.user.id).eq('day', today).single();
console.log(`\nFinal ad_credits row: granted=${final.granted}, consumed=${final.consumed}`);

let pass = true;
if (final.granted !== CAP) {
  console.log(`FAIL: expected granted=${CAP}, got ${final.granted}`);
  pass = false;
}
// The last call should report 0 remaining (or whatever the cap math says).
const last = results[results.length - 1];
const expectedRemaining = CAP - final.consumed;
if (last.credits_remaining_today !== expectedRemaining) {
  console.log(`FAIL: expected last credits_remaining_today=${expectedRemaining}, got ${last.credits_remaining_today}`);
  pass = false;
}

console.log(pass ? '\nPASS — ad credit cap enforced at 3/day' : '\nFAIL');
process.exit(pass ? 0 : 1);
