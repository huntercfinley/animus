#!/usr/bin/env node
// Export Midjourney-ready 3:4 prompts for a user's dreams.
//
// Queries the dreams table for a given user_id, joins the image_style to the
// matching promptPrefix from constants/art-styles.ts, and writes a Markdown
// file with one block per dream ready to paste into Midjourney (or Discord
// /imagine). Skips soft-deleted rows.
//
// Env:
//   ANIMUS_SUPABASE_URL              https://xlumafywghpgallecsvh.supabase.co
//   ANIMUS_SUPABASE_SERVICE_ROLE_KEY sb_secret_*
//   ANIMUS_USER_ID                   target user
//   OUT_PATH                         (optional) output .md path
//
// Usage:
//   ANIMUS_USER_ID=a872fa8e-... node scripts/export-midjourney-prompts.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const URL = process.env.ANIMUS_SUPABASE_URL || 'https://xlumafywghpgallecsvh.supabase.co';
const KEY = process.env.ANIMUS_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.ANIMUS_USER_ID;
const OUT_PATH = process.env.OUT_PATH || 'docs/midjourney-prompts.md';

if (!KEY || !USER_ID) {
  console.error('Missing ANIMUS_SUPABASE_SERVICE_ROLE_KEY or ANIMUS_USER_ID');
  process.exit(1);
}

// Mirrors constants/art-styles.ts — kept in-script so this file stays standalone.
const STYLE_PREFIX = {
  surrealist:      'surrealist painting in the style of Salvador Dalí, melting forms, impossible geometry,',
  dark_fantasy:    'dark fantasy painting, dramatic chiaroscuro lighting, rich shadows,',
  watercolor:      'soft watercolor painting, flowing colors, delicate brushstrokes, gentle bleeds,',
  magical_realism: 'magical realism painting, everyday scene with impossible elements, warm lighting,',
  ink_wash:        'East Asian ink wash painting, flowing black ink, minimalist composition,',
  art_nouveau:     'Art Nouveau illustration, flowing organic lines, decorative borders, muted golds,',
  gothic:          'gothic painting, cathedral architecture, moody blue-black atmosphere,',
  ethereal:        'ethereal glowing art, luminous beings, soft divine light, translucent,',
  folklore:        'folk art illustration, rich patterns, mythological themes, earthy palette,',
  expressionist:   'expressionist painting, bold distorted colors, raw emotional energy,',
  oil_painting:    'oil painting, rich textured brushwork, golden hour lighting, mystical atmosphere,',
};

// The dreamer's physical description — prepended to every prompt so
// Midjourney renders Hunter as the figure in scenes where he's the subject.
// Sourced from HunterPassportImage.jpeg (Apr 15 2026).
const APPEARANCE =
  'a 30-year-old biracial man with warm light-brown skin, short dark curly hair, freckles across his nose and cheeks, dark brown eyes, slim athletic build, clean-shaven';

// Dreams that already have correct 3:4 images — skip them.
const SKIP_IDS = new Set([
  '32187786-3da5-46e5-83e4-d2cc68ddde72', // Two Houses, One Road (generated via current 3:4 edge fn)
]);

const sb = createClient(URL, KEY);

const { data: allDreams, error } = await sb
  .from('dreams')
  .select('id, title, mood, image_prompt, image_style, created_at')
  .eq('user_id', USER_ID)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });

const dreams = (allDreams || []).filter((d) => !SKIP_IDS.has(d.id));

if (error) { console.error(error); process.exit(1); }
console.log(`fetched ${dreams.length} active dreams`);

const lines = [];
lines.push(`# Midjourney 3:4 Prompts — Animus Dream Journal`);
lines.push('');
lines.push(`Exported ${new Date().toISOString().split('T')[0]} — ${dreams.length} dreams.`);
lines.push('');
lines.push(`Paste each block into Midjourney (\`/imagine prompt: ...\`). Each ends with \`--ar 3:4\` to match the in-app dream card hero frame. \`--style raw\` and \`--v 6.1\` keep Midjourney from over-stylizing the art-style prefix — tweak to taste.`);
lines.push('');
lines.push(`Each prompt prepends a physical description of Hunter so Midjourney renders him as the dreamer wherever the dream has a human figure: **${APPEARANCE}**.`);
lines.push('');
lines.push('---');
lines.push('');

for (let i = 0; i < dreams.length; i++) {
  const d = dreams[i];
  const prefix = (STYLE_PREFIX[d.image_style] || '').trim();
  // Match the in-app composition in generate-image/index.ts, which prepends an
  // appearance clause before the style prefix:
  //   `${appearanceClause}${style_prefix || ''} ${image_prompt}. Dreamlike, evocative, no text or words in the image.`
  const appearanceClause = `featuring ${APPEARANCE} as the dreamer, `;
  const core = `${appearanceClause}${prefix ? prefix + ' ' : ''}${d.image_prompt}. Dreamlike, evocative, no text or words in the image.`;
  const prompt = `${core} --ar 3:4 --style raw --v 6.1`;

  lines.push(`## ${i + 1}. ${d.title}`);
  lines.push('');
  lines.push(`- **Mood:** ${d.mood}`);
  lines.push(`- **Style:** ${d.image_style}`);
  lines.push(`- **Date:** ${d.created_at.split('T')[0]}`);
  lines.push(`- **Dream id:** \`${d.id}\``);
  lines.push('');
  lines.push('```');
  lines.push(prompt);
  lines.push('```');
  lines.push('');
}

writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
console.log(`wrote ${OUT_PATH} (${lines.length} lines, ${dreams.length} dreams)`);
