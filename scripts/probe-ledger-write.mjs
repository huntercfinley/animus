// SECURITY PROBE — verify whether a user can directly insert/update/delete
// rows in lumen_transactions, which would corrupt the audit ledger.
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

// 1. INSERT
const { data: ins, error: insErr } = await c.from('lumen_transactions').insert({
  user_id: a.user.id,
  type: 'admin_grant',
  amount: 99999,
  balance_after: 99999,
  metadata: { source: 'probe' },
}).select();
console.log('INSERT:', insErr?.message ?? `OK (id=${ins?.[0]?.id})`);
if (ins?.[0]?.id) {
  // Even if RLS allowed it, clean up. Use admin or just try delete next.
  console.log('  *** HOLE: client can write to ledger ***');
}

// 2. UPDATE existing row
const { data: rows } = await c.from('lumen_transactions').select('id, balance_after').limit(1);
if (rows?.[0]) {
  const original = rows[0].balance_after;
  const { error: updErr } = await c.from('lumen_transactions').update({ balance_after: 99999 }).eq('id', rows[0].id);
  // Re-read to see if it actually changed (RLS with no UPDATE policy returns no error but updates 0 rows).
  const { data: afterUpd } = await c.from('lumen_transactions').select('balance_after').eq('id', rows[0].id).single();
  const reallyMutated = afterUpd.balance_after === 99999;
  console.log(`UPDATE: error=${updErr?.message ?? 'none'}  actually_changed=${reallyMutated}  ${reallyMutated ? '*** HOLE ***' : 'OK (silent no-op)'}`);
  if (reallyMutated) {
    await c.from('lumen_transactions').update({ balance_after: original }).eq('id', rows[0].id);
  }
}

// 3. DELETE existing row
if (rows?.[0]) {
  const { error: delErr } = await c.from('lumen_transactions').delete().eq('id', rows[0].id);
  const { data: afterDel } = await c.from('lumen_transactions').select('id').eq('id', rows[0].id).maybeSingle();
  const reallyDeleted = afterDel === null;
  console.log(`DELETE: error=${delErr?.message ?? 'none'}  actually_deleted=${reallyDeleted}  ${reallyDeleted ? '*** HOLE ***' : 'OK (silent no-op)'}`);
}

// 4. SELECT another user's row (should always fail under RLS)
const fakeId = '00000000-0000-0000-0000-000000000000';
const { data: other } = await c.from('lumen_transactions').select('id').eq('user_id', fakeId).limit(1);
console.log(`SELECT other-user (cross-tenant): ${other?.length ?? 0} rows visible (should be 0)`);
