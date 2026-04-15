import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { callEdgeFunction } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { isPremium, packages, purchase, restore } = useSubscription();

  const currentAppearance = (profile?.ai_context as any)?.appearance as string | undefined;
  const [appearance, setAppearance] = useState<string | undefined>(currentAppearance);
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const monthlyPkg = packages.find((p: any) => p.packageType === 'MONTHLY') || packages[0];
  const yearlyPkg = packages.find((p: any) => p.packageType === 'ANNUAL');

  const handleUpgrade = async (pkg: any) => {
    if (!pkg) {
      Alert.alert('Not available', 'Subscription options are still loading. Please try again in a moment.');
      return;
    }
    setPurchasing(true);
    const result = await purchase(pkg);
    setPurchasing(false);
    if (result.status === 'success') {
      Alert.alert('Welcome to Premium', 'Thank you for supporting Animus. Your premium features are now unlocked.');
    } else if (result.status === 'error') {
      Alert.alert('Purchase failed', result.message);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const hasPremium = await restore();
    setRestoring(false);
    Alert.alert(
      hasPremium ? 'Purchases Restored' : 'No purchases found',
      hasPremium
        ? 'Your premium subscription has been restored.'
        : 'We couldn\'t find an active subscription tied to this Apple ID.'
    );
  };

  const handleAnalyzeAppearance = async () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Appearance analysis is available for premium subscribers.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setAppearanceLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const asset of result.assets.slice(0, 3)) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const arrayBuffer = decodeBase64(base64);
        const fileName = `${user!.id}/appearance-${Date.now()}-${photoUrls.length}.jpg`;
        const { error } = await supabase.storage.from('user-photos').upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('user-photos').getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }
      if (photoUrls.length === 0) throw new Error('Failed to upload photos');
      const res = await callEdgeFunction<{ appearance: string }>('analyze-appearance', { photo_urls: photoUrls });
      setAppearance(res.appearance);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setAppearanceLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/sign-in'); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all dream data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type your email to confirm: ' + (user?.email || ''),
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await callEdgeFunction('delete-account', {});
                      await signOut();
                      router.replace('/(auth)/sign-in');
                    } catch (err) {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const uid = user.id;
      const { data: dreams } = await supabase.from('dreams').select('*').eq('user_id', uid).order('recorded_at', { ascending: false });
      const { data: symbols } = await supabase.from('dream_symbols').select('*').eq('user_id', uid);
      const { data: worldEntries } = await supabase.from('world_entries').select('*').eq('user_id', uid);
      const exportData = { exported_at: new Date().toISOString(), dreams: dreams || [], symbols: symbols || [], world_entries: worldEntries || [] };
      const json = JSON.stringify(exportData, null, 2);
      const fileUri = FileSystem.documentDirectory + 'animus-export.json';
      await FileSystem.writeAsStringAsync(fileUri, json);
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Animus Data' });
    } catch (err) {
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  // Get user initial for avatar
  const initial = profile?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A';
  const displayName = profile?.display_name || 'Dreamer';
  const dreamCount = profile?.dream_count || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={18} color={colors.secondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account Section */}
        <View style={styles.accountCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{displayName}</Text>
            <Text style={styles.accountEmail}>{user?.email}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.outlineVariant} />
        </View>

        {/* Subscription Section */}
        <View style={styles.subscriptionCard}>
          <View>
            <Text style={styles.planTitle}>{isPremium ? 'Premium Plan' : 'Free Plan'}</Text>
            <Text style={styles.planSubtext}>{dreamCount} dreams analyzed this month</Text>
          </View>
          {!isPremium && (
            <Pressable
              style={({ pressed }) => [
                styles.upgradeBtn,
                pressed && { transform: [{ scale: 0.95 }] },
                (!monthlyPkg || purchasing) && { opacity: 0.5 },
              ]}
              onPress={() => handleUpgrade(yearlyPkg || monthlyPkg)}
              disabled={!monthlyPkg || purchasing}
            >
              <Text style={styles.upgradeBtnText}>
                {purchasing ? 'Processing...' : 'Upgrade'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Appearance Section — analyze-appearance edge function (premium) */}
        <View style={styles.appearanceSection}>
          <Text style={styles.sectionLabel}>APPEARING IN DREAMS</Text>
          <View style={styles.appearanceCard}>
            {appearance ? (
              <>
                <View style={styles.appearanceHeader}>
                  <MaterialIcons name="face" size={20} color={colors.primary} />
                  <Text style={styles.appearanceTitle}>AI Description</Text>
                </View>
                <Text style={styles.appearanceText}>{appearance}</Text>
                <Pressable
                  style={[styles.appearanceBtn, appearanceLoading && { opacity: 0.5 }]}
                  onPress={handleAnalyzeAppearance}
                  disabled={appearanceLoading}
                >
                  <Text style={styles.appearanceBtnText}>
                    {appearanceLoading ? 'Analyzing...' : 'Update Photos'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <MaterialIcons name="add-a-photo" size={32} color={`${colors.primary}66`} style={{ marginBottom: 12 }} />
                <Text style={styles.appearanceEmpty}>
                  Upload selfies so Animus can include you in dream imagery.
                </Text>
                <Pressable
                  style={[styles.appearanceBtn, appearanceLoading && { opacity: 0.5 }]}
                  onPress={handleAnalyzeAppearance}
                  disabled={appearanceLoading}
                >
                  <Text style={styles.appearanceBtnText}>
                    {appearanceLoading ? 'Analyzing...' : 'Add Photos'}
                  </Text>
                </Pressable>
                {!isPremium && (
                  <Text style={styles.premiumNote}>Premium feature</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.dataCard}>
            {/* Import Dreams */}
            <Pressable
              style={({ pressed }) => [styles.dataRow, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={() => router.push('/import')}
            >
              <View style={styles.dataRowLeft}>
                <MaterialIcons name="file-upload" size={22} color={colors.secondary} style={{ opacity: 0.7 }} />
                <Text style={styles.dataRowText}>Import Dreams</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={16} color={colors.outlineVariant} />
            </Pressable>

            {/* Export Data */}
            <Pressable
              style={({ pressed }) => [
                styles.dataRow,
                { backgroundColor: `${colors.surfaceContainerHigh}80` },
                pressed && { backgroundColor: colors.surfaceContainerHigh },
              ]}
              onPress={handleExportData}
            >
              <View style={styles.dataRowLeft}>
                <MaterialIcons name="file-download" size={22} color={colors.secondary} style={{ opacity: 0.7 }} />
                <Text style={styles.dataRowText}>Export Data</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={16} color={colors.outlineVariant} />
            </Pressable>

            {/* Trash */}
            <Pressable
              style={({ pressed }) => [styles.dataRow, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={() => router.push('/trash')}
            >
              <View style={styles.dataRowLeft}>
                <MaterialIcons name="delete-outline" size={22} color={colors.secondary} style={{ opacity: 0.7 }} />
                <Text style={styles.dataRowText}>Trash</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={16} color={colors.outlineVariant} />
            </Pressable>
          </View>
        </View>

        {/* Aesthetic Quote */}
        <View style={styles.quoteCard}>
          <LinearGradient
            colors={[`${colors.primaryContainer}40`, `${colors.secondaryContainer}60`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quoteGradient}
          />
          <View style={styles.quoteOverlay}>
            <Text style={styles.quoteText}>
              "The dream is the small hidden door in the deepest and most intimate sanctum of the soul."
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutWrapper}>
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Restore Purchases (if not premium) */}
        {!isPremium && (
          <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>
              {restoring ? 'Restoring...' : 'Restore purchases'}
            </Text>
          </Pressable>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ANIMUS V1.0 · REALITY SUITES</Text>
          <Pressable onPress={() => Linking.openURL('https://huntercfinley.github.io/animus/privacy-policy.html')}>
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </Pressable>
        </View>

        {/* Delete Account — isolated at the very bottom to prevent mis-taps */}
        <Pressable
          style={({ pressed }) => [styles.deleteAccountLink, pressed && { opacity: 0.5 }]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteAccountLinkText}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    maxWidth: 672, // max-w-2xl
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24, // px-6
    paddingTop: 48, // pt-12
    paddingBottom: 96, // pb-24
  },

  // Header
  header: {
    marginBottom: 40, // mb-10
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16, // mb-4
  },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.secondary,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 30, // text-3xl
    color: colors.textPrimary,
    letterSpacing: -0.5, // tracking-tight
  },

  // Account Card
  accountCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32, // mb-8
    ...shadows.cardLifted,
    shadowColor: 'rgba(81, 79, 129, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
  },
  avatarRing: {
    borderRadius: 999,
    padding: 4, // ring-4
    backgroundColor: colors.surfaceContainerLowest,
  },
  avatar: {
    width: 48, // w-12
    height: 48, // h-12
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: '#ffffff',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  accountEmail: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Subscription Card
  subscriptionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 48, // mb-12
    ...shadows.cardLifted,
    shadowColor: 'rgba(81, 79, 129, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
  },
  planTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  planSubtext: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  upgradeBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 24, // px-6
    paddingVertical: 8, // py-2
    borderRadius: 999, // rounded-full
    shadowColor: `${colors.secondary}33`, // shadow-secondary/20
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: '#ffffff',
  },

  // Appearance
  appearanceSection: {
    marginBottom: 48,
  },
  appearanceCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    ...shadows.cardLifted,
    shadowColor: 'rgba(81, 79, 129, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
  },
  appearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  appearanceTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  appearanceText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  appearanceEmpty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  appearanceBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  appearanceBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: '#ffffff',
  },
  premiumNote: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Data Section
  dataSection: {
    marginBottom: 48, // mb-12
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.5, // tracking-[1.5px]
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 4, // px-1
    marginBottom: 12, // mb-3
  },
  dataCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.cardLifted,
    shadowColor: 'rgba(81, 79, 129, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20, // p-5
    backgroundColor: colors.surfaceContainerLow,
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  dataRowText: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.textPrimary,
  },
  // Quote Image
  quoteCard: {
    width: '100%',
    height: 128, // h-32
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 48, // mb-12
    position: 'relative',
  },
  quoteGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  quoteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  quoteText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },

  // Sign Out
  signOutWrapper: {
    alignItems: 'center',
    marginBottom: 64, // mb-16
  },
  signOutBtn: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 48, // px-12
    paddingVertical: 12, // py-3
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}1A`, // /10 opacity
  },
  signOutText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.onSecondaryContainer || '#514f81',
  },

  // Restore
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 32,
  },
  restoreText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 3, // tracking-widest
    color: `${colors.textSecondary}80`, // /50 opacity
    textTransform: 'uppercase',
  },
  privacyLink: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline' as const,
    marginTop: 8,
  },

  // Delete Account — visually isolated, small and understated
  deleteAccountLink: {
    alignSelf: 'center',
    marginTop: 64,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteAccountLinkText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: `${colors.error}99`,
    textDecorationLine: 'underline' as const,
  },
});
