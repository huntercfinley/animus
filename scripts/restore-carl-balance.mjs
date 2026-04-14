// Top up Carl's balance via the lumen-purchase RPC (which writes a proper
// ledger row) so the test environment is left usable.
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

const { data, error } = await c.functions.invoke('lumen-purchase', {
  body: {
    pack: 'medium',
    transaction_id: `test-restore-${Date.now()}`,
    product_id: 'animus_lumen_medium',
    metadata: { source: 'test-restore-script' },
  },
});
if (error) { console.error(error); process.exit(1); }
console.log('After purchase:', JSON.stringify(data));
