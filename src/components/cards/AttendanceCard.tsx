import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.titleRow}>
          <Ionicons name="person-outline" size={16} color={theme.colors.ink} style={styles.titleIcon} />
          <Text style={styles.title}>{entry.agent.name}</Text>
        </View>
        <Text style={styles.meta}>{entry.site.name}</Text>
        <Text style={styles.meta}>{entry.date}</Text>
        {entry.note && <Text style={styles.note}>{entry.note}</Text>}
      </View>
      <View style={styles.badgeCol}>
        <StatusPill label={meta.label} tone={meta.tone} />
        <View style={styles.badgeTimeRow}>
          <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
          <Text style={styles.badgeTime}>{timeLabel}</Text>
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 6,
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
  badgeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeTime: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.muted,
  },
});
