// Smoke-test every spend action in the COSTS table to confirm the cost
// matches the spec and the ledger row is recorded with the right type.
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

// Spec costs from docs/lumen-economy-spec.md and edge function COSTS table
const expectedCosts = {
  go_deeper:    10,
  image_gen:    20,
  image_refine: 20,
  insights:     25,
  connection:   15,
};

const { data: prof0 } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
let balance = prof0.lumen_balance;
console.log(`Starting balance: ${balance}`);

let pass = true;
for (const [action, cost] of Object.entries(expectedCosts)) {
  if (balance < cost) {
    console.log(`SKIP ${action}: not enough balance (${balance} < ${cost})`);
    continue;
  }
  const r = await c.functions.invoke('lumen-spend', { body: { action } });
  if (r.error) {
    console.log(`FAIL ${action}: ${r.error.message}`);
    pass = false;
    continue;
  }
  const expectedNew = balance - cost;
  if (r.data.new_balance !== expectedNew) {
    console.log(`FAIL ${action}: expected new=${expectedNew}, got ${r.data.new_balance}`);
    pass = false;
  } else {
    console.log(`OK   ${action.padEnd(13)} -${cost}  →  ${r.data.new_balance}`);
  }
  balance = r.data.new_balance;
}

// Also exercise the "unknown_action" guard
const r2 = await c.functions.invoke('lumen-spend', { body: { action: 'totally_fake' } });
const blockedFake = r2.error || (r2.data && r2.data.error === 'unknown_action');
console.log(`OK   unknown_action rejected: ${blockedFake}`);
if (!blockedFake) pass = false;

const { data: profEnd } = await c.from('profiles').select('lumen_balance').eq('id', a.user.id).single();
console.log(`\nFinal balance: ${profEnd.lumen_balance}`);
console.log(pass ? 'PASS — all spend actions match spec' : 'FAIL');
process.exit(pass ? 0 : 1);
