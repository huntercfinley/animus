import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { colors, fonts } from '@/constants/theme';

interface TranscriptOverlayProps {
  transcript: string;
  isRecording: boolean;
  onTranscriptEdit: (text: string) => void;
}

export function TranscriptOverlay({ transcript, isRecording, onTranscriptEdit }: TranscriptOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!transcript && isRecording) {
    return (
      <View style={styles.container}>
        <Text style={styles.listening}>Listening...</Text>
      </View>
    );
  }

  if (!transcript) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isEditing || !isRecording ? (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxHeight: 300 },
  content: { padding: 16 },
  listening: { fontFamily: fonts.serif, fontSize: 16, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  transcript: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 28 },
  input: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 28, textAlignVertical: 'top' },
});
