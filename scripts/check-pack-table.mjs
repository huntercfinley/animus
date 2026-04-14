// Verify server-side packs table matches client LUMEN_PACKS constants.
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

// Try common table names used in the lumen-purchase function
for (const name of ['lumen_packs', 'PACKS', 'animus_lumen_packs']) {
  const { data, error } = await c.from(name).select('*');
  if (!error && data) {
    console.log(`\nTable "${name}":`);
    console.table(data);
    break;
  }
}

// Also check the lumen-purchase function source to see what it uses.
console.log('\nFor reference, expected client values:');
const expected = {
  small:  { amount: 50,  product_id: 'animus_lumen_small'  },
  medium: { amount: 150, product_id: 'animus_lumen_medium' },
  large:  { amount: 350, product_id: 'animus_lumen_large'  },
  mega:   { amount: 800, product_id: 'animus_lumen_mega'   },
};
console.table(expected);
