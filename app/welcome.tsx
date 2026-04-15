import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts, spacing } from '@/constants/theme';

const HOLD_MS = 1500;
const FADE_IN_MS = 450;
const FADE_OUT_MS = 350;

export default function Welcome() {
  const { profile } = useAuth();
  const name = profile?.display_name || profile?.username || 'dreamer';

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const goHome = () => router.replace('/(tabs)/record');

    opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });

    opacity.value = withDelay(
      FADE_IN_MS + HOLD_MS,
      withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(goHome)();
      })
    );
  }, [opacity, translateY]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Image source={require('@/assets/images/splash.png')} style={styles.portal} resizeMode="contain" />
        <Animated.Text style={styles.greeting}>Welcome back, {name}</Animated.Text>
        <Animated.Text style={styles.subtitle}>Your dreams are waiting</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  portal: {
    width: 180,
    height: 220,
    marginBottom: spacing.md,
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
