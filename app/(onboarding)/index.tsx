import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing } from '@/constants/theme';

const STEPS = [
  { key: 'people', category: 'person' as const, title: 'Important people', prompt: 'Who appears in your life most prominently? Name a few key people and their relationship to you.', placeholder: 'e.g., Sarah — partner, Dad — distant but loving' },
  { key: 'places', category: 'place' as const, title: 'Meaningful places', prompt: 'Which places carry emotional weight for you? Childhood homes, cities, recurring dream locations...', placeholder: 'e.g., Grandma\'s farm — safety, the ocean — freedom' },
  { key: 'themes', category: 'theme' as const, title: 'Life themes', prompt: 'What themes dominate your inner life right now? What keeps you up at night or inspires you?', placeholder: 'e.g., career change — excitement and fear' },
];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const { addEntry } = useWorldEntries();
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleNext = async () => {
    const currentStep = STEPS[step];
    const text = inputs[currentStep.key] || '';
    if (text.trim()) {
      const lines = text.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const [name, ...descParts] = line.split('—').map(s => s.trim());
        if (name) await addEntry({ category: currentStep.category, name, description: descParts.join(' — ') || undefined });
      }
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      await refreshProfile();
    }
    router.replace('/(tabs)/record');
  };

  const current = STEPS[step];

  return (
    <View style={styles.container}>
      {/* Background glow — Stitch */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      {/* Header — Stitch: cloud_queue + "The Ethereal Archive" */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="cloud-queue" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>The Ethereal Archive</Text>
        </View>
        <Pressable style={styles.helpBtn}>
          <MaterialIcons name="help-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress dots — Stitch: active = wider bar */}
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Step label — Stitch */}
        <Text style={styles.stepLabel}>STEP {step + 1} OF {STEPS.length}</Text>
        <Text style={styles.title}>{current.title}</Text>

        {/* Prompt — Stitch */}
        <Text style={styles.prompt}>{current.prompt}</Text>
        <Text style={styles.hint}>One per line. Use — to add a description.</Text>

        {/* Textarea — Stitch: bg-[#F1F3FF] rounded-[20px] p-6 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={current.placeholder}
            placeholderTextColor={`${colors.textMuted}80`}
            value={inputs[current.key] || ''}
            onChangeText={t => setInputs({ ...inputs, [current.key]: t })}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Skip all link — Stitch */}
        <View style={styles.skipAllWrap}>
          <Pressable onPress={finishOnboarding}>
            <Text style={styles.skipAllText}>Skip all — I'll add these later</Text>
          </Pressable>
        </View>

        {/* Placeholder circles — Stitch decorative */}
        <View style={styles.placeholderRow}>
          <View style={styles.placeholderBox}>
            <View style={styles.placeholderCircle} />
          </View>
          <View style={styles.placeholderBox}>
            <View style={styles.placeholderCircle} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar — Stitch: Skip + Next button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
          onPress={step < STEPS.length - 1 ? () => setStep(step + 1) : finishOnboarding}
        >
          <MaterialIcons name="close" size={22} color={colors.textMuted} />
          <Text style={styles.skipBtnLabel}>SKIP</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { transform: [{ scale: 1.05 }] }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>{step < STEPS.length - 1 ? 'NEXT' : 'BEGIN'}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // Background glow
  glowTopLeft: {
    position: 'absolute',
    top: 96,
    left: -128,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: `${colors.primary}0D`, // primary/5
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: 128,
    right: -128,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${colors.secondary}0D`, // secondary/5
  },

  // Header — Stitch
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  helpBtn: {
    padding: 8,
    borderRadius: 999,
  },

  scroll: { flex: 1 },
  content: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 120,
  },

  // Progress — Stitch: active dot is wider
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dot: {
    height: 6, // h-1.5
    width: 6, // w-1.5
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerHigh,
  },
  dotActive: {
    width: 40, // w-10
    backgroundColor: '#5F599B',
  },
  dotDone: {
    width: 40,
    backgroundColor: colors.primaryFixedDim,
  },

  // Step label
  stepLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 34,
    marginBottom: 24,
  },

  // Prompt
  prompt: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 26,
    maxWidth: 580,
    marginBottom: 6,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 24,
  },

  // Textarea — Stitch
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow, // #F1F3FF
    borderRadius: 20, // rounded-[20px]
    padding: 24, // p-6
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 192, // h-48
    lineHeight: 24,
    textAlignVertical: 'top',
  },

  // Skip all
  skipAllWrap: {
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 32,
  },
  skipAllText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },

  // Placeholder decorative — Stitch
  placeholderRow: {
    flexDirection: 'row',
    gap: 16,
    opacity: 0.4,
  },
  placeholderBox: {
    flex: 1,
    height: 128,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHighest,
  },

  // Bottom bar — Stitch
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: `${colors.surface}B3`,
  },
  skipBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipBtnLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5F599B',
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 16,
    gap: 8,
    shadowColor: `${colors.primary}1A`,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  nextBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
