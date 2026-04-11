import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return;
    }
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) await fetchProfile(s.user.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      setSession(s);
      if (s?.user) fetchProfile(s.user.id).catch(() => {});
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    let email = identifier;
    // If it doesn't look like an email, treat it as a username and look up the email
    if (!identifier.includes('@')) {
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .single();
      if (lookupError || !profile?.email) {
        return { error: 'No account found with that username' };
      }
      email = profile.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const signInWithGoogle = async () => {
    try {
      const { openAuthSessionAsync } = await import('expo-web-browser');
      const { makeRedirectUri } = await import('expo-auth-session');
      const redirectTo = makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error.message };
      if (!data.url) return { error: 'No auth URL returned' };

      const result = await openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) return { error: sessionError.message };
        }
      }
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') return { error: 'Apple Sign In is only available on iOS' };
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.EMAIL,
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (!credential.identityToken) return { error: 'No identity token returned from Apple' };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      return { error: error?.message ?? null };
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: (err as Error).message };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
