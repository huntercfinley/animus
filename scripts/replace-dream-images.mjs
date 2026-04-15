#!/usr/bin/env node
// Replace each dream's 1:1 seed image with the new 3:4 Midjourney rendering
// that Hunter downloaded to ~/Downloads.
//
// Parses docs/midjourney-prompts.md for the numbered-order → dream_id map,
// matches each number to a ~/Downloads/rsuites__N._*.png file, uploads to
// the dream-images bucket at `{user_id}/{dream_id}.png` (overwriting the
// old 1:1 seed image), and bumps image_url with a cache-busting query
// param so clients refetch.
//
// Env:
//   ANIMUS_SUPABASE_URL              https://xlumafywghpgallecsvh.supabase.co
//   ANIMUS_SUPABASE_SERVICE_ROLE_KEY sb_secret_*
//   ANIMUS_USER_ID                   target user
//   DOWNLOADS_DIR                    (optional) default C:/Users/hunte/Downloads
//   DRY_RUN=1                        (optional) log what would happen, upload nothing

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const URL = process.env.ANIMUS_SUPABASE_URL || 'https://xlumafywghpgallecsvh.supabase.co';
const KEY = process.env.ANIMUS_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.ANIMUS_USER_ID;
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || 'C:/Users/hunte/Downloads';
const PROMPTS_MD = 'docs/midjourney-prompts.md';
const DRY_RUN = !!process.env.DRY_RUN;

if (!KEY || !USER_ID) {
  console.error('Missing ANIMUS_SUPABASE_SERVICE_ROLE_KEY or ANIMUS_USER_ID');
  process.exit(1);
}

// Parse midjourney-prompts.md for ordered { number, id, title } entries.
const md = readFileSync(PROMPTS_MD, 'utf8');
const blocks = [];
const re = /^## (\d+)\. (.+)$[\s\S]*?Dream id:\*\*\s*`([0-9a-f-]+)`/gm;
let m;
while ((m = re.exec(md)) !== null) {
  blocks.push({ number: parseInt(m[1], 10), title: m[2].trim(), id: m[3] });
}
console.log(`parsed ${blocks.length} dreams from ${PROMPTS_MD}`);

// Index Downloads by leading number.
const downloads = readdirSync(DOWNLOADS_DIR).filter((f) => /^rsuites__\d+\./.test(f));
const byNumber = new Map();
for (const f of downloads) {
  const n = parseInt(f.match(/^rsuites__(\d+)/)[1], 10);
  if (!byNumber.has(n)) byNumber.set(n, f);
}
console.log(`indexed ${downloads.length} download files (${byNumber.size} unique numbers)`);

const sb = createClient(URL, KEY);

let uploaded = 0;
let skipped = 0;
const missing = [];

for (const b of blocks) {
  const fname = byNumber.get(b.number);
  if (!fname) {
    missing.push(b);
    console.log(`  [MISSING] #${b.number} ${b.title}`);
    continue;
  }

  const path = `${USER_ID}/${b.id}.png`;
  const fullPath = join(DOWNLOADS_DIR, fname);
  const bytes = readFileSync(fullPath);

  if (DRY_RUN) {
    console.log(`  [DRY] #${b.number} ${b.title} → ${path} (${bytes.length} bytes from ${fname})`);
    skipped++;
    continue;
  }

  const { error: upErr } = await sb.storage
    .from('dream-images')
    .upload(path, bytes, { upsert: true, contentType: 'image/png' });

  if (upErr) {
    console.error(`  [FAIL] #${b.number} ${b.title}: ${upErr.message}`);
    continue;
  }

  // Cache-bust by stamping image_url with a ?v= query param so clients refetch.
  const { data: pub } = sb.storage.from('dream-images').getPublicUrl(path);
  const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
  const { error: updErr } = await sb.from('dreams').update({ image_url: newUrl }).eq('id', b.id);
  if (updErr) {
    console.error(`  [FAIL-URL] #${b.number} ${b.title}: ${updErr.message}`);
    continue;
  }

  console.log(`  [OK] #${b.number} ${b.title}`);
  uploaded++;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`uploaded: ${uploaded}`);
console.log(`skipped:  ${skipped}`);
console.log(`missing:  ${missing.length}`);
if (missing.length) console.log(missing.map((m) => `  #${m.number} ${m.title}`).join('\n'));
