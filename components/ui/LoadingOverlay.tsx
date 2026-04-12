import { Modal, View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { OuroborosSpinner } from './OuroborosSpinner';
import { colors, fonts, spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  title?: string;
  /**
   * Rotating status messages shown beneath the spinner. Cycles every ~3s while visible.
   * If omitted, only the title is shown.
   */
  messages?: string[];
}

/**
 * Full-screen blocking overlay for slow operations (AI calls, image generation, etc.).
 * Rotates through a sequence of encouraging messages so the user knows something is happening.
 */
export function LoadingOverlay({ visible, title = 'Interpreting your dream...', messages }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible || !messages || messages.length === 0) return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [visible, messages]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <OuroborosSpinner size={72} />
          <Text style={styles.title}>{title}</Text>
          {messages && messages.length > 0 && (
            <Text style={styles.message}>{messages[messageIndex]}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 40, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 28,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    minHeight: 20,
  },
});
