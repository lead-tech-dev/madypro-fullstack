import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Attendance } from '../../types/attendance';
import { theme } from '../../config/theme';

const STATUS_META = {
  COMPLETED: { label: 'Terminé', color: '#0b874b' },
  PENDING: { label: 'En attente', color: '#b15b00' },
  CANCELLED: { label: 'Annulé', color: '#c62828' },
} satisfies Record<Attendance['status'], { label: string; color: string }>;

export const AttendanceCard: React.FC<{ entry: Attendance }> = ({ entry }) => {
  const meta = STATUS_META[entry.status];
  const timeLabel = formatTime(entry);
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>{entry.agent.name}</Text>
        <Text style={styles.meta}>{entry.site.name}</Text>
        <Text style={styles.meta}>{entry.date}</Text>
        {entry.note && <Text style={styles.note}>{entry.note}</Text>}
      </View>
      <View style={[styles.badge, { borderColor: meta.color }]}>
        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        <Text style={[styles.badgeTime, { color: meta.color }]}>{timeLabel}</Text>
      </View>
    </View>
  );
};

function formatTime(entry: Attendance) {
  if (entry.checkInTime || entry.checkOutTime) {
    if (entry.checkInTime && entry.checkOutTime) {
      return `${entry.checkInTime} → ${entry.checkOutTime}`;
    }
    return entry.checkInTime ?? entry.checkOutTime ?? '';
  }
  if (entry.plannedStart || entry.plannedEnd) {
    return `${entry.plannedStart ?? '--:--'} → ${entry.plannedEnd ?? '--:--'}`;
  }
  return '—';
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.muted,
    marginTop: 4,
  },
  note: {
    marginTop: 4,
    color: theme.colors.ink,
    fontStyle: 'italic',
  },
  badge: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    alignItems: 'flex-end',
    minWidth: 120,
  },
  badgeText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  badgeTime: {
    fontWeight: '600',
  },
});
