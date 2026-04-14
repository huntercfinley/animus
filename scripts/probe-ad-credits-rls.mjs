// Verify ad_credits RLS — composite key (user_id, day), no UPDATE/DELETE/INSERT
// policies, so all client mutations should be silent no-ops.
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
const userId = a.user.id;
const today = new Date().toISOString().slice(0, 10);

const { data: before } = await c.from('ad_credits').select('*').eq('user_id', userId).eq('day', today).single();
console.log('before:', before);

// 1. Try to grant ourselves more credits via UPDATE
const { error: updErr } = await c.from('ad_credits').update({ granted: 99, consumed: 0 })
  .eq('user_id', userId).eq('day', today);
const { data: afterUpd } = await c.from('ad_credits').select('*').eq('user_id', userId).eq('day', today).single();
const updChanged = afterUpd.granted !== before.granted || afterUpd.consumed !== before.consumed;
console.log(`UPDATE: error=${updErr?.message ?? 'none'}  changed=${updChanged} ${updChanged ? '*** HOLE ***' : 'OK (silent no-op)'}`);

// 2. Try INSERT for tomorrow (unique day, would create new row)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const { error: insErr } = await c.from('ad_credits').insert({
  user_id: userId, day: tomorrow, granted: 99, consumed: 0,
});
const { data: tomorrowRow } = await c.from('ad_credits').select('*').eq('user_id', userId).eq('day', tomorrow).maybeSingle();
const insChanged = tomorrowRow !== null;
console.log(`INSERT: error=${insErr?.message ?? 'none'}  inserted=${insChanged} ${insChanged ? '*** HOLE ***' : 'OK'}`);
if (insChanged) await c.from('ad_credits').delete().eq('user_id', userId).eq('day', tomorrow);

// 3. Try DELETE today's row
const { error: delErr } = await c.from('ad_credits').delete().eq('user_id', userId).eq('day', today);
const { data: afterDel } = await c.from('ad_credits').select('*').eq('user_id', userId).eq('day', today).maybeSingle();
const delChanged = afterDel === null;
console.log(`DELETE: error=${delErr?.message ?? 'none'}  deleted=${delChanged} ${delChanged ? '*** HOLE ***' : 'OK (silent no-op)'}`);
