import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Sentry from '@sentry/react-native';
import { useDreams } from '@/hooks/useDreams';
import { BackHeader } from '@/components/ui/BackHeader';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import { formatDreamDate } from '@/lib/formatters';
import type { Dream } from '@/types/database';

export default function TrashScreen() {
  const { fetchTrashedDreams, restoreDream, hardDeleteDream, emptyTrash, fetchDreams } = useDreams();
  const [trashed, setTrashed] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchTrashedDreams();
      setTrashed(rows);
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'trash.load' } });
    } finally {
      setLoading(false);
    }
  }, [fetchTrashedDreams]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = (dream: Dream) => {
    Alert.alert(
      'Restore Dream',
      'This dream will return to your journal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setBusyId(dream.id);
            try {
              await restoreDream(dream.id);
              setTrashed(prev => prev.filter(d => d.id !== dream.id));
              await fetchDreams();
            } catch (err) {
              Sentry.captureException(err, { tags: { feature: 'trash.restore' } });
              Alert.alert('Error', 'Could not restore dream.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteForever = (dream: Dream) => {
    Alert.alert(
      'Delete Forever',
      `"${dream.title || 'Untitled Dream'}" will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setBusyId(dream.id);
            try {
              await hardDeleteDream(dream);
              setTrashed(prev => prev.filter(d => d.id !== dream.id));
            } catch (err) {
              Sentry.captureException(err, { tags: { feature: 'trash.hardDelete' } });
              Alert.alert('Error', 'Could not delete dream.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    Alert.alert(
      'Empty Trash',
      `All ${trashed.length} dream${trashed.length === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await emptyTrash();
              setTrashed([]);
            } catch (err) {
              Sentry.captureException(err, { tags: { feature: 'trash.empty' } });
              Alert.alert('Error', 'Could not empty trash.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Dream }) => {
    const deletedDate = formatDreamDate(item.deleted_at, 'full');
    const isBusy = busyId === item.id;

    return (
      <View style={styles.row}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialIcons name="nights-stay" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title || 'Untitled Dream'}</Text>
          <Text style={styles.rowMeta}>Deleted {deletedDate}</Text>
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.actionBtn, styles.restoreBtn, isBusy && { opacity: 0.5 }]}
              onPress={() => handleRestore(item)}
              disabled={isBusy}
            >
              <MaterialIcons name="restore" size={16} color={colors.primary} />
              <Text style={styles.restoreBtnText}>Restore</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.deleteBtn, isBusy && { opacity: 0.5 }]}
              onPress={() => handleDeleteForever(item)}
              disabled={isBusy}
            >
              <MaterialIcons name="delete-forever" size={16} color={colors.error} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BackHeader
        title="Trash"
        right={trashed.length > 0 ? (
          <Pressable onPress={handleEmptyTrash} style={({ pressed }) => [styles.emptyBtnWrap, pressed && { opacity: 0.8 }]}>
            <Text style={styles.emptyBtnText}>Empty</Text>
          </Pressable>
        ) : undefined}
      />

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : trashed.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="delete-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Trash is empty</Text>
          <Text style={styles.emptyText}>
            Dreams you delete will appear here.{'\n'}You can restore them or delete forever.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>
            Dreams stay in trash until you delete them forever.
          </Text>
          <FlatList
            data={trashed}
            keyExtractor={(d) => d.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  emptyBtnWrap: {
    minWidth: 56,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.error,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textPrimary,
  },
  rowMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  restoreBtn: {
    backgroundColor: `${colors.primary}15`,
  },
  restoreBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.primary,
  },
  deleteBtn: {
    backgroundColor: `${colors.error}15`,
  },
  deleteBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.error,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
