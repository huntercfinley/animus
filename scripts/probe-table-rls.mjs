// Sweep RLS on all sensitive tables. For each table, attempt
// INSERT/UPDATE/DELETE as Carl and verify whether it actually mutated state.
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

// Tables to audit. For each, the column we'll attempt to mutate to detect a hole.
const tables = [
  { name: 'archetype_snapshots',  mutate: 'snapshot_date',   originalKey: 'snapshot_date' },
  { name: 'dream_connections',    mutate: 'strength',        originalKey: 'strength' },
  { name: 'pattern_reports',      mutate: 'period_end',      originalKey: 'period_end' },
  { name: 'usage_limits',         mutate: 'count',           originalKey: 'count' },
  { name: 'ad_credits',           mutate: 'consumed',        originalKey: 'consumed' },
];

for (const t of tables) {
  console.log(`\n=== ${t.name} ===`);

  const { data: rows, error: selErr } = await c.from(t.name).select('*').limit(1);
  if (selErr) { console.log(`  SELECT: ${selErr.message}`); continue; }
  if (!rows?.[0]) { console.log(`  (no rows to probe)`); continue; }

  const row = rows[0];
  const id = row.id;
  const original = row[t.originalKey];

  // Try to mutate the chosen column to a sentinel value
  const sentinel = typeof original === 'number' ? 999999 :
                   typeof original === 'string'  ? '1999-01-01' : null;
  const { error: updErr } = await c.from(t.name).update({ [t.mutate]: sentinel }).eq('id', id);
  const { data: after } = await c.from(t.name).select(t.originalKey).eq('id', id).single();
  const changed = JSON.stringify(after?.[t.originalKey]) !== JSON.stringify(original);
  console.log(`  UPDATE ${t.mutate}: error=${updErr?.message ?? 'none'}  changed=${changed} ${changed ? '*** HOLE ***' : ''}`);
  if (changed) {
    await c.from(t.name).update({ [t.mutate]: original }).eq('id', id);
  }

  // Try DELETE
  const { error: delErr } = await c.from(t.name).delete().eq('id', id);
  const { data: afterDel } = await c.from(t.name).select('id').eq('id', id).maybeSingle();
  const deleted = afterDel === null;
  console.log(`  DELETE id=${String(id).slice(0, 8)}: error=${delErr?.message ?? 'none'}  deleted=${deleted} ${deleted ? '*** HOLE ***' : ''}`);
  if (deleted) {
    console.log(`    !! couldn't restore (would need full row)`);
  }
}
