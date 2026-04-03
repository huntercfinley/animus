import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface ExerciseSheetProps {
  prompt: string;
  existingResponse?: string | null;
  onSave: (response: string) => void;
  onClose: () => void;
}

export function ExerciseSheet({ prompt, existingResponse, onSave, onClose }: ExerciseSheetProps) {
  const [response, setResponse] = useState(existingResponse || '');

  return (
    <View style={styles.sheet}>
      <Text style={styles.label}>Dive deeper</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      <TextInput
        style={styles.input}
        placeholder="Write your reflection..."
        placeholderTextColor={colors.deepTextSecondary}
        value={response}
        onChangeText={setResponse}
        multiline
        numberOfLines={8}
        autoFocus
      />
      <View style={styles.buttonRow}>
        <Pressable style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
        <Pressable style={styles.saveBtn} onPress={() => { onSave(response); onClose(); }}>
          <Text style={styles.saveText}>Save reflection</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.deepBg, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.deepBorder },
  label: { fontFamily: fonts.serif, fontSize: 14, color: colors.deepAccent, fontStyle: 'italic', marginBottom: spacing.sm },
  prompt: { fontFamily: fonts.serif, fontSize: 18, color: colors.deepTextPrimary, lineHeight: 28, marginBottom: spacing.lg },
  input: { backgroundColor: colors.deepBgCard, color: colors.deepTextPrimary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, lineHeight: 24, minHeight: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.deepBorder },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  closeBtn: { padding: spacing.sm },
  closeText: { color: colors.deepTextSecondary },
  saveBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingHorizontal: 24, paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '600' },
});
