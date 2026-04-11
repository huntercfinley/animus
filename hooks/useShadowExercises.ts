import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { callEdgeFunction } from '@/lib/ai';
import { useAuth } from '@/hooks/useAuth';
import type { ShadowExercise } from '@/types/database';

export function useShadowExercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ShadowExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('shadow_exercises').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setExercises(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const generateExercise = useCallback(async (dreamId?: string, symbols?: any[]) => {
    const exercise = await callEdgeFunction<ShadowExercise>('shadow-exercise', { dream_id: dreamId, symbols });
    if (exercise) setExercises(prev => [exercise, ...prev]);
    return exercise;
  }, []);

  const saveResponse = useCallback(async (exerciseId: string, response: string) => {
    await supabase.from('shadow_exercises').update({ response }).eq('id', exerciseId);
    setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, response } : e));
  }, []);

  return { exercises, loading, fetchExercises, generateExercise, saveResponse };
}
