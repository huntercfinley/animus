import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useRecording } from '@/hooks/useRecording';
import { RecordButton } from '@/components/recording/RecordButton';
import { TranscriptOverlay } from '@/components/recording/TranscriptOverlay';
import { colors, fonts, spacing } from '@/constants/theme';
import NetInfo from '@react-native-community/netinfo';
import { processDream } from '@/lib/ai';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export default function RecordScreen() {
  const {
    isRecording, isPaused, transcript, duration, error,
    startRecording, pauseRecording, resumeRecording, stopRecording, updateTranscript,
  } = useRecording();
  const [saving, setSaving] = useState(false);
  const { saveDreamOffline } = useOfflineQueue();

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRecordPress = async () => {
    if (!isRecording) {
      await startRecording();
    } else if (isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    const result = await stopRecording();

    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const dream = await processDream(result.transcript, result.audioUri ?? null);
        router.push({ pathname: '/dream/[id]', params: { id: dream.id } });
      } else {
        await saveDreamOffline(result.transcript, result.audioUri ?? null);
        alert('Dream saved locally. It will be processed when you\'re back online.');
      }
    } catch (err) {
      await saveDreamOffline(result.transcript, result.audioUri ?? null);
      alert('Dream saved locally. It will be processed shortly.');
    }
    setSaving(false);
  };

  const handleDiscard = async () => {
    await stopRecording();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {isRecording && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}

        {!isRecording && !transcript && (
          <Text style={styles.emptyText}>Cast your line.{'\n'}What did you dream last night?</Text>
        )}

        <TranscriptOverlay
          transcript={transcript}
          isRecording={isRecording}
          onTranscriptEdit={updateTranscript}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.controls}>
          {isRecording && (
            <Pressable style={styles.discardButton} onPress={handleDiscard}>
              <Text style={styles.discardText}>Discard</Text>
            </Pressable>
          )}

          <RecordButton
            isRecording={isRecording}
            isPaused={isPaused}
            onPress={handleRecordPress}
          />

          {isRecording && (
            <Pressable
              style={[styles.saveButton, !transcript.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!transcript.trim() || saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          )}
        </View>

        {isPaused && (
          <Text style={styles.hint}>Paused — tap the button to resume</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurfaceWarm },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  duration: { fontSize: 48, color: colors.textPrimary, fontVariant: ['tabular-nums'], marginBottom: spacing.lg },
  emptyText: { fontFamily: fonts.serif, fontSize: 20, color: colors.textMuted, textAlign: 'center', lineHeight: 30, fontStyle: 'italic', marginBottom: spacing.xxl },
  error: { color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.xxl },
  discardButton: { padding: spacing.md },
  discardText: { color: colors.textMuted, fontSize: 14 },
  saveButton: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveButtonDisabled: { opacity: 0.3 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: spacing.md, fontStyle: 'italic' },
});
