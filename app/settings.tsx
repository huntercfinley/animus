import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { isPremium, packages, purchase, restore } = useSubscription();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/sign-in'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.info}>{user?.email}</Text>
          <Text style={styles.info}>Status: {isPremium ? 'Premium' : 'Free'}</Text>
          <Text style={styles.info}>Dreams: {profile?.dream_count || 0}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <Pressable style={styles.importBtn} onPress={() => router.push('/import')}>
            <Text style={styles.importBtnText}>Import Dreams</Text>
            <Text style={styles.importBtnSub}>ChatGPT, text files, CSV</Text>
          </Pressable>
        </View>

        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upgrade to Premium</Text>
            {packages.map(pkg => (
              <Pressable key={pkg.identifier} style={styles.pkgBtn} onPress={() => purchase(pkg)}>
                <Text style={styles.pkgText}>{pkg.product.title} — {pkg.product.priceString}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.restoreBtn} onPress={restore}>
              <Text style={styles.restoreText}>Restore purchases</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent, marginBottom: spacing.sm },
  info: { color: colors.textSecondary, fontSize: 14, marginBottom: 4 },
  pkgBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.sm, paddingVertical: 12, marginTop: spacing.sm, alignItems: 'center' },
  pkgText: { color: '#fff', fontWeight: '600' },
  restoreBtn: { marginTop: spacing.sm, alignItems: 'center', padding: spacing.sm },
  restoreText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  importBtn: { backgroundColor: colors.bgCard, borderRadius: borderRadius.sm, paddingVertical: 12, paddingHorizontal: spacing.md },
  importBtnText: { color: colors.textPrimary, fontWeight: '500', fontSize: 15 },
  importBtnSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  signOutBtn: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, paddingVertical: 14, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.error },
  signOutText: { color: colors.error, textAlign: 'center', fontWeight: '500' },
});
