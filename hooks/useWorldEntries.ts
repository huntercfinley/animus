import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { WorldEntry, WorldEntryCategory } from '@/types/database';

export function useWorldEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorldEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('world_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (entry: { category: WorldEntryCategory; name: string; description?: string; relationship?: string }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('world_entries')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single();
    if (data) setEntries(prev => [data, ...prev]);
    return { data, error };
  }, [user]);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from('world_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const byCategory = (cat: WorldEntryCategory) => entries.filter(e => e.category === cat);

  return { entries, loading, fetchEntries, addEntry, deleteEntry, byCategory };
}
