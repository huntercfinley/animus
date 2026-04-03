import { supabase } from './supabase';
import { selectArtStyle } from '@/constants/art-styles';
import type { InterpretDreamResponse, Dream, DreamSymbol } from '@/types/database';

async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Edge function ${name} failed`);
  }

  return response.json();
}

export async function processDream(transcript: string, audioUri: string | null): Promise<Dream & { shouldNudgeWorld: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const interpretation = await callEdgeFunction<InterpretDreamResponse>('interpret-dream', { transcript });

  const { data: recentDreams } = await supabase
    .from('dreams')
    .select('image_style')
    .eq('user_id', user.id)
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

  // Update archetype profile for premium users
  const { data: userProfile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (userProfile?.subscription_tier === 'premium') {
    callEdgeFunction('archetype-snapshot', {}).catch(err => console.warn('Archetype update failed:', err));
  }

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
  const result = await callEdgeFunction<{ image_url: string }>('generate-image', {
    image_prompt: imagePrompt,
    style_prefix: stylePrefix,
    dream_id: dreamId,
  });

  await supabase
    .from('dreams')
    .update({ image_url: result.image_url })
    .eq('id', dreamId);
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
