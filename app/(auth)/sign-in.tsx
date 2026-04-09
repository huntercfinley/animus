import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, borderRadius, shadows } from '@/constants/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!identifier.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(identifier.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Background glow elements */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="cloud-queue" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>ANIMUS</Text>
            <Text style={styles.tagline}>
              Re-enter the space where your conscious and subconscious meet.
            </Text>
          </View>

          {/* Auth Form Card */}
          <View style={styles.card}>
            {error && <Text style={styles.error}>{error}</Text>}

            {/* Email or Username Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL OR USERNAME</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="email or username"
                  placeholderTextColor={`${colors.outline}80`}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="username"
                />
                <MaterialIcons
                  name="person-outline"
                  size={22}
                  color={`${colors.outline}4D`}
                  style={styles.inputIcon}
                />
              </View>
            </View>

            {/* Password Input Group */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <Pressable>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </Pressable>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={`${colors.outline}80`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
                <MaterialIcons
                  name="lock-open"
                  size={22}
                  color={`${colors.outline}4D`}
                  style={styles.inputIcon}
                />
              </View>
            </View>

            {/* Sign In Button */}
            <View style={styles.buttonWrapper}>
              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [
                  styles.btnOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                  loading && { opacity: 0.6 },
                ]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.textOnPrimary} />
                </LinearGradient>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Return to your ethereal archive.</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Auth */}
            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn}>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText}>Google</Text>
              </Pressable>
              <Pressable style={styles.socialBtn}>
                <MaterialIcons name="apple" size={18} color={colors.textSecondary} />
                <Text style={styles.socialText}>Apple</Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Seeking entry for the first time?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // Background glow circles (matches Stitch radial gradients)
  glowTopLeft: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 9999,
    backgroundColor: `${colors.primaryFixed}33`, // 20% opacity
    // blur effect approximated with large border radius
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '50%',
    height: '50%',
    borderRadius: 9999,
    backgroundColor: `${colors.tertiaryFixed}4D`, // 30% opacity
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    gap: 48, // space-y-12 = 48px
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 16, // space-y-4
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // mb-6 minus gap
    ...shadows.cardLifted,
    shadowColor: `${colors.primary}0D`, // shadow-primary/5
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 48, // text-5xl
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1, // tracking-tighter
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 18, // text-lg
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 26,
    paddingHorizontal: 16,
  },

  // Card (glassmorphism)
  card: {
    backgroundColor: `${colors.surfaceContainerLowest}B3`, // /70 opacity
    borderRadius: 40, // rounded-[2.5rem]
    padding: 40, // p-10
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...shadows.cardLifted,
    shadowColor: `${colors.primary}14`, // rgba(70,72,212,0.08)
    shadowOffset: { width: 0, height: 32 },
    shadowRadius: 64,
  },

  // Input groups
  inputGroup: {
    marginBottom: 32, // space-y-8 between groups
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11, // text-xs
    letterSpacing: 2, // tracking-widest
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12, // space-y-3
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  forgotLink: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.primary,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12, // rounded-xl
    paddingHorizontal: 24, // px-6
    paddingVertical: 16, // py-4
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    paddingRight: 48, // room for icon
  },
  inputIcon: {
    position: 'absolute',
    right: 16, // pr-4
  },

  // Error
  error: {
    fontFamily: fonts.sans,
    color: colors.error,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },

  // Button
  buttonWrapper: {
    marginTop: 16, // pt-4
  },
  btnOuter: {
    borderRadius: 9999, // rounded-full
    overflow: 'hidden',
    ...shadows.card,
    shadowColor: `${colors.primary}33`, // shadow-primary/20
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20, // py-5
    borderRadius: 9999,
  },
  btnText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.textOnPrimary,
    fontSize: 16,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 32, // py-8
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${colors.outlineVariant}4D`, // /30 opacity
  },
  dividerText: {
    fontFamily: fonts.sans,
    fontSize: 11, // text-xs
    color: `${colors.outline}80`, // /50 opacity
    textTransform: 'uppercase',
    letterSpacing: -0.5, // tracking-tighter
  },

  // Social Auth
  socialRow: {
    flexDirection: 'row',
    gap: 16, // gap-4
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
    backgroundColor: `${colors.surfaceContainerHigh}66`, // /40 opacity
    borderRadius: 12, // rounded-xl
  },
  socialIcon: {
    width: 16,
    height: 16,
  },
  socialText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});
