// Verify the three edge functions we just hardened deduct Lumen server-side:
//   - go-deeper          (10 Lumen, spend_go_deeper)
//   - dream-insights     (25 Lumen, spend_insights)
//   - dream-connection   (15 Lumen, spend_connection)
//
// Each is tested end-to-end: sign in as Carl, snapshot balance, call the
// edge function, confirm the balance dropped by exactly the expected cost
// and that a matching ledger row exists.
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
const uid = a.user.id;

async function balance() {
  const { data } = await c.from('profiles').select('lumen_balance').eq('id', uid).single();
  return data.lumen_balance;
}

async function latestLedger(type) {
  const { data } = await c.from('lumen_transactions')
    .select('amount, created_at')
    .eq('user_id', uid)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0];
}

let allPassed = true;
function check(label, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) allPassed = false;
}

// Create two throwaway dreams for the test run and clean them up at the end.
const createdDreamIds = [];
async function createDream(title, text) {
  const { data, error } = await c.from('dreams').insert({
    user_id: uid,
    title,
    raw_transcript: text,
    journal_text: text,
    interpretation: 'A test interpretation — probe for the server-side spend verification.',
  }).select().single();
  if (error) { console.error('dream insert failed:', error); process.exit(1); }
  createdDreamIds.push(data.id);
  return data.id;
}

const dreamId1 = await createDream('Test: spiral stairs', 'I climbed a spiral of moths into the sky.');
const dreamId2 = await createDream('Test: drowning room', 'The room filled with water but I could breathe.');

// ---------- go-deeper ----------
{
  const b0 = await balance();
  const r = await c.functions.invoke('go-deeper', {
    body: { dream_id: dreamId1, message: 'What does the spiral mean?' },
  });
  if (r.error) { console.error('go-deeper error:', r.error); try { console.error('body:', await r.error.context.text()); } catch {} process.exit(1); }
  const b1 = await balance();
  const led = await latestLedger('spend_go_deeper');
  check('go-deeper deducted 10 Lumen', b1 - b0 === -10, `(${b0} → ${b1})`);
  check('go-deeper ledger row amount=-10', led?.amount === -10);
  // Cleanup: delete the 2 conversation rows we just created
  await c.from('dream_conversations').delete().eq('dream_id', dreamId1);
}

// ---------- dream-insights ----------
const b2 = await balance();
const ri = await c.functions.invoke('dream-insights', { body: { period_type: 'weekly' } });
if (ri.error) {
  // Might legitimately return "No dreams in this period" — that's a 400 before spend.
  try {
    const body = await ri.error.context.json();
    if (body.error === 'No dreams in this period') {
      console.log('SKIP dream-insights — no dreams in last 7 days (rejected before spend)');
    } else {
      console.error('dream-insights error:', body);
      process.exit(1);
    }
  } catch {
    console.error('dream-insights error:', ri.error);
    process.exit(1);
  }
} else {
  const b3 = await balance();
  const led = await latestLedger('spend_insights');
  check('dream-insights deducted 25 Lumen', b3 - b2 === -25, `(${b2} → ${b3})`);
  check('dream-insights ledger row amount=-25', led?.amount === -25);
  // Cleanup the generated pattern_report so it doesn't pile up
  if (ri.data?.id) await c.from('pattern_reports').delete().eq('id', ri.data.id);
}

// ---------- dream-connection ----------
{
  const b4 = await balance();
  const rc = await c.functions.invoke('dream-connection', {
    body: { dream_a_id: dreamId1, dream_b_id: dreamId2 },
  });
  if (rc.error) { console.error('dream-connection error:', rc.error); try { console.error(await rc.error.context.text()); } catch {} process.exit(1); }
  const b5 = await balance();
  const led = await latestLedger('spend_connection');
  check('dream-connection deducted 15 Lumen', b5 - b4 === -15, `(${b4} → ${b5})`);
  check('dream-connection ledger row amount=-15', led?.amount === -15);
  if (rc.data?.id) await c.from('dream_connections').delete().eq('id', rc.data.id);
}

// Cleanup the test dreams
for (const id of createdDreamIds) {
  await c.from('dreams').delete().eq('id', id);
}

console.log(allPassed ? '\nALL PASS — all three functions now deduct server-side' : '\nSOME FAILED');
process.exit(allPassed ? 0 : 1);
