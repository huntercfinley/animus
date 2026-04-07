import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface TranscriptOverlayProps {
  transcript: string;
  isRecording: boolean;
  onTranscriptEdit: (text: string) => void;
}

export function TranscriptOverlay({ transcript, isRecording, onTranscriptEdit }: TranscriptOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!transcript && !isRecording) return null;

  return (
    <View style={styles.card}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!transcript && isRecording ? (
          <Text style={styles.placeholder}>Your words will appear here as you speak...</Text>
        ) : isEditing || !isRecording ? (
          <TextInput
            style={styles.input}
            value={transcript}
            onChangeText={onTranscriptEdit}
            multiline
            placeholder="Edit your dream transcript..."
            placeholderTextColor={colors.textMuted}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <Text style={styles.transcript}>{transcript}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 120,
    maxHeight: 260,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  placeholder: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcript: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  input: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 28,
    textAlignVertical: 'top',
  },
});
