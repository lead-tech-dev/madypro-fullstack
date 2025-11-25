import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../config/theme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
};

export const Button: React.FC<Props> = ({ title, onPress, variant = 'primary', disabled }) => (
  <Pressable
    style={[
      styles.base,
      variant === 'ghost' && styles.ghost,
      disabled && styles.disabled,
      disabled && variant === 'ghost' && styles.ghostDisabled,
    ]}
    onPress={disabled ? undefined : onPress}
    accessibilityState={disabled ? { disabled: true } : undefined}
  >
    <Text
      style={[
        styles.label,
        variant === 'ghost' && styles.labelGhost,
        disabled && variant !== 'ghost' && styles.labelDisabled,
        disabled && variant === 'ghost' && styles.labelGhostDisabled,
      ]}
    >
      {title}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
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
