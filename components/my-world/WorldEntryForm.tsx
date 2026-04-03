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
      <View style={styles.categoryRow}>
        {CATEGORIES.map(c => (
          <Pressable key={c.value} style={[styles.categoryChip, category === c.value && styles.categoryActive]} onPress={() => setCategory(c.value)}>
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Relationship (e.g. mother, childhood home)" placeholderTextColor={colors.textMuted} value={relationship} onChangeText={setRelationship} />
      <View style={styles.buttonRow}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving || !name.trim()}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  categoryRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryText: { color: colors.textMuted, fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  input: { backgroundColor: colors.bgSurface, color: colors.textPrimary, borderRadius: borderRadius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: { padding: spacing.sm },
  cancelText: { color: colors.textMuted },
  saveBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  saveText: { color: '#fff', fontWeight: '600' },
});
