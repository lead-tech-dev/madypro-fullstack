import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Attendance } from '../../types/attendance';
import { theme } from '../../config/theme';
import { Card } from '../ui/Card';
import { StatusPill, StatusTone } from '../ui/StatusPill';

const STATUS_META = {
  COMPLETED: { label: 'Terminé', tone: 'success' as StatusTone },
  PENDING: { label: 'En attente', tone: 'warning' as StatusTone },
  CANCELLED: { label: 'Annulé', tone: 'danger' as StatusTone },
} satisfies Record<Attendance['status'], { label: string; tone: StatusTone }>;

export const AttendanceCard: React.FC<{ entry: Attendance }> = ({ entry }) => {
  const meta = STATUS_META[entry.status];
  const timeLabel = formatTime(entry);
  return (
    <Card style={styles.card}>
      <View>
        <Text style={styles.title}>{entry.agent.name}</Text>
        <Text style={styles.meta}>{entry.site.name}</Text>
        <Text style={styles.meta}>{entry.date}</Text>
        {entry.note && <Text style={styles.note}>{entry.note}</Text>}
      </View>
      <View style={styles.badgeCol}>
        <StatusPill label={meta.label} tone={meta.tone} />
        <Text style={styles.badgeTime}>{timeLabel}</Text>
      </View>
    </Card>
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
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.bodySemiBold,
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
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 120,
  },
  badgeTime: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.muted,
  },
});
