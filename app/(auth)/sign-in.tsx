import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.clouds}>
        <Text style={styles.title}>ANIMUS</Text>
        <Text style={styles.tagline}>Reveal what lies beneath.</Text>
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

          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignIn} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>

          <Link href="/(auth)/sign-up" asChild>
            <Pressable style={styles.link}>
              <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
  input: { backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: 16, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.accent, fontSize: 14 },
});
