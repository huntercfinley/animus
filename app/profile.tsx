import { View, Text, Pressable, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LumenShop } from '@/components/lumen/LumenShop';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';
import type { Dream, ArchetypeSnapshot } from '@/types/database';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [favorites, setFavorites] = useState<Dream[]>([]);
  const [archetype, setArchetype] = useState<ArchetypeSnapshot | null>(null);
  const [shadowCount, setShadowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [favRes, archRes, shadowRes] = await Promise.all([
        supabase
          .from('dreams')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_favorite', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('archetype_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('shadow_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      setFavorites((favRes.data || []) as Dream[]);
      setArchetype((archRes.data as ArchetypeSnapshot | null) ?? null);
      setShadowCount(shadowRes.count ?? 0);
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'profile.fetch' } });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  const handlePickAvatar = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const arrayBuffer = decodeBase64(base64);
      const fileName = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('user-photos')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('user-photos').getPublicUrl(fileName);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'profile.avatarUpload' } });
      Alert.alert('Upload failed', 'Could not update your profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleStartEditUsername = () => {
    setUsernameDraft(profile?.username || '');
    setEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    const candidate = usernameDraft.trim().toLowerCase();

    if (candidate === (profile?.username || '')) {
      setEditingUsername(false);
      return;
    }
    if (!USERNAME_RE.test(candidate)) {
      Alert.alert(
        'Invalid username',
        'Usernames must be 3-20 characters, lowercase letters, numbers, and underscores only.'
      );
      return;
    }

    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: candidate })
        .eq('id', user.id);
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Taken', 'That username is already in use.');
        } else {
          Sentry.captureException(error, { tags: { feature: 'profile.saveUsername' } });
          Alert.alert('Error', 'Could not save username.');
        }
        return;
      }
      await refreshProfile();
      setEditingUsername(false);
    } finally {
      setSavingUsername(false);
    }
  };

  const displayName = profile?.display_name || 'Dreamer';
  const initial = (profile?.display_name?.[0] || user?.email?.[0] || 'a').toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const dreamCount = profile?.dream_count ?? 0;
  const lumenBalance = profile?.lumen_balance ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
            )}
          </View>
        </Pressable>

        {/* Name */}
        <Text style={styles.name}>{displayName}</Text>

        {/* Username */}
        {editingUsername ? (
          <View style={styles.usernameEditRow}>
            <Text style={styles.usernamePrefix}>@</Text>
            <TextInput
              value={usernameDraft}
              onChangeText={(t) => setUsernameDraft(t.toLowerCase())}
              placeholder="username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={20}
              style={styles.usernameInput}
              onSubmitEditing={handleSaveUsername}
              returnKeyType="done"
              editable={!savingUsername}
            />
            <Pressable onPress={handleSaveUsername} disabled={savingUsername} style={styles.usernameSaveBtn}>
              <Text style={styles.usernameSaveText}>{savingUsername ? '...' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleStartEditUsername} style={styles.usernameRow}>
            <Text style={styles.username}>
              {profile?.username ? `@${profile.username}` : 'Set your username'}
            </Text>
            <MaterialIcons name="edit" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
          </Pressable>
        )}

        {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}

        {/* Dream count + Lumen balance */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{dreamCount}</Text>
            <Text style={styles.statLabel}>{dreamCount === 1 ? 'Dream' : 'Dreams'}</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.7 }]}
            onPress={() => setShopOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Lumen shop"
          >
            <View style={styles.lumenValueRow}>
              <MaterialIcons name="auto-awesome" size={22} color={colors.primary} />
              <Text style={styles.statValue}>{lumenBalance}</Text>
            </View>
            <Text style={styles.statLabel}>Lumen · Tap to buy</Text>
          </Pressable>
        </View>

        {/* Dominant Archetype */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="auto-awesome" size={18} color={colors.primary} />
            <Text style={styles.sectionLabel}>Dominant archetype</Text>
          </View>
          {archetype?.dominant ? (
            <>
              <Text style={styles.archetypeName}>{archetype.dominant}</Text>
              {archetype.rising && archetype.rising.length > 0 ? (
                <Text style={styles.archetypeRising}>
                  Rising: {archetype.rising.slice(0, 3).join(' · ')}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyHint}>
              Record a few dreams to let your archetypal pattern emerge.
            </Text>
          )}
        </View>

        {/* Shadow work incentive */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="nightlight-round" size={18} color={colors.primary} />
            <Text style={styles.sectionLabel}>Shadow work</Text>
          </View>
          {shadowCount === 0 ? (
            <>
              <Text style={styles.shadowBody}>
                The shadow holds what we hide from ourselves. Try your first exercise.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.shadowCta, pressed && { opacity: 0.85 }]}
                onPress={() => { router.back(); router.push('/(tabs)/shadow-work'); }}
              >
                <Text style={styles.shadowCtaText}>Start an exercise</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.shadowCount}>
                {shadowCount} {shadowCount === 1 ? 'exercise' : 'exercises'} completed
              </Text>
              <Text style={styles.shadowBody}>Keep exploring — every pass peels back another layer.</Text>
            </>
          )}
        </View>

        {/* Favorite dreams */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="star" size={18} color={colors.primary} />
            <Text style={styles.sectionLabel}>Significant dreams</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
          ) : favorites.length === 0 ? (
            <Text style={styles.emptyHint}>
              Star a dream in your journal to keep it here.
            </Text>
          ) : (
            <View style={styles.favoritesRow}>
              {favorites.map((dream) => (
                <Pressable
                  key={dream.id}
                  style={({ pressed }) => [styles.favoriteTile, pressed && { opacity: 0.85 }]}
                  onPress={() => { router.back(); router.push(`/dream/${dream.id}`); }}
                >
                  {dream.image_url ? (
                    <Image source={{ uri: dream.image_url }} style={styles.favoriteImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.favoriteImage, styles.favoritePlaceholder]}>
                      <MaterialIcons name="nights-stay" size={28} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.favoriteTitle} numberOfLines={2}>
                    {dream.title || 'Untitled'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Private footer */}
        <View style={styles.privateFooter}>
          <MaterialIcons name="lock" size={12} color={colors.textMuted} />
          <Text style={styles.privateText}>Private — only you can see this</Text>
        </View>
      </ScrollView>
      <LumenShop visible={shopOpen} onClose={() => setShopOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerBtn: { minWidth: 56, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },

  // Avatar
  avatarWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    width: 112,
    height: 112,
    borderRadius: 56,
    position: 'relative',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: `${colors.primary}1A`,
    backgroundColor: colors.surfaceContainerLow,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serifBold,
    fontSize: 40,
    color: colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },

  // Name + username
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  username: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    marginTop: 4,
    maxWidth: 280,
  },
  usernamePrefix: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  usernameInput: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  usernameSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  usernameSaveText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },
  memberSince: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statPill: {
    alignItems: 'center',
    minWidth: 96,
  },
  statValue: {
    fontFamily: fonts.serifBold,
    fontSize: 38,
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 44,
  },
  lumenValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.textMuted,
    opacity: 0.25,
  },

  // Section card
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    width: '100%',
    ...shadows.cardLifted,
    shadowColor: 'rgba(81, 79, 129, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Archetype
  archetypeName: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  archetypeRising: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Shadow
  shadowBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  shadowCount: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  shadowCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 12,
  },
  shadowCtaText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },

  // Favorites
  favoritesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  favoriteTile: { flex: 1 },
  favoriteImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  favoritePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteTitle: {
    fontFamily: fonts.serif,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Private footer
  privateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    opacity: 0.6,
  },
  privateText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
