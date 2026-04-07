import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/constants/theme';
import type { WorldEntry } from '@/types/database';

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  person: 'person',
  place: 'landscape',
  theme: 'psychology',
  life_event: 'event',
};

interface WorldEntryRowProps {
  entry: WorldEntry;
  isEven: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { name?: string; description?: string }) => Promise<any>;
}

export function WorldEntryCard({ entry, isEven, onDelete, onUpdate }: WorldEntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editDesc, setEditDesc] = useState(entry.description || '');

  const handleSave = async () => {
    if (!editName.trim()) return;
    await onUpdate(entry.id, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditDesc(entry.description || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={[styles.editRow, isEven && styles.rowTinted]}>
        <MaterialIcons
          name={CATEGORY_ICONS[entry.category] || 'psychology'}
          size={20}
          color={`${colors.primary}99`}
          style={styles.icon}
        />
        <View style={styles.editFields}>
          <TextInput
            style={styles.editInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TextInput
            style={styles.editInput}
            value={editDesc}
            onChangeText={setEditDesc}
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isEven && styles.rowTinted]}>
      <MaterialIcons
        name={CATEGORY_ICONS[entry.category] || 'psychology'}
        size={20}
        color={`${colors.primary}99`}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
        {entry.description ? (
          <>
            <Text style={styles.dash}> — </Text>
            <Text style={styles.desc} numberOfLines={1}>{entry.description}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => setEditing(true)} hitSlop={8}>
          <MaterialIcons name="edit" size={20} color={colors.outline} />
        </Pressable>
        <Pressable onPress={() => onDelete(entry.id)} hitSlop={8}>
          <MaterialIcons name="delete" size={20} color={colors.outline} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Row — Stitch: h-[52px] flex items-center px-3 border-b border-outline-variant/20
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}33`, // outline-variant/20
  },
  rowTinted: {
    backgroundColor: `${colors.surfaceContainerLow}4D`, // surface-container-low/30
  },
  icon: {
    marginRight: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    flexShrink: 0,
  },
  dash: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.outline,
    marginHorizontal: 4,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 16,
  },

  // Edit mode
  editRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}33`,
  },
  editFields: {
    flex: 1,
    gap: 8,
  },
  editInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  cancelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 6,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  saveText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.textOnPrimary,
  },
});
