import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { colors, fonts } from '@/constants/theme';
import type { Dream } from '@/types/database';

interface ShareCardViewProps {
  dream: Dream;
  format: '9:16' | '1:1' | '16:9';
}

const SIZES = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export const ShareCardView = forwardRef<View, ShareCardViewProps>(({ dream, format }, ref) => {
  const size = SIZES[format];
  const scale = 0.3;

  return (
    <View ref={ref} style={[styles.card, { width: size.width * scale, height: size.height * scale }]} collapsable={false}>
      {dream.image_url && (
        <Image source={{ uri: dream.image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      )}
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={[styles.title, { fontSize: 18 * scale * 3 }]}>{dream.title}</Text>
        {dream.interpretation && (
          <Text style={[styles.excerpt, { fontSize: 10 * scale * 3 }]} numberOfLines={2}>
            {dream.interpretation.split('.').slice(0, 2).join('.') + '.'}
          </Text>
        )}
        <View style={styles.branding}>
          <Text style={[styles.logo, { fontSize: 12 * scale * 3 }]}>ANIMUS</Text>
          <Text style={[styles.tagline, { fontSize: 8 * scale * 3 }]}>Reveal what lies beneath.</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 12, backgroundColor: colors.deepBg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 8, 18, 0.4)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  title: { fontFamily: fonts.serif, color: '#fff', marginBottom: 8 },
  excerpt: { color: 'rgba(255,255,255,0.8)', lineHeight: 16, marginBottom: 16, fontStyle: 'italic' },
  branding: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 8 },
  logo: { color: colors.accent, fontWeight: '700', letterSpacing: 4 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 2 },
});
