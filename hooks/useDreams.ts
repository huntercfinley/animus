import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Dream, DreamSymbol } from '@/types/database';

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

  return { dreams, loading, fetchDreams, getDream, getDreamSymbols, toggleFavorite };
}
