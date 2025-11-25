import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../../config/theme';

type Props = TextInputProps & {
  label?: string;
};

export const Input: React.FC<Props> = ({ label, ...props }) => (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput style={styles.input} {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.muted,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.shell,
  },
});
