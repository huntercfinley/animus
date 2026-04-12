import * as Sentry from '@sentry/react-native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { NotoSerif_400Regular, NotoSerif_400Regular_Italic, NotoSerif_700Bold } from '@expo-google-fonts/noto-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { initializeAds } from '@/lib/ads';
import { colors } from '@/constants/theme';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !__DEV__,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, loading, profile } = useAuth();

  useEffect(() => { initializeAds(); }, []);

  // Sync any offline-queued dreams on app startup
  const { syncQueue } = useOfflineQueue();
  useEffect(() => { syncQueue(); }, [syncQueue]);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/sign-in');
    } else if (profile && !profile.onboarding_completed) {
      router.replace('/(onboarding)');
    } else if (session) {
      router.replace('/(tabs)/record');
    }
  }, [session, loading, profile]);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.surface },
      animation: 'fade',
    }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dream/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="import" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_400Regular_Italic,
    NotoSerif_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SubscriptionProvider>
          <RootNavigator />
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
