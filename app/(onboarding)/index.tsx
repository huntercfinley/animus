import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorldEntries } from '@/hooks/useWorldEntries';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

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
    // Parse and save entries from current step
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepCount}>{step + 1} of {STEPS.length}</Text>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.prompt}>{current.prompt}</Text>
      <Text style={styles.hint}>One per line. Use — to add a description.</Text>

      <TextInput
        style={styles.input}
        placeholder={current.placeholder}
        placeholderTextColor={colors.textMuted}
        value={inputs[current.key] || ''}
        onChangeText={t => setInputs({ ...inputs, [current.key]: t })}
        multiline
        numberOfLines={5}
      />

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipBtn} onPress={step < STEPS.length - 1 ? () => setStep(step + 1) : finishOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>{step < STEPS.length - 1 ? 'Next' : 'Begin'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={finishOnboarding} style={styles.skipAllBtn}>
        <Text style={styles.skipAllText}>Skip all — I'll add these later</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSurface },
  content: { padding: spacing.xl, paddingTop: 80 },
  stepCount: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  title: { fontFamily: fonts.sansBold, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.sm },
  prompt: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.xs },
  hint: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.lg },
  input: { backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, lineHeight: 24, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  skipBtn: { padding: spacing.md },
  skipText: { color: colors.textMuted, fontSize: 16 },
  nextBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingHorizontal: 32, paddingVertical: 14 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipAllBtn: { marginTop: spacing.xl, alignSelf: 'center' },
  skipAllText: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
});
