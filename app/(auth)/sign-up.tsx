import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
        <View style={styles.clouds}>
          <Text style={styles.title}>ANIMUS</Text>
          <Text style={styles.tagline}>Begin your journey.</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.form}>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successMsg}>We sent a confirmation link to {email}</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable style={styles.link}>
                <Text style={styles.linkText}>Back to sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.clouds}>
        <Text style={styles.title}>ANIMUS</Text>
        <Text style={styles.tagline}>Begin your journey.</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.form}>
          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </Pressable>

          <Link href="/(auth)/sign-in" asChild>
            <Pressable style={styles.link}>
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  clouds: { height: 200, backgroundColor: '#E8ECFF', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.lg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.sansBold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },
  tagline: { fontFamily: fonts.serif, fontSize: 16, color: colors.accent, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xs },
  form: { marginTop: spacing.xl },
  error: { color: colors.error, textAlign: 'center', fontSize: 14, marginBottom: spacing.sm },
  successTitle: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  successMsg: { fontFamily: fonts.serif, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, fontStyle: 'italic' },
  input: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: 16, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.accent, fontSize: 14 },
});
