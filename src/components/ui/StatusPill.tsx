import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/config/theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_STYLES: Record<StatusTone, { color: string; background: string }> = {
  success: { color: theme.colors.status.onTime, background: theme.colors.status.onTimeSoft },
  warning: { color: theme.colors.status.late, background: theme.colors.status.lateSoft },
  danger: { color: theme.colors.status.absent, background: theme.colors.status.absentSoft },
  neutral: { color: theme.colors.status.pending, background: theme.colors.status.pendingSoft },
  info: { color: theme.colors.primary, background: theme.colors.primarySoft },
};

type StatusPillProps = {
  label: string;
  tone: StatusTone;
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone }) => {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.background }]}>
      <Text style={[styles.label, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: theme.radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
