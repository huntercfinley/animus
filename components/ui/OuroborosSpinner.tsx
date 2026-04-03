import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function OuroborosSpinner({ size = 48 }: { size?: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1, false
    );
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M50 10 A40 40 0 1 1 49.99 10 L55 15 A35 35 0 1 0 55 14.99 Z"
          fill={colors.accent}
          opacity={0.8}
        />
        {/* Snake head eating tail */}
        <Path d="M47 8 L53 12 L47 16 Z" fill={colors.accent} />
      </Svg>
    </Animated.View>
  );
}
