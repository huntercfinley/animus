// Verify the on_dream_created trigger still updates dream_count/streak_*
// after the column lockdown. The trigger is security definer, but column
// grants apply to whatever role the function owner runs as — so this proves
// the production path still works.
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

const { data: before } = await c.from('profiles').select('dream_count, streak_current, streak_longest').eq('id', a.user.id).single();
console.log('before:', before);

const { data: dream, error: insErr } = await c.from('dreams').insert({
  user_id: a.user.id,
  title: 'Trigger probe',
  raw_transcript: 'Test dream inserted by test-dream-stats-trigger.mjs',
}).select().single();
if (insErr) { console.error('insert failed:', insErr); process.exit(1); }
console.log(`inserted dream ${dream.id.slice(0, 8)}...`);

const { data: after } = await c.from('profiles').select('dream_count, streak_current, streak_longest').eq('id', a.user.id).single();
console.log('after:', after);

const dreamCountIncremented = after.dream_count === before.dream_count + 1;
console.log(`dream_count: ${before.dream_count} → ${after.dream_count}  ${dreamCountIncremented ? 'OK' : '*** TRIGGER BROKEN ***'}`);

// Cleanup so the test is repeatable
await c.from('dreams').delete().eq('id', dream.id);
console.log('cleaned up dream');

// Note: the trigger increments dream_count but doesn't decrement on delete.
// Carl's dream_count is now permanently +1 after each test run; that's a
// pre-existing design choice (statistic, not authoritative count).

process.exit(dreamCountIncremented ? 0 : 1);
