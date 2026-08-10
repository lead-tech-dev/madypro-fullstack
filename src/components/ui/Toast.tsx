import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/config/theme';

type ToastProps = {
  message: string;
  visible: boolean;
};

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity]);

  if (!visible && (opacity as any)?._value === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}> 
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  toast: {
    backgroundColor: theme.colors.ink,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});

