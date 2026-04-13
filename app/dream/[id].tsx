import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Sentry from '@sentry/react-native';
import { useDreams } from '@/hooks/useDreams';
import { OuroborosSpinner } from '@/components/ui/OuroborosSpinner';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const shareRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const loadDream = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [d, s] = await Promise.all([getDream(id), getDreamSymbols(id)]);
      if (!d) {
        setLoadError("We couldn't find this dream. It may have been deleted.");
        return;
      }
      setDream(d);
      setSymbols(s);
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'dream.load' }, extra: { dreamId: id } });
      setLoadError('We couldn\'t load this dream. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id, getDream, getDreamSymbols]);

  useEffect(() => {
    loadDream();
  }, [loadDream]);

  const handleShare = async () => {
    setShowShareCard(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        if (!shareRef.current) {
          setShowShareCard(false);
          return;
        }
        try {
          const uri = await captureRef(shareRef, { format: 'png', quality: 1 });
          await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        } catch (err) {
          Sentry.captureException(err, { tags: { feature: 'dream.share' } });
        } finally {
          setShowShareCard(false);
        }
      });
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerStack}>
          <OuroborosSpinner size={56} />
          <Text style={styles.loading}>Surfacing from the depths...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !dream) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerStack}>
          <MaterialIcons name="cloud-off" size={56} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Can't reach the dreamscape</Text>
          <Text style={styles.errorMessage}>{loadError ?? 'Something went wrong.'}</Text>
          <View style={styles.errorActions}>
            <Pressable onPress={loadDream} style={styles.retryBtn}>
              <MaterialIcons name="refresh" size={18} color={colors.textOnPrimary} />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isLucid = dream.lucidity_level != null && dream.lucidity_level > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Animus</Text>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="ios-share" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image — Stitch: aspect-[4/5] rounded-xl shadow-2xl */}
        {dream.image_url && (
          <View style={styles.heroWrap}>
            <View style={styles.heroContainer}>
              <Image source={{ uri: dream.image_url }} style={styles.heroImage} contentFit="cover" />
              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.heroGradient}
              />
              {/* Lucid badge */}
              {isLucid && (
                <View style={styles.lucidBadge}>
                  <Text style={styles.lucidText}>LUCID</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Dream Content — Stitch: px-8 */}
        <View style={styles.contentSection}>
          <Text style={styles.title}>{dream.title}</Text>
          <Text style={styles.journalText}>{dream.journal_text}</Text>

          {/* Symbols — Stitch: rounded-full border pills */}
          {symbols.length > 0 && (
            <View style={styles.symbolsRow}>
              {symbols.map(s => (
                <View key={s.id} style={styles.symbolChip}>
                  <Text style={styles.symbolText}>{s.symbol}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Deep Zone Transition — short gradient ribbon from surface to deepBg,
            so the deep zone content sits fully on the solid dark background. */}
        <LinearGradient
          colors={[colors.surface, colors.deepBg]}
          style={styles.deepTransition}
        />
        <View style={styles.deepZone}>
          {/* Section header */}
          <View style={styles.deepHeader}>
            <MaterialIcons name="auto-awesome" size={36} color={colors.tertiaryFixedDim} />
            <Text style={styles.deepTitle}>Dream Interpretation</Text>
            <View style={styles.deepDivider} />
          </View>

          {/* Interpretation card — Stitch: bg-tertiary-container/40, backdrop-blur */}
          <View style={styles.deepCard}>
            <Text style={styles.interpretationText}>{dream.interpretation}</Text>

            {/* Action buttons */}
            <View style={styles.actionArea}>
              {/* Go Deeper button */}
              <Pressable
                style={({ pressed }) => [styles.goBtn, pressed && { transform: [{ scale: 1.02 }] }]}
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goBtnGradient}
                >
                  <MaterialIcons name="psychology" size={22} color="#ffffff" />
                  <Text style={styles.goBtnText}>Go Deeper</Text>
                </LinearGradient>
              </Pressable>

              {/* Share button */}
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="ios-share" size={20} color={colors.deepTextPrimary} />
                <Text style={styles.shareBtnText}>Share Dream</Text>
              </Pressable>
            </View>
          </View>

          {/* GoDeeper component (expanded conversation) */}
          <View style={styles.goDeeperWrap}>
            <GoDeeper dreamId={id!} />
          </View>
        </View>

        {showShareCard && (
          <View style={{ position: 'absolute', left: -9999 }}>
            <ShareCardView ref={shareRef} dream={dream} format="1:1" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centerStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loading: {
    fontFamily: fonts.serifItalic,
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  errorTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorMessage: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 14,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backBtnText: {
    fontFamily: fonts.sansMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

  scrollContent: {
    paddingBottom: 80,
  },

  // Hero Image — Stitch: aspect-[4/5] = 0.8 ratio
  heroWrap: {
    paddingHorizontal: 24, // px-6
    marginBottom: 32, // mb-8
  },
  heroContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 12, // rounded-xl
    overflow: 'hidden',
    // shadow-2xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  lucidBadge: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: 'rgba(224, 231, 255, 0.9)', // indigo-100/90
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  lucidText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Content
  contentSection: {
    paddingHorizontal: 32, // px-8
    marginBottom: 64, // mb-16
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 36, // text-4xl
    color: colors.textPrimary,
    marginBottom: 24,
    lineHeight: 42, // leading-tight
    letterSpacing: -0.5, // tracking-tight
  },
  journalText: {
    fontFamily: fonts.sans,
    fontSize: 18, // text-lg
    color: colors.textSecondary,
    lineHeight: 30, // leading-relaxed
    marginBottom: 32,
  },
  symbolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symbolChip: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4D`, // border-outline-variant/30
    backgroundColor: colors.surfaceContainerLow,
  },
  symbolText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.onSecondaryContainer,
  },

  // Deep Zone
  deepTransition: {
    height: 64, // short ribbon: surface → deepBg, then solid deepBg below
  },
  deepZone: {
    backgroundColor: colors.deepBg,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  deepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  deepTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 30, // text-3xl
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 8,
  },
  deepDivider: {
    height: 2,
    width: 48,
    backgroundColor: colors.primaryContainer,
    borderRadius: 999,
  },

  // Deep Card
  deepCard: {
    backgroundColor: colors.deepBgCard, // tertiary-container/40
    borderRadius: 12,
    padding: 32, // p-8
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  interpretationText: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: colors.deepTextPrimary, // tertiary-fixed
    lineHeight: 30,
    fontStyle: 'italic',
  },

  // Actions
  actionArea: {
    marginTop: 48,
    gap: 16,
  },
  goBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: 'rgba(70, 72, 212, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  goBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16, // py-4
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  goBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: '#ffffff',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  shareBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.deepTextPrimary,
  },

  goDeeperWrap: {
    marginTop: 32,
  },
});
