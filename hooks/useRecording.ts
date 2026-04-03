import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  transcript: string;
  audioUri: string | null;
  duration: number;
  error: string | null;
}

export function useRecording() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    transcript: '',
    audioUri: null,
    duration: 0,
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');

  const onSpeechResults = useCallback((e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    transcriptRef.current = text;
    setState(prev => ({ ...prev, transcript: text }));
  }, []);

  const onSpeechError = useCallback((e: { error?: { message?: string } }) => {
    console.warn('Speech recognition error:', e.error?.message);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '', audioUri: null, duration: 0 }));

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setState(prev => ({ ...prev, error: 'Microphone permission denied' }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      try {
        await Voice.start('en-US');
      } catch {
        console.warn('Voice recognition unavailable — recording audio only');
      }

      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to start recording: ${err}` }));
    }
  }, [onSpeechResults, onSpeechError]);

  const pauseRecording = useCallback(async () => {
    try {
      await recordingRef.current?.pauseAsync();
      try { await Voice.stop(); } catch {}
      if (intervalRef.current) clearInterval(intervalRef.current);
      setState(prev => ({ ...prev, isPaused: true }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to pause: ${err}` }));
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      await recordingRef.current?.startAsync();
      try {
        Voice.onSpeechResults = onSpeechResults;
        await Voice.start('en-US');
      } catch {}
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to resume: ${err}` }));
    }
  }, [onSpeechResults]);

  const stopRecording = useCallback(async () => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);

      try { await Voice.stop(); await Voice.destroy(); } catch {}

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        setState(prev => ({ ...prev, isRecording: false, isPaused: false, audioUri: uri }));
        return { transcript: transcriptRef.current, audioUri: uri };
      }

      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
      return { transcript: transcriptRef.current, audioUri: null };
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to stop: ${err}`, isRecording: false }));
      return { transcript: transcriptRef.current, audioUri: null };
    }
  }, []);

  const updateTranscript = useCallback((text: string) => {
    transcriptRef.current = text;
    setState(prev => ({ ...prev, transcript: text }));
  }, []);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateTranscript,
  };
}
