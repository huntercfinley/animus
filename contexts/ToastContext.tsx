import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

type ToastTone = 'lumen' | 'info' | 'error';

interface ToastState {
  message: string;
  tone: ToastTone;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface ToastApi {
  show: (message: string, opts?: { tone?: ToastTone; icon?: keyof typeof MaterialIcons.glyphMap; durationMs?: number }) => void;
  showLumen: (amount: number, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback<ToastApi['show']>((message, opts) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ message, tone: opts?.tone ?? 'info', icon: opts?.icon });
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    hideTimer.current = setTimeout(hide, opts?.durationMs ?? DEFAULT_DURATION);
  }, [opacity, translateY, hide]);

  const showLumen = useCallback<ToastApi['showLumen']>((amount, message) => {
    if (amount <= 0) {
      show(message ?? "You've tended the inner work enough today. Return tomorrow.", {
        tone: 'lumen',
        icon: 'nightlight-round',
        durationMs: 3600,
      });
      return;
    }
    show(message ?? `+${amount} Lumen — the work continues`, {
      tone: 'lumen',
      icon: 'auto-awesome',
    });
  }, [show]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <ToastContext.Provider value={{ show, showLumen }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { bottom: insets.bottom + 96, opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.toast, toast.tone === 'lumen' && styles.toastLumen]}>
            {toast.icon ? (
              <MaterialIcons
                name={toast.icon}
                size={18}
                color={toast.tone === 'lumen' ? colors.tertiaryFixedDim : colors.textPrimary}
              />
            ) : null}
            <Text style={[styles.text, toast.tone === 'lumen' && styles.textLumen]} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: 360,
    shadowColor: 'rgba(20, 18, 36, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: 'rgba(120, 107, 173, 0.15)',
  },
  toastLumen: {
    backgroundColor: colors.deepBg,
    borderColor: 'rgba(199, 195, 254, 0.25)',
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  textLumen: {
    color: colors.deepTextPrimary,
  },
});
