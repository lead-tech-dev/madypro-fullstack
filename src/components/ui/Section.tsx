import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/config/theme';

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bodySemiBold,
  },
});
