import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';
import { InsufficientLumenError } from './lumen-errors';
import { selectArtStyle } from '@/constants/art-styles';
import type { InterpretDreamResponse, Dream, DreamSymbol } from '@/types/database';

async function callEdgeFunction<T>(name: string, body: Record<string, unknown>, opts?: { silent?: boolean }): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let detail = '';
    let parsed: any = null;
    try {
      const ctx: any = (error as any).context;
      if (ctx?.json) {
        parsed = await ctx.json();
        detail = parsed?.error || parsed?.message || JSON.stringify(parsed);
      } else if (ctx?.text) {
        detail = (await ctx.text()).slice(0, 500);
      }
    } catch {}
    // Special-case insufficient_lumen so UIs can pattern-match with
    // `instanceof InsufficientLumenError` and read current/required. Edge
    // functions (generate-image, go-deeper, dream-insights, dream-connection,
    // lumen-spend) all return this shape on a failed spend.
    if (parsed?.error === 'insufficient_lumen') {
      throw new InsufficientLumenError(parsed.current_balance ?? 0, parsed.required ?? 0);
    }
    const msg = detail || error.message || `${name} failed`;
    const err = new Error(msg);
    if (!opts?.silent) {
      Sentry.captureException(err, {
        tags: { edgeFunction: name },
        extra: { detail },
      });
    }
    throw err;
  }
  if (data == null) throw new Error(`${name} returned no data`);
  return data;
}

export async function processDream(transcript: string, audioUri: string | null): Promise<Dream & { shouldNudgeWorld: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const interpretation = await callEdgeFunction<InterpretDreamResponse>('interpret-dream', { transcript });

  const { data: recentDreams } = await supabase
    .from('dreams')
    .select('image_style')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const previousStyles = (recentDreams || []).map(d => d.image_style).filter(Boolean);
  const artStyle = selectArtStyle(interpretation.mood, previousStyles);

  const { data: dream, error: insertError } = await supabase
    .from('dreams')
    .insert({
      user_id: user.id,
      raw_transcript: transcript,
      title: interpretation.title,
      journal_text: interpretation.journal_text,
      interpretation: interpretation.interpretation,
      mood: interpretation.mood,
      image_style: artStyle.id,
      image_prompt: interpretation.image_prompt,
      model_used: interpretation.model_used,
    })
    .select()
    .single();

  if (insertError || !dream) throw new Error(insertError?.message || 'Failed to save dream');

  if (interpretation.symbols.length > 0) {
    await supabase.from('dream_symbols').insert(
      interpretation.symbols.map(s => ({
        dream_id: dream.id,
        user_id: user.id,
        symbol: s.symbol,
        archetype: s.archetype,
        sentiment: s.sentiment,
      }))
    );
  }

  generateAndAttachImage(dream.id, interpretation.image_prompt, artStyle.promptPrefix).catch(err => {
    console.warn('Image generation failed:', err);
  });

  if (audioUri) {
    uploadAudio(dream.id, user.id, audioUri).catch(err => {
      console.warn('Audio upload failed:', err);
    });
  }

  // Refresh archetype snapshot for everyone — archetype is universal, not premium-gated.
  callEdgeFunction('archetype-snapshot', {}).catch(err => console.warn('Archetype update failed:', err));

  const shouldNudgeWorld = await checkWorldNudge(user.id);

  return { ...dream, shouldNudgeWorld };
}

async function checkWorldNudge(userId: string): Promise<boolean> {
  const { count: dreamCount } = await supabase.from('dreams').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: worldCount } = await supabase.from('world_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId);

  // Nudge after 3+ dreams if no world entries
  return (dreamCount ?? 0) >= 3 && (worldCount ?? 0) === 0;
}

async function generateAndAttachImage(dreamId: string, imagePrompt: string, stylePrefix: string) {
  // generate-image deducts Lumen server-side before calling Imagen (and
  // refunds on failure). insufficient_lumen is expected for free users
  // with a low balance — silent so it doesn't trip Sentry.
  try {
    const result = await callEdgeFunction<{ image_url: string }>('generate-image', {
      image_prompt: imagePrompt,
      style_prefix: stylePrefix,
      dream_id: dreamId,
    }, { silent: true });

    await supabase
      .from('dreams')
      .update({ image_url: result.image_url })
      .eq('id', dreamId);
  } catch (err) {
    if ((err as Error).message?.includes('insufficient_lumen')) {
      console.warn('Skipping auto image: insufficient Lumen');
      return;
    }
    throw err;
  }
}

async function uploadAudio(dreamId: string, userId: string, audioUri: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profile?.subscription_tier !== 'premium') return;

  const response = await fetch(audioUri);
  const blob = await response.blob();
  const fileName = `${userId}/${dreamId}.m4a`;

  const { error } = await supabase.storage
    .from('dream-audio')
    .upload(fileName, blob, { contentType: 'audio/mp4' });

  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from('dream-audio').getPublicUrl(fileName);
    await supabase.from('dreams').update({ audio_url: publicUrl }).eq('id', dreamId);
  }
}

export { callEdgeFunction };
