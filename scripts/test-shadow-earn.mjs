// Integration test for the lumen_earn_shadow RPC via the edge function.
// Verifies: 100-char minimum, +10 per earn, idempotency per exercise,
// and (optionally) the 3/day cap.
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
const userId = a.user.id;

const { data: prof } = await c.from('profiles').select('lumen_balance').eq('id', userId).single();
const startBalance = prof.lumen_balance;
console.log(`Starting balance: ${startBalance}`);

// Count today's shadow_earn rows so we know how much headroom is left under the 3/day cap.
const today = new Date().toISOString().slice(0, 10);
const { data: todayEarns } = await c
  .from('lumen_transactions')
  .select('id')
  .eq('user_id', userId)
  .eq('type', 'shadow_earn')
  .gte('created_at', `${today}T00:00:00Z`)
  .lt('created_at', `${today}T23:59:59Z`);
const earnsToday = todayEarns?.length || 0;
console.log(`Shadow earns today: ${earnsToday}/3`);

// 1. Create a shadow exercise with a 100+ char response.
const longResponse = 'I sat with the figure in my dream and listened. The shadow showed me an old fear about being unseen, and I let it speak instead of looking away.';
console.log(`Response length: ${longResponse.length} chars`);

const { data: ex, error: exErr } = await c.from('shadow_exercises').insert({
  user_id: userId,
  prompt: 'Test prompt: what does the shadow ask of you?',
  response: longResponse,
}).select().single();
if (exErr) { console.error('insert failed:', exErr); process.exit(1); }
console.log(`Created exercise ${ex.id.slice(0, 8)}...`);

// 2. Call the earn function.
console.log('\n[Test 1] First earn call');
const r1 = await c.functions.invoke('lumen-earn-shadow', { body: { exercise_id: ex.id } });
if (r1.error) { console.error('earn failed:', r1.error); process.exit(1); }
console.log(`  → ${JSON.stringify(r1.data)}`);

const expectedAfterFirst = earnsToday >= 3 ? startBalance : startBalance + 10;
const expectedEarnedFirst = earnsToday >= 3 ? 0 : 10;
let pass = true;
if (r1.data.earned !== expectedEarnedFirst) {
  console.log(`  FAIL: expected earned=${expectedEarnedFirst}, got ${r1.data.earned}`);
  pass = false;
}
if (r1.data.new_balance !== expectedAfterFirst) {
  console.log(`  FAIL: expected new_balance=${expectedAfterFirst}, got ${r1.data.new_balance}`);
  pass = false;
}

// 3. Call again with same exercise → should be idempotent.
console.log('\n[Test 2] Second call (same exercise → idempotent)');
const r2 = await c.functions.invoke('lumen-earn-shadow', { body: { exercise_id: ex.id } });
if (r2.error) { console.error('earn failed:', r2.error); process.exit(1); }
console.log(`  → ${JSON.stringify(r2.data)}`);
if (r2.data.earned !== 0) {
  console.log(`  FAIL: expected earned=0, got ${r2.data.earned}`);
  pass = false;
}
if (r2.data.new_balance !== expectedAfterFirst) {
  console.log(`  FAIL: balance shifted on idempotent call: ${r2.data.new_balance}`);
  pass = false;
}

// 4. Short-response rejection.
console.log('\n[Test 3] Short response rejection');
const { data: shortEx } = await c.from('shadow_exercises').insert({
  user_id: userId,
  prompt: 'Short test',
  response: 'too short',
}).select().single();
const r3 = await c.functions.invoke('lumen-earn-shadow', { body: { exercise_id: shortEx.id } });
console.log(`  → status=${r3.error ? 'error' : 'ok'}  data=${JSON.stringify(r3.data)}`);
if (r3.data?.earned !== 0 || r3.data?.reason !== 'response_too_short') {
  console.log(`  FAIL: expected earned=0 reason=response_too_short`);
  pass = false;
}

// Cleanup test rows so future runs start clean.
await c.from('shadow_exercises').delete().in('id', [ex.id, shortEx.id]);

const { data: finalProf } = await c.from('profiles').select('lumen_balance').eq('id', userId).single();
console.log(`\nFinal balance: ${finalProf.lumen_balance}  (started at ${startBalance})`);

if (pass) console.log('\nPASS — shadow earn behaves per spec');
else console.log('\nFAIL');
process.exit(pass ? 0 : 1);
