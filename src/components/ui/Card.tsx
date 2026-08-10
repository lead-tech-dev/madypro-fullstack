import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { theme } from '@/config/theme';

type CardProps = ViewProps & {
  padded?: boolean;
};

export const Card: React.FC<CardProps> = ({ style, padded = true, ...props }) => (
  <View style={[styles.card, padded && styles.padded, style]} {...props} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.lg,
  },
  padded: {
    padding: theme.spacing.xl,
  },
});
