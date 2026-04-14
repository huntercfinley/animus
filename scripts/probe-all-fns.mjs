// Probe every edge function: send valid ES256 JWT, see which reject with platform 401.
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

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: auth } = await supabase.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
const jwt = auth.session.access_token;

const fns = [
  'analyze-appearance',
  'archetype-snapshot',
  // delete-account intentionally excluded — it WILL delete Carl
  'dream-connection',
  'dream-insights',
  'generate-image',
  'go-deeper',
  'interpret-dream',
  'lumen-earn-shadow',
  'lumen-spend',
  'shadow-exercise',
  'suggest-world-entry',
];

console.log('Testing each function with valid ES256 JWT (HEAD-style: empty body, OPTIONS pre-flight skipped)\n');
for (const fn of fns) {
  const r = await fetch(`${URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': ANON, 'Content-Type': 'application/json' },
    body: '{}',
  });
  let bodySnippet = (await r.text()).slice(0, 120).replace(/\n/g, ' ');
  const platformReject = r.status === 401 && bodySnippet.includes('Invalid JWT');
  const tag = platformReject ? '❌ PLATFORM REJECT (verify_jwt=true)' : (r.status >= 500 ? '⚠️  500' : `✅ ${r.status}`);
  console.log(`${fn.padEnd(22)} ${tag}  ${bodySnippet}`);
}
