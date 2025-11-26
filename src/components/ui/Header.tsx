import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../config/theme';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  trailing?: React.ReactNode;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle, accent, trailing }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.accent}>{accent ?? 'Madypro Clean'}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.primarySoft,
    marginBottom: 0,
  },
  content: {
    gap: 4,
  },
  accent: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#020912',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b645c',
  },
});
