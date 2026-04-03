import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, cancelAnimation } from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onPress: () => void;
  size?: number;
}

export function RecordButton({ isRecording, isPaused, onPress, size = 80 }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isRecording && !isPaused) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1, true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1, true
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [isRecording, isPaused, scale, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.4 }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]} />
      <Animated.View style={[
        styles.button,
        { width: size, height: size, borderRadius: isRecording && !isPaused ? 16 : size / 2 },
      ]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'center', alignItems: 'center' },
  pulse: { position: 'absolute', backgroundColor: colors.record },
  button: { backgroundColor: colors.record },
});
