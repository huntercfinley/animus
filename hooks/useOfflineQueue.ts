import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getUnsyncedDreams, markSynced, queueDream, deletesynced } from '@/lib/offline';
import { processDream } from '@/lib/ai';

export function useOfflineQueue() {
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const dreams = await getUnsyncedDreams();
      for (const dream of dreams) {
        try {
          await processDream(dream.transcript, dream.audio_uri);
          await markSynced(dream.id);
        } catch (err) {
          console.warn(`Failed to sync dream ${dream.id}:`, err);
          break;
        }
      }
      await deletesynced();
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) syncQueue();
    });
    syncQueue();
    return unsubscribe;
  }, [syncQueue]);

  const saveDreamOffline = useCallback(async (transcript: string, audioUri: string | null) => {
    return queueDream(transcript, audioUri);
  }, []);

  return { saveDreamOffline, syncQueue };
}
