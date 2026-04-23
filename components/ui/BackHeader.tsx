import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { colors, fonts, spacing } from '@/constants/theme';

interface BackHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function BackHeader({ title, onBack, right }: BackHeaderProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {right ?? <View style={styles.btn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  btn: {
    minWidth: 44,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
});
