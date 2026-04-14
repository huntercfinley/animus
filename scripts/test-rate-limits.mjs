// Verify the daily rate limiters on interpret-dream + shadow-exercise.
// Calls each function once as Carl, then reads the daily_rate_limits counter.
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

// We can read daily_rate_limits with the anon session since the user owns rows
// matching auth.uid() — but there's no RLS policy on it. Use the RPC result instead:
// after each call, the server has incremented. Fetch with an admin read to verify.
// Actually we didn't add RLS so anon read works as long as we filter by user_id.

async function count(limitKey) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await c.from('daily_rate_limits')
    .select('count')
    .eq('user_id', uid)
    .eq('limit_key', limitKey)
    .eq('period_date', today)
    .maybeSingle();
  if (error) { console.error('read failed:', error.message); return null; }
  return data?.count ?? 0;
}

let allPassed = true;
function check(label, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) allPassed = false;
}

// ---------- interpret-dream ----------
{
  const before = await count('dream_interpret');
  const r = await c.functions.invoke('interpret-dream', {
    body: { transcript: 'I walked through a hallway of mirrors. Each one showed a different version of me.' },
  });
  if (r.error) { console.error('interpret-dream error:', r.error); try { console.error(await r.error.context.text()); } catch {} process.exit(1); }
  const after = await count('dream_interpret');
  check('interpret-dream increments dream_interpret counter', after === (before ?? 0) + 1, `(${before} → ${after})`);
  check('interpret-dream still returns a title', !!r.data?.title, `title="${r.data?.title}"`);
}

// ---------- shadow-exercise ----------
{
  const before = await count('shadow_exercise_gen');
  const r = await c.functions.invoke('shadow-exercise', {
    body: { symbols: [{ symbol: 'mirror' }] },
  });
  if (r.error) { console.error('shadow-exercise error:', r.error); try { console.error(await r.error.context.text()); } catch {} process.exit(1); }
  const after = await count('shadow_exercise_gen');
  check('shadow-exercise increments shadow_exercise_gen counter', after === (before ?? 0) + 1, `(${before} → ${after})`);
  check('shadow-exercise still returns a prompt', !!r.data?.prompt, `prompt="${String(r.data?.prompt).slice(0, 40)}..."`);
  // Cleanup
  if (r.data?.id) await c.from('shadow_exercises').delete().eq('id', r.data.id);
}

console.log(allPassed ? '\nALL PASS' : '\nSOME FAILED');
process.exit(allPassed ? 0 : 1);
