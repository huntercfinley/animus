import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useDreams } from '@/hooks/useDreams';
import { Image } from 'expo-image';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Dream, DreamSymbol } from '@/types/database';
import { GoDeeper } from '@/components/interpretation/GoDeeper';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ShareCardView } from '@/components/sharing/ShareCardView';

export default function DreamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDream, getDreamSymbols } = useDreams();
  const [dream, setDream] = useState<Dream | null>(null);
  const [symbols, setSymbols] = useState<DreamSymbol[]>([]);
  const shareRef = useRef<View>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDream(id).then(setDream);
    getDreamSymbols(id).then(setSymbols);
  }, [id, getDream, getDreamSymbols]);

  const handleShare = async () => {
    setShowShareCard(true);
    setTimeout(async () => {
      try {
        const uri = await captureRef(shareRef, { format: 'png', quality: 1 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } catch (err) {
        console.warn('Share failed:', err);
      }
      setShowShareCard(false);
    }, 100);
  };

  if (!dream) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Surfacing from the depths...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {dream.image_url && (
        <Image source={{ uri: dream.image_url }} style={styles.image} contentFit="cover" />
      )}

      <Text style={styles.title}>{dream.title}</Text>
      <Pressable onPress={handleShare} style={styles.shareBtn}><Text style={styles.shareText}>Share</Text></Pressable>

      <Text style={styles.date}>
        {new Date(dream.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>

      <Text style={styles.journalText}>{dream.journal_text}</Text>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Interpretation</Text>
      <Text style={styles.interpretation}>{dream.interpretation}</Text>

      {symbols.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Symbols</Text>
          <View style={styles.symbolsRow}>
            {symbols.map(s => (
              <View key={s.id} style={styles.symbolChip}>
                <Text style={styles.symbolText}>{s.symbol}</Text>
                <Text style={styles.archetypeText}>{s.archetype}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.divider} />
      <GoDeeper dreamId={id!} />
      {showShareCard && (
        <View style={{ position: 'absolute', left: -9999 }}>
          <ShareCardView ref={shareRef} dream={dream} format="1:1" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  content: { paddingBottom: 60 },
  loading: { fontFamily: fonts.serif, fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 100, fontStyle: 'italic' },
  image: { width: '100%', height: 300 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.sm },
  date: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  journalText: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, lineHeight: 30, paddingHorizontal: spacing.lg },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, marginHorizontal: spacing.lg },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  interpretation: { fontFamily: fonts.serif, fontSize: 16, color: colors.textSecondary, lineHeight: 26, paddingHorizontal: spacing.lg },
  symbolsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  symbolChip: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  symbolText: { color: colors.textPrimary, fontSize: 14 },
  archetypeText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  shareBtn: { alignSelf: 'flex-end', marginRight: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.bgCard, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  shareText: { color: colors.accent, fontSize: 13, fontWeight: '500' },
});
