#!/usr/bin/env node
// Add a dream to a real user's Animus account by replaying the full
// processDream() client flow against the production Supabase project.
//
// Signs in with email+password via the publishable (anon) key, then calls
// interpret-dream → inserts dreams + dream_symbols → calls generate-image
// (which deducts Lumen server-side for free users, premium is unmetered).
//
// Env:
//   ANIMUS_SUPABASE_URL              https://xlumafywghpgallecsvh.supabase.co
//   ANIMUS_SUPABASE_ANON_KEY         sb_publishable_*  (client role)
//   ANIMUS_USER_EMAIL                user to sign in as
//   ANIMUS_USER_PASSWORD             password
//   ANIMUS_DREAM_TRANSCRIPT          free-form dream text
//   ANIMUS_SKIP_IMAGE=1              optional, skip generate-image
//
// Usage:
//   ANIMUS_SUPABASE_ANON_KEY=sb_publishable_... \
//   ANIMUS_USER_EMAIL=huntercfinley@gmail.com \
//   ANIMUS_USER_PASSWORD=... \
//   ANIMUS_DREAM_TRANSCRIPT="I had a dream..." \
//   node scripts/add-dream-as-user.mjs

import { createClient } from '@supabase/supabase-js';

const URL = process.env.ANIMUS_SUPABASE_URL || 'https://xlumafywghpgallecsvh.supabase.co';
const ANON = process.env.ANIMUS_SUPABASE_ANON_KEY;
const EMAIL = process.env.ANIMUS_USER_EMAIL;
const PASSWORD = process.env.ANIMUS_USER_PASSWORD;
const TRANSCRIPT = process.env.ANIMUS_DREAM_TRANSCRIPT;
const SKIP_IMAGE = !!process.env.ANIMUS_SKIP_IMAGE;

if (!ANON || !EMAIL || !PASSWORD || !TRANSCRIPT) {
  console.error('Missing ANIMUS_SUPABASE_ANON_KEY / ANIMUS_USER_EMAIL / ANIMUS_USER_PASSWORD / ANIMUS_DREAM_TRANSCRIPT');
  process.exit(1);
}

const sb = createClient(URL, ANON, { auth: { persistSession: false } });

const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (signInErr) { console.error('sign-in failed:', signInErr); process.exit(1); }
const user = signInData.user;
console.log('signed in as', user.email, user.id);

// 1. interpret-dream
console.log('calling interpret-dream...');
const { data: interp, error: interpErr } = await sb.functions.invoke('interpret-dream', { body: { transcript: TRANSCRIPT } });
if (interpErr) { console.error('interpret-dream failed:', interpErr); process.exit(1); }
console.log('interpretation:', {
  title: interp.title,
  mood: interp.mood,
  symbols: interp.symbols?.length,
  model_used: interp.model_used,
});

// 2. art style selection (mirror lib/ai.ts selectArtStyle with the same deterministic rules)
//    To avoid duplicating the whole art-styles table, pick the neutral default
//    — the generate-image edge function will happily run with any style_prefix
//    string, and the client uses 'oil_painting' as a safe fallback.
const artStyleId = 'oil_painting';
const stylePrefix = 'oil painting, rich textured brushwork, golden hour lighting, mystical atmosphere';

// 3. Insert dream row
const { data: dream, error: insertErr } = await sb
  .from('dreams')
  .insert({
    user_id: user.id,
    raw_transcript: TRANSCRIPT,
    title: interp.title,
    journal_text: interp.journal_text,
    interpretation: interp.interpretation,
    mood: interp.mood,
    image_style: artStyleId,
    image_prompt: interp.image_prompt,
    model_used: interp.model_used,
  })
  .select()
  .single();
if (insertErr) { console.error('insert dream failed:', insertErr); process.exit(1); }
console.log('dream saved:', dream.id, dream.title);

// 4. Insert symbols
if (interp.symbols?.length) {
  const { error: symErr } = await sb.from('dream_symbols').insert(
    interp.symbols.map((s) => ({
      dream_id: dream.id,
      user_id: user.id,
      symbol: s.symbol,
      archetype: s.archetype,
      sentiment: s.sentiment,
    })),
  );
  if (symErr) console.warn('symbol insert failed:', symErr);
  else console.log('symbols saved:', interp.symbols.length);
}

// 5. generate-image (deducts Lumen server-side for free users)
if (!SKIP_IMAGE) {
  console.log('calling generate-image...');
  const { data: img, error: imgErr } = await sb.functions.invoke('generate-image', {
    body: { image_prompt: interp.image_prompt, style_prefix: stylePrefix, dream_id: dream.id },
  });
  if (imgErr) {
    console.warn('generate-image failed (non-fatal):', imgErr);
  } else if (img?.image_url) {
    await sb.from('dreams').update({ image_url: img.image_url }).eq('id', dream.id);
    console.log('image attached:', img.image_url);
  }
}

// 6. archetype snapshot refresh
const { error: archErr } = await sb.functions.invoke('archetype-snapshot', { body: {} });
if (archErr) console.warn('archetype-snapshot failed (non-fatal):', archErr);
else console.log('archetype snapshot refreshed');

console.log('\nDONE — dream id', dream.id, '→', dream.title);
