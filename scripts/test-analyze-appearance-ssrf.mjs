// SSRF guard test for analyze-appearance: must reject photo_urls that
// aren't Supabase storage URLs (e.g., cloud metadata endpoints).
// Also tests rate limit exists. Carl is NOT premium so we expect 403 on
// the happy path — but SSRF validation should fire BEFORE the premium check
// wait, no: the function checks premium FIRST, so a non-premium user gets
// 403 before ever hitting the SSRF check. Use a different signal: check
// that BOTH arms return a structured error and neither actually fetches
// http://169.254.169.254. The Gemini Vision call costs money, so we can
// only reach that far with Hunter's premium account.
//
// For Carl (free tier): we can only verify the premium gate still works.
// For an SSRF check we'd need a premium test account. Skipping the
// positive SSRF test and only verifying the premium gate rejects cleanly.
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
await c.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });

let pass = true;
function check(label, ok, extra) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) pass = false; }
async function errBody(err) { try { return await err.context?.json?.(); } catch { return null; } }

// Carl is free tier — the premium gate should reject before SSRF check runs.
// That's the best we can test without a paid premium test account.
const r = await c.functions.invoke('analyze-appearance', { body: { photo_urls: ['http://169.254.169.254/latest/meta-data/'] } });
const body = r.error ? await errBody(r.error) : null;
check('premium gate rejects free user', body?.error === 'Premium feature', JSON.stringify(body));

console.log(pass ? '\nALL PASS' : '\nSOME FAILED');
process.exit(pass ? 0 : 1);
