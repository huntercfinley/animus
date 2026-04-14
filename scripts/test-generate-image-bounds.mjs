// Boundary tests for generate-image: rejects oversized image_prompt (413),
// rejects oversized style_prefix (413), rejects foreign dream_id (404).
// None of these should ever spend Lumen — they must return before the RPC.
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

let pass = true;
function check(label, ok, extra) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) pass = false; }

async function errBody(err) {
  try { return await err.context?.json?.(); } catch { return null; }
}

const b0 = await balance();

// 1. Oversized image_prompt
{
  const big = 'dream '.repeat(1000); // ~6KB
  const r = await c.functions.invoke('generate-image', { body: { image_prompt: big } });
  const body = r.error ? await errBody(r.error) : null;
  check('413 on oversized image_prompt', body?.error === 'image_prompt_too_long', JSON.stringify(body));
}

// 2. Oversized style_prefix
{
  const r = await c.functions.invoke('generate-image', { body: { image_prompt: 'a serene lake', style_prefix: 'x'.repeat(300) } });
  const body = r.error ? await errBody(r.error) : null;
  check('413 on oversized style_prefix', body?.error === 'style_prefix_too_long', JSON.stringify(body));
}

// 3. Foreign dream_id — pass a random uuid that isn't ours
{
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const r = await c.functions.invoke('generate-image', { body: { image_prompt: 'a test', dream_id: fakeId } });
  const body = r.error ? await errBody(r.error) : null;
  check('404 on foreign dream_id', body?.error === 'dream_not_found_or_not_owned', JSON.stringify(body));
}

const b1 = await balance();
check('no Lumen spent on any rejected request', b1 === b0, `(${b0} → ${b1})`);

console.log(pass ? '\nALL PASS' : '\nSOME FAILED');
process.exit(pass ? 0 : 1);
