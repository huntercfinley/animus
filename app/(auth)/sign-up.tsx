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
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password);
    if (err) setError(err);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.glowTopLeft} />
        <View style={styles.glowBottomRight} />
        <View style={styles.successWrap}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="mark-email-read" size={32} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successMsg}>We sent a confirmation link to {email}</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable style={styles.backLink}>
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.tagline}>Begin your journey into the subconscious.</Text>
          </View>

          {/* Form Card — glassmorphism like sign-in */}
          <View style={styles.card}>
            {error && <Text style={styles.error}>{error}</Text>}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="navigator@dreamworld.com"
                  placeholderTextColor={`${colors.outline}80`}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <MaterialIcons name="alternate-email" size={22} color={`${colors.outline}4D`} style={styles.inputIcon} />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={`${colors.outline}80`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <Pressable
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.inputIcon}
                  hitSlop={12}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={`${colors.outline}99`} />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={`${colors.outline}80`}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                />
                <Pressable
                  onPress={() => setShowConfirm(v => !v)}
                  style={styles.inputIcon}
                  hitSlop={12}
                  accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcons name={showConfirm ? 'visibility' : 'visibility-off'} size={22} color={`${colors.outline}99`} />
                </Pressable>
              </View>
            </View>

            {/* Create Account Button */}
            <View style={styles.buttonWrapper}>
              <Pressable
                onPress={handleSignUp}
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
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.textOnPrimary} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already exploring your dreams? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  glowTopLeft: {
    position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
    borderRadius: 9999, backgroundColor: `${colors.primaryFixed}33`,
  },
  glowBottomRight: {
    position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
    borderRadius: 9999, backgroundColor: `${colors.tertiaryFixed}4D`,
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  inner: { flex: 1, justifyContent: 'center', gap: 48 },

  // Header
  header: { alignItems: 'center', gap: 16 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    ...shadows.cardLifted,
    shadowColor: `${colors.primary}0D`,
  },
  title: {
    fontFamily: fonts.serifBold, fontSize: 48, color: colors.textPrimary,
    textAlign: 'center', letterSpacing: -1, textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: fonts.serifItalic, fontSize: 18, color: colors.textSecondary,
    textAlign: 'center', opacity: 0.8, lineHeight: 26, paddingHorizontal: 16,
  },

  // Card
  card: {
    backgroundColor: `${colors.surfaceContainerLowest}B3`,
    borderRadius: 40, padding: 40,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
    ...shadows.cardLifted,
    shadowColor: `${colors.primary}14`,
    shadowOffset: { width: 0, height: 32 }, shadowRadius: 64,
  },
  inputGroup: { marginBottom: 32 },
  label: {
    fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2,
    color: colors.textSecondary, textTransform: 'uppercase',
    marginBottom: 12, paddingHorizontal: 4,
  },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 16,
    fontFamily: fonts.sans, fontSize: 16, color: colors.textPrimary,
    paddingRight: 48,
  },
  inputIcon: { position: 'absolute', right: 16 },
  error: {
    fontFamily: fonts.sans, color: colors.error, textAlign: 'center',
    fontSize: 14, marginBottom: 16,
  },
  buttonWrapper: { marginTop: 16 },
  btnOuter: {
    borderRadius: 9999, overflow: 'hidden',
    ...shadows.card, shadowColor: `${colors.primary}33`,
  },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20, borderRadius: 9999,
  },
  btnText: { fontFamily: fonts.sansSemiBold, color: colors.textOnPrimary, fontSize: 16 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
  footerLink: {
    fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.primary,
    textDecorationLine: 'underline', textDecorationStyle: 'solid',
  },

  // Success
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successTitle: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 12, marginTop: 24 },
  successMsg: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  backLink: { marginTop: 8 },
  backLinkText: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: colors.primary, textDecorationLine: 'underline' },
});
