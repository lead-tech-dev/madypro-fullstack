import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/config/theme';

type ToastVariant = 'success' | 'error' | 'info';

type ToastState = {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (title: string, message?: string, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const VISIBLE_DURATION_MS = 3500;
const FADE_DURATION_MS = 200;

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: theme.colors.status.onTime,
  error: theme.colors.danger,
  info: theme.colors.ink,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = React.useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const showToast = React.useCallback<ToastContextValue['showToast']>(
    (title, message, variant = 'info') => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      setToast({ id: Date.now(), title, message, variant });
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }).start();
      hideTimeout.current = setTimeout(hide, VISIBLE_DURATION_MS);
    },
    [hide, opacity],
  );

  React.useEffect(() => () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastBanner toast={toast} opacity={opacity} onDismiss={hide} />}
    </ToastContext.Provider>
  );
}

function ToastBanner({
  toast,
  opacity,
  onDismiss,
}: {
  toast: ToastState;
  opacity: Animated.Value;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: insets.top + theme.spacing.sm, opacity }]}
    >
      <Animated.View
        onTouchEnd={onDismiss}
        style={[styles.container, { backgroundColor: VARIANT_COLORS[toast.variant] }]}
      >
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 9999,
    elevation: 12,
  },
  container: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    color: theme.colors.shell,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
  },
  message: {
    color: theme.colors.shell,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
});
