// End-to-end save flow test using the Carl test account.
// Signs in, runs interpret-dream → insert → lumen-spend → generate-image, verifies, cleans up.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

const animus = loadEnv('./.env.local');
const home = loadEnv(process.env.USERPROFILE + '/.env');

const SUPABASE_URL = animus.EXPO_PUBLIC_SUPABASE_URL;
const ANON = animus.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = home.ANIMUS_TEST_EMAIL;
const PASSWORD = home.ANIMUS_TEST_PASSWORD;
const EXPECTED_USER = home.ANIMUS_TEST_USER_ID;

if (!SUPABASE_URL || !ANON || !EMAIL || !PASSWORD) {
  console.error('Missing env. URL?', !!SUPABASE_URL, 'ANON?', !!ANON, 'EMAIL?', !!EMAIL);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });

const log = (label, data) => console.log(`\n[${label}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));

const TRANSCRIPT = "I was walking through a dimly lit forest when I came across an old wooden door standing alone between two trees. I opened it and stepped through into a warm, sunlit kitchen that I recognized from my grandmother's house. She was there making bread, but when she turned around, her face kept shifting between people I knew. I felt safe but confused, like I was supposed to remember something important.";

let dreamId = null;

try {
  // 1. Sign in
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) throw new Error(`signIn: ${authErr.message}`);
  log('signIn', { user: auth.user.id, expected: EXPECTED_USER, match: auth.user.id === EXPECTED_USER });

  // 2. Profile baseline
  const { data: profileBefore, error: pErr } = await supabase.from('profiles').select('lumen_balance, subscription_tier').eq('id', auth.user.id).single();
  if (pErr) throw new Error(`profile: ${pErr.message}`);
  log('profile.before', profileBefore);

  // 3. interpret-dream
  const t0 = Date.now();
  const { data: interp, error: iErr } = await supabase.functions.invoke('interpret-dream', { body: { transcript: TRANSCRIPT } });
  if (iErr) {
    let body = null; try { body = await iErr.context?.json?.(); } catch {}
    throw new Error(`interpret-dream: ${iErr.message} ${JSON.stringify(body)}`);
  }
  log('interpret-dream', { ms: Date.now() - t0, title: interp.title, mood: interp.mood, symbols: interp.symbols?.length, model: interp.model_used });

  // 4. Insert dream
  const { data: dream, error: insErr } = await supabase.from('dreams').insert({
    user_id: auth.user.id,
    raw_transcript: TRANSCRIPT,
    title: interp.title,
    journal_text: interp.journal_text,
    interpretation: interp.interpretation,
    mood: interp.mood,
    image_style: 'impressionist',
    image_prompt: interp.image_prompt,
    model_used: interp.model_used,
  }).select().single();
  if (insErr) throw new Error(`insert dream: ${insErr.message}`);
  dreamId = dream.id;
  log('dream.inserted', { id: dream.id, title: dream.title });

  // 5. Insert symbols
  if (interp.symbols?.length > 0) {
    const { error: symErr } = await supabase.from('dream_symbols').insert(
      interp.symbols.map(s => ({ dream_id: dream.id, user_id: auth.user.id, symbol: s.symbol, archetype: s.archetype, sentiment: s.sentiment }))
    );
    if (symErr) console.warn('symbols insert failed:', symErr.message);
    else log('symbols.inserted', interp.symbols.length);
  }

  // 6. generate-image — now deducts Lumen server-side itself (was a
  // separate lumen-spend call until migration 20). On insufficient_lumen
  // it returns 402 before touching Imagen.
  {
    const t1 = Date.now();
    const { data: img, error: imgErr } = await supabase.functions.invoke('generate-image', {
      body: { image_prompt: interp.image_prompt, style_prefix: 'impressionist oil painting,', dream_id: dream.id },
    });
    if (imgErr) {
      let body = null; try { body = await imgErr.context?.json?.(); } catch {}
      log('generate-image.error', { msg: imgErr.message, body });
    } else {
      log('generate-image', { ms: Date.now() - t1, image_url: img.image_url?.slice(0, 80) + '...' });
      await supabase.from('dreams').update({ image_url: img.image_url }).eq('id', dream.id);
    }
  }

  // 8. archetype-snapshot
  const { data: arch, error: archErr } = await supabase.functions.invoke('archetype-snapshot', { body: {} });
  if (archErr) {
    let body = null; try { body = await archErr.context?.json?.(); } catch {}
    log('archetype-snapshot.error', { msg: archErr.message, body });
  } else {
    log('archetype-snapshot', arch);
  }

  // 9. Profile after
  const { data: profileAfter } = await supabase.from('profiles').select('lumen_balance').eq('id', auth.user.id).single();
  log('profile.after', { before: profileBefore.lumen_balance, after: profileAfter?.lumen_balance, delta: (profileAfter?.lumen_balance ?? 0) - profileBefore.lumen_balance });

  // 10. Verify final dream record
  const { data: final } = await supabase.from('dreams').select('id, title, mood, image_url, image_prompt, model_used').eq('id', dream.id).single();
  log('dream.final', { ...final, image_url: final?.image_url ? final.image_url.slice(0, 80) + '...' : null });

  console.log('\n=== SAVE FLOW SUCCESS ===');
} catch (err) {
  console.error('\n=== SAVE FLOW FAILED ===');
  console.error(err.message);
  console.error(err.stack);
  process.exitCode = 1;
} finally {
  if (dreamId) {
    await supabase.from('dream_symbols').delete().eq('dream_id', dreamId);
    await supabase.from('dreams').delete().eq('id', dreamId);
    console.log(`\nCleanup: deleted test dream ${dreamId}`);
  }
}
