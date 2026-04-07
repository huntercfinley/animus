import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { WorldEntryCategory } from '@/types/database';

const CATEGORIES: { value: WorldEntryCategory; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'place', label: 'Place' },
  { value: 'theme', label: 'Theme' },
  { value: 'life_event', label: 'Life Event' },
];

interface WorldEntryFormProps {
  onSubmit: (entry: { category: WorldEntryCategory; name: string; description?: string; relationship?: string }) => Promise<any>;
  onCancel: () => void;
}

export function WorldEntryForm({ onSubmit, onCancel }: WorldEntryFormProps) {
  const [category, setCategory] = useState<WorldEntryCategory>('person');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit({
      category,
      name: name.trim(),
      description: description.trim() || undefined,
      relationship: relationship.trim() || undefined,
    });
    setSaving(false);
    setName(''); setDescription(''); setRelationship('');
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add to Your World</Text>

      {/* Category pills */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map(c => (
          <Pressable
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Relationship (e.g. mother, childhood home)"
        placeholderTextColor={colors.textMuted}
        value={relationship}
        onChangeText={setRelationship}
      />

      <View style={styles.buttonRow}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, (saving || !name.trim()) && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={saving || !name.trim()}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Entry'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  formTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  categoryActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontFamily: fonts.sansMedium,
    color: colors.textMuted,
    fontSize: 13,
  },
  categoryTextActive: {
    color: colors.textOnPrimary,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing.md },
  cancelText: {
    fontFamily: fonts.sansMedium,
    color: colors.textMuted,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 14,
  },
});
