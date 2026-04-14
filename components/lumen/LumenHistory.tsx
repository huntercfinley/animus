import { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface LumenTx {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  created_at: string;
  metadata: any;
}

const PAGE_SIZE = 30;

const TYPE_LABELS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  initial_grant:      { icon: 'auto-awesome',     label: 'A first offering' },
  shadow_earn:        { icon: 'nightlight-round', label: 'Tended the shadow' },
  monthly_grant:      { icon: 'wb-sunny',         label: 'Premium monthly grant' },
  purchase_small:     { icon: 'shopping-bag',     label: "The Initiate's Pouch" },
  purchase_medium:    { icon: 'shopping-bag',     label: "The Seeker's Purse" },
  purchase_large:     { icon: 'shopping-bag',     label: "The Alchemist's Coffer" },
  purchase_mega:      { icon: 'shopping-bag',     label: "The Philosopher's Stone" },
  spend_go_deeper:    { icon: 'psychology',       label: 'Descended deeper' },
  spend_image_gen:    { icon: 'image',            label: 'Summoned imagery' },
  spend_image_refine: { icon: 'image',            label: 'Refined imagery' },
  spend_insights:     { icon: 'insights',         label: 'Pattern insights' },
  spend_connection:   { icon: 'hub',              label: 'Connected dreams' },
  refund_go_deeper:   { icon: 'replay',           label: 'Refund — Go Deeper' },
  refund_image_gen:   { icon: 'replay',           label: 'Refund — imagery' },
  refund_insights:    { icon: 'replay',           label: 'Refund — insights' },
  refund_connection:  { icon: 'replay',           label: 'Refund — connection' },
  admin_grant:        { icon: 'card-giftcard',    label: 'Granted by Reality Suites' },
};

function formatWhen(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours === 0) {
      const mins = Math.floor(diffMs / 60_000);
      return mins <= 1 ? 'just now' : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function LumenHistory({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<LumenTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadPage = useCallback(async (pageIndex: number, replace: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('lumen_transactions')
        .select('id, type, amount, balance_after, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      const fetched = data || [];
      setItems(prev => (replace ? fetched : [...prev, ...fetched]));
      setHasMore(fetched.length === PAGE_SIZE);
      setPage(pageIndex);
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'lumen.history' } });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    loadPage(0, true);
  }, [visible, loadPage]);

  const renderItem = ({ item }: { item: LumenTx }) => {
    const meta = TYPE_LABELS[item.type] || { icon: 'auto-awesome' as const, label: item.type };
    const positive = item.amount >= 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <MaterialIcons name={meta.icon} size={18} color={colors.tertiaryFixedDim} />
        </View>
        <View style={styles.rowMid}>
          <Text style={styles.rowLabel}>{meta.label}</Text>
          <Text style={styles.rowWhen}>{formatWhen(item.created_at)}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowAmount, positive ? styles.amountPositive : styles.amountNegative]}>
            {positive ? '+' : ''}{item.amount}
          </Text>
          <Text style={styles.rowBalance}>{item.balance_after}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>The Ledger</Text>
            <Text style={styles.subtitle}>A record of the inner work</Text>
          </View>

          {loading && items.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No offerings yet. The work begins.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              style={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              onEndReached={() => { if (hasMore && !loading) loadPage(page + 1, false); }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={loading && items.length > 0 ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : null}
            />
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 36, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.tertiaryContainer}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowMid: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  rowWhen: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  rowAmount: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  amountPositive: {
    color: colors.tertiaryFixedDim,
  },
  amountNegative: {
    color: colors.textSecondary,
  },
  rowBalance: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.3,
  },
  closeBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
