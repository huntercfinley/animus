import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  subtitle?: string;
}

export function ScreenHeader({ subtitle }: ScreenHeaderProps) {
  const { profile } = useAuth();
  const initial = profile?.display_name?.[0]?.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      {/* Profile avatar */}
      <Pressable
        style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
        onPress={() => router.push('/profile')}
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </Pressable>

      {/* App title — italic serif per Stitch */}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>Animus</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Settings icon */}
      <Pressable
        style={({ pressed }) => [styles.gearWrap, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
        onPress={() => router.push('/settings')}
      >
        <MaterialIcons name="settings" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatarWrap: {
    width: 40, // w-10
    height: 40, // h-10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: `${colors.primary}1A`, // border-primary/10
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${colors.primary}1A`,
  },
  avatarInitial: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.serifItalic, // italic per Stitch
    fontSize: 24, // text-2xl
    color: colors.textPrimary,
    letterSpacing: -0.5, // tracking-tight
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -2,
  },
  gearWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
