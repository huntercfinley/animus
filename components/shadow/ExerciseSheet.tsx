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
      <View style={styles.handle} />
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
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={() => { onSave(response); onClose(); }}>
          <Text style={styles.saveText}>Save Reflection</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.deepBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(196, 181, 253, 0.3)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.deepAccent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  prompt: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.deepTextPrimary,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.deepBgCard,
    color: colors.deepTextPrimary,
    fontFamily: fonts.serif,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  closeBtn: { padding: spacing.sm },
  closeText: {
    fontFamily: fonts.sansMedium,
    color: colors.deepTextSecondary,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 14,
  },
});
