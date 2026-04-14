// Probe: does lumen-spend reject all JWTs, or just my JS client's JWT?
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
console.log('JWT prefix:', jwt.slice(0, 40), '...');
console.log('JWT parts:', jwt.split('.').length);

// Decode header
const header = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString());
console.log('JWT header:', header);
const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
console.log('JWT payload (subset):', { iss: payload.iss, role: payload.role, sub: payload.sub, aud: payload.aud, iat: payload.iat, exp: payload.exp });

console.log('\n--- Direct curl: interpret-dream ---');
const r1 = await fetch(`${URL}/functions/v1/interpret-dream`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: 'short test' }),
});
console.log('interpret-dream status:', r1.status);
console.log('body:', (await r1.text()).slice(0, 200));

console.log('\n--- Direct curl: lumen-spend ---');
const r2 = await fetch(`${URL}/functions/v1/lumen-spend`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'go_deeper' }),
});
console.log('lumen-spend status:', r2.status);
console.log('body:', (await r2.text()).slice(0, 200));

console.log('\n--- Direct curl: archetype-snapshot ---');
const r3 = await fetch(`${URL}/functions/v1/archetype-snapshot`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': ANON, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log('archetype-snapshot status:', r3.status);
console.log('body:', (await r3.text()).slice(0, 200));
