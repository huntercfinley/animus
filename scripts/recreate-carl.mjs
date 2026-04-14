// Recreate Carl test account after accidental delete-account call.
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

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Try to sign in first
const signIn = await supabase.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
if (signIn.data.user) {
  console.log('Carl still exists. UUID:', signIn.data.user.id);
  console.log('Old expected UUID:', home.ANIMUS_TEST_USER_ID);
  console.log('Match:', signIn.data.user.id === home.ANIMUS_TEST_USER_ID);
  process.exit(0);
}
console.log('Sign in failed:', signIn.error?.message);

// Sign up to recreate
const signUp = await supabase.auth.signUp({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
if (signUp.error) {
  console.error('Sign up failed:', signUp.error.message);
  process.exit(1);
}
console.log('Created new Carl. UUID:', signUp.data.user?.id);
console.log('Confirmation required?', !signUp.data.session);
console.log('Old expected UUID was:', home.ANIMUS_TEST_USER_ID);
console.log('\nIf UUID changed, update ~/.env ANIMUS_TEST_USER_ID');
