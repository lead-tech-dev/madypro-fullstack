import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../config/theme';

type Props = {
  title?: string;
  /** alias de title pour convenance */
  label?: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  size?: 'md' | 'sm';
};

export const Button: React.FC<Props> = ({ title, label, onPress, variant = 'primary', disabled, size = 'md' }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      android_ripple={{ color: '#00000010', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.baseSm,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        disabled && variant === 'ghost' && styles.ghostDisabled,
        pressed && { opacity: 0.9 },
      ]}
      onPressIn={() => !disabled && animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      onPress={disabled ? undefined : onPress}
      accessibilityState={disabled ? { disabled: true } : undefined}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSm,
            variant === 'ghost' && styles.labelGhost,
            disabled && variant !== 'ghost' && styles.labelDisabled,
            disabled && variant === 'ghost' && styles.labelGhostDisabled,
          ]}
        >
          {label ?? title}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
  },
  baseSm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.clay,
  },
  ghostDisabled: {
    borderColor: '#ddd7ce',
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  labelSm: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  labelGhost: {
    color: theme.colors.ink,
  },
  disabled: {
    opacity: 0.5,
  },
  labelDisabled: {
    color: '#fefefe',
  },
  labelGhostDisabled: {
    color: '#b0a89f',
  },
});
