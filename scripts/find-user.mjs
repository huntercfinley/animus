#!/usr/bin/env node
// Look up an Animus user by email via the Supabase admin API.
// Uses the sb_secret key from ANIMUS_SUPABASE_SERVICE_ROLE_KEY env.
// Usage: node scripts/find-user.mjs <email>
import { createClient } from '@supabase/supabase-js';

const URL = process.env.ANIMUS_SUPABASE_URL || 'https://xlumafywghpgallecsvh.supabase.co';
const KEY = process.env.ANIMUS_SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('Missing ANIMUS_SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const email = (process.argv[2] || '').toLowerCase();
const admin = createClient(URL, KEY);

let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error); process.exit(1); }
  if (!data.users.length) break;
  for (const u of data.users) {
    if (!email || (u.email || '').toLowerCase() === email) {
      console.log(JSON.stringify({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
    }
  }
  if (data.users.length < 200) break;
  page += 1;
}
