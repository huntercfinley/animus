import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    };
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    transcriptRef.current = text;
    setState(prev => ({ ...prev, transcript: text }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error);
  });

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '', audioUri: null, duration: 0 }));

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setState(prev => ({ ...prev, error: 'Microphone permission denied' }));
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      try {
        const { granted: speechGranted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (speechGranted) {
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
        }
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
  }, [recorder]);

  const pauseRecording = useCallback(async () => {
    try {
      recorder.pause();
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      if (intervalRef.current) clearInterval(intervalRef.current);
      setState(prev => ({ ...prev, isPaused: true }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to pause: ${err}` }));
    }
  }, [recorder]);

  const resumeRecording = useCallback(async () => {
    try {
      recorder.record();
      try {
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
      } catch {}
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to resume: ${err}` }));
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);

      try { ExpoSpeechRecognitionModule.stop(); } catch {}

      if (recorder.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;

        await setAudioModeAsync({ allowsRecording: false });

        setState(prev => ({ ...prev, isRecording: false, isPaused: false, audioUri: uri }));
        return { transcript: transcriptRef.current, audioUri: uri };
      }

      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
      return { transcript: transcriptRef.current, audioUri: null };
    } catch (err) {
      setState(prev => ({ ...prev, error: `Failed to stop: ${err}`, isRecording: false }));
      return { transcript: transcriptRef.current, audioUri: null };
    }
  }, [recorder]);

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
