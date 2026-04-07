import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useRecording } from '@/hooks/useRecording';
import { RecordButton } from '@/components/recording/RecordButton';
import { TranscriptOverlay } from '@/components/recording/TranscriptOverlay';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />

      {/* Ambient glow circles */}
      <View style={styles.glowLeft} />
      <View style={styles.glowRight} />

      <View style={styles.inner}>
        {/* Duration display */}
        {isRecording && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}

        {/* Transcription Card — Stitch: bg-surface-container-lowest rounded-xl p-8 min-h-[200px] */}
        {!isRecording && !transcript ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.placeholder}>
              Your words will appear here as you speak...
            </Text>
          </View>
        ) : (
          <TranscriptOverlay
            transcript={transcript}
            isRecording={isRecording}
            onTranscriptEdit={updateTranscript}
          />
        )}

        {/* Audio Visualizer — Stitch: 5 bars with varying heights */}
        {!isRecording && !transcript && (
          <View style={styles.visualizer}>
            <View style={[styles.vizBar, { height: 8, backgroundColor: `${colors.primary}33` }]} />
            <View style={[styles.vizBar, { height: 16, backgroundColor: `${colors.primary}4D` }]} />
            <View style={[styles.vizBar, { height: 24, backgroundColor: `${colors.primary}66` }]} />
            <View style={[styles.vizBar, { height: 12, backgroundColor: `${colors.primary}4D` }]} />
            <View style={[styles.vizBar, { height: 20, backgroundColor: `${colors.primary}33` }]} />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Record button — Stitch: w-32 h-32 (128px) */}
        <RecordButton
          isRecording={isRecording}
          isPaused={isPaused}
          onPress={handleRecordPress}
          size={128}
        />

        {/* Labels */}
        {!isRecording ? (
          <Text style={styles.label}>Tap to start recording</Text>
        ) : isPaused ? (
          <Text style={styles.label}>Paused — tap to resume</Text>
        ) : (
          <Text style={styles.label}>Recording...</Text>
        )}
        <Text style={styles.zoneLabel}>CONSCIOUS ZONE</Text>

        {/* Action buttons when recording */}
        {isRecording && (
          <View style={styles.actions}>
            <Pressable style={styles.discardBtn} onPress={handleDiscard}>
              <Text style={styles.discardText}>Discard</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !transcript.trim() && { opacity: 0.3 }]}
              onPress={handleSave}
              disabled={!transcript.trim() || saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Dream'}</Text>
            </Pressable>
          </View>
        )}

        {/* Switch to text */}
        {!isRecording && (
          <Pressable style={styles.switchBtn}>
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={styles.switchText}>Switch to Text</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // Ambient glow — Stitch decorative blurred circles
  glowLeft: {
    position: 'absolute',
    top: '50%',
    left: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: `${colors.primary}0D`, // primary/5
  },
  glowRight: {
    position: 'absolute',
    bottom: '25%',
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${colors.secondary}0D`, // secondary/5
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24, // px-6
    paddingBottom: 128, // pb-32
  },
  duration: {
    fontFamily: fonts.sans,
    fontSize: 48,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.lg,
    letterSpacing: -1,
  },
  // Transcription Card — Stitch
  transcriptCard: {
    width: '100%',
    maxWidth: 512, // max-w-lg
    minHeight: 200,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12, // rounded-xl per Stitch (xl = 1.5rem but cards use 12)
    padding: 32, // p-8
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 64, // mb-16
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}26`, // border-outline-variant/15
    // dream-shadow
    shadowColor: 'rgba(81, 79, 129, 1)',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 4,
  },
  placeholder: {
    fontFamily: fonts.serifItalic, // font-headline italic
    fontSize: 20, // text-xl
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 30, // leading-relaxed
    opacity: 0.6,
  },
  // Visualizer bars — Stitch
  visualizer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4, // gap-1
    height: 32, // h-8
    marginBottom: 64,
    marginTop: -32,
  },
  vizBar: {
    width: 4, // w-1
    borderRadius: 999,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 14,
  },
  // Labels — Stitch
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14, // text-sm
    color: colors.textSecondary,
    letterSpacing: 0.5, // tracking-wide
    textTransform: 'uppercase',
    marginTop: 32, // mt-8
  },
  zoneLabel: {
    fontFamily: fonts.serifItalic, // font-headline italic
    fontSize: 18, // text-lg
    color: colors.primary,
    letterSpacing: 3, // tracking-widest
    marginTop: 16,
    marginBottom: spacing.lg,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  discardBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  discardText: {
    fontFamily: fonts.sansMedium,
    color: colors.textMuted,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 15,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  switchText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.primary,
  },
});
