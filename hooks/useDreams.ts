import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Dream, DreamSymbol } from '@/types/database';

const SUPABASE_STORAGE_MARKER = '/storage/v1/object/public/';

function parseStoragePath(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const idx = url.indexOf(SUPABASE_STORAGE_MARKER);
  if (idx === -1) return null;
  const rest = url.slice(idx + SUPABASE_STORAGE_MARKER.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

export function useDreams() {
  const { user } = useAuth();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDreams = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setDreams(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDreams(); }, [fetchDreams]);

  const getDream = useCallback(async (id: string) => {
    const { data } = await supabase.from('dreams').select('*').eq('id', id).single();
    return data as Dream | null;
  }, []);

  const getDreamSymbols = useCallback(async (dreamId: string) => {
    const { data } = await supabase
      .from('dream_symbols')
      .select('*')
      .eq('dream_id', dreamId);
    return (data || []) as DreamSymbol[];
  }, []);

  const toggleFavorite = useCallback(async (dreamId: string, currentValue: boolean) => {
    await supabase.from('dreams').update({ is_favorite: !currentValue }).eq('id', dreamId);
    setDreams(prev => prev.map(d => d.id === dreamId ? { ...d, is_favorite: !currentValue } : d));
  }, []);

  const softDeleteDream = useCallback(async (dreamId: string) => {
    const { error } = await supabase
      .from('dreams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', dreamId);
    if (error) throw error;
    setDreams(prev => prev.filter(d => d.id !== dreamId));
  }, []);

  const restoreDream = useCallback(async (dreamId: string) => {
    const { error } = await supabase
      .from('dreams')
      .update({ deleted_at: null })
      .eq('id', dreamId);
    if (error) throw error;
    await fetchDreams();
  }, [fetchDreams]);

  const fetchTrashedDreams = useCallback(async (): Promise<Dream[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    return (data || []) as Dream[];
  }, [user]);

  const hardDeleteDream = useCallback(async (dream: Dream) => {
    await supabase.from('dream_conversations').delete().eq('dream_id', dream.id);
    await supabase.from('dream_symbols').delete().eq('dream_id', dream.id);

    const imagePath = parseStoragePath(dream.image_url);
    if (imagePath) {
      await supabase.storage.from(imagePath.bucket).remove([imagePath.path]).catch(() => {});
    }
    const audioPath = parseStoragePath(dream.audio_url);
    if (audioPath) {
      await supabase.storage.from(audioPath.bucket).remove([audioPath.path]).catch(() => {});
    }

    const { error } = await supabase.from('dreams').delete().eq('id', dream.id);
    if (error) throw error;
    setDreams(prev => prev.filter(d => d.id !== dream.id));
  }, []);

  const emptyTrash = useCallback(async () => {
    if (!user) return;
    const { data: trashed } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null);
    if (!trashed || trashed.length === 0) return;

    const ids = trashed.map((d: any) => d.id);
    await supabase.from('dream_conversations').delete().in('dream_id', ids);
    await supabase.from('dream_symbols').delete().in('dream_id', ids);

    for (const d of trashed as Dream[]) {
      const imagePath = parseStoragePath(d.image_url);
      if (imagePath) {
        await supabase.storage.from(imagePath.bucket).remove([imagePath.path]).catch(() => {});
      }
      const audioPath = parseStoragePath(d.audio_url);
      if (audioPath) {
        await supabase.storage.from(audioPath.bucket).remove([audioPath.path]).catch(() => {});
      }
    }

    await supabase.from('dreams').delete().in('id', ids);
  }, [user]);

  return {
    dreams,
    loading,
    fetchDreams,
    getDream,
    getDreamSymbols,
    toggleFavorite,
    softDeleteDream,
    restoreDream,
    fetchTrashedDreams,
    hardDeleteDream,
    emptyTrash,
  };
}
