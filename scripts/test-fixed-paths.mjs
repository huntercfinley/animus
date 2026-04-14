// Verify the audit fixes work for a free-tier user (Carl).
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

const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const log = (l, d) => console.log(`\n[${l}]`, typeof d === 'string' ? d : JSON.stringify(d, null, 2));

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: home.ANIMUS_TEST_EMAIL, password: home.ANIMUS_TEST_PASSWORD });
if (authErr) { console.error('signin failed:', authErr.message); process.exit(1); }
log('signIn', auth.user.id);

const { data: profile } = await sb.from('profiles').select('lumen_balance, subscription_tier').eq('id', auth.user.id).single();
log('profile', profile);

let dreamId = null;
try {
  // 1. Insert a minimal dream so we have something to test against
  const { data: dream } = await sb.from('dreams').insert({
    user_id: auth.user.id,
    raw_transcript: 'Test dream transcript for fixed-paths check',
    title: 'Fixed-paths Test',
    journal_text: 'A small test dream to verify the audit fixes.',
    interpretation: 'A test journey through corrected pathways.',
    mood: 'reflective',
    image_style: 'impressionist',
    image_prompt: 'A serene path through golden trees with morning light filtering through the leaves.',
    model_used: 'test',
  }).select().single();
  dreamId = dream.id;
  log('dream.inserted', dreamId);

  // 2. dream-insights — free user used to get 403, should now work (no dreams in window will return 400)
  const { data: insights, error: insightsErr } = await sb.functions.invoke('dream-insights', { body: { period_type: 'weekly' } });
  if (insightsErr) {
    let body = null; try { body = await insightsErr.context?.json?.(); } catch {}
    log('dream-insights', { status: insightsErr.message, body });
  } else {
    log('dream-insights', { received: !!insights, len: typeof insights === 'object' ? JSON.stringify(insights).length : 0 });
  }

  // 3. go-deeper — free user used to be capped at 5; now unified at 10 (just verify one exchange works)
  const { data: deeper, error: deeperErr } = await sb.functions.invoke('go-deeper', {
    body: { dream_id: dreamId, message: 'What does the golden light symbolize?' },
  });
  if (deeperErr) {
    let body = null; try { body = await deeperErr.context?.json?.(); } catch {}
    log('go-deeper.error', { status: deeperErr.message, body });
  } else {
    log('go-deeper', { reply: deeper.reply?.slice(0, 100) + '...' });
  }

  // 4. generate-image — free user used to be capped 10/month; now unlimited (Lumen is the gate)
  const { data: spend, error: spendErr } = await sb.functions.invoke('lumen-spend', {
    body: { action: 'image_gen', dream_id: dreamId },
  });
  if (spendErr) {
    let body = null; try { body = await spendErr.context?.json?.(); } catch {}
    log('lumen-spend.error', { status: spendErr.message, body });
  } else {
    log('lumen-spend', spend);
    const { data: img, error: imgErr } = await sb.functions.invoke('generate-image', {
      body: { image_prompt: dream.image_prompt, style_prefix: 'impressionist oil painting,', dream_id: dreamId },
    });
    if (imgErr) {
      let body = null; try { body = await imgErr.context?.json?.(); } catch {}
      log('generate-image.error', { status: imgErr.message, body });
    } else {
      log('generate-image', { has_url: !!img.image_url, has_remaining: 'images_remaining' in img, model: img.model_used });
    }
  }

  // 5. earn shadow Lumen — featured-card path now uses earnShadow too
  const { data: ex } = await sb.from('shadow_exercises').insert({
    user_id: auth.user.id,
    prompt: 'Test prompt: where does this fear live in your body?',
    response: 'A long enough response to qualify for earning Lumen — at least one hundred characters of meaningful reflection on the fear.',
  }).select().single();
  log('shadow_exercise.inserted', ex.id);

  const { data: earn, error: earnErr } = await sb.functions.invoke('lumen-earn-shadow', { body: { exercise_id: ex.id } });
  if (earnErr) {
    let body = null; try { body = await earnErr.context?.json?.(); } catch {}
    log('lumen-earn-shadow.error', { status: earnErr.message, body });
  } else {
    log('lumen-earn-shadow', earn);
  }

  await sb.from('shadow_exercises').delete().eq('id', ex.id);

  const { data: profileAfter } = await sb.from('profiles').select('lumen_balance').eq('id', auth.user.id).single();
  log('profile.after', { before: profile.lumen_balance, after: profileAfter?.lumen_balance });

  console.log('\n=== FIXED-PATHS SUCCESS ===');
} catch (err) {
  console.error('\n=== FIXED-PATHS FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  if (dreamId) {
    await sb.from('dream_conversations').delete().eq('dream_id', dreamId);
    await sb.from('dream_symbols').delete().eq('dream_id', dreamId);
    await sb.from('dreams').delete().eq('id', dreamId);
    console.log(`\nCleanup: deleted ${dreamId}`);
  }
}
