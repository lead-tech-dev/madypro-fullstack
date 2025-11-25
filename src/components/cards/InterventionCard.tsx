import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Intervention } from '../../types/intervention';
import { theme } from '../../config/theme';

type Props = {
  intervention: Intervention;
  onPress?: (intervention: Intervention) => void;
};

const TYPE_META = {
  REGULAR: {
    icon: 'repeat-outline' as const,
    label: 'Intervention régulière',
  },
  PUNCTUAL: {
    icon: 'flash-outline' as const,
    label: 'Intervention ponctuelle',
  },
};

const STATUS_META = {
  PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
  IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
  COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
  CANCELLED: { label: 'Annulée', color: '#7a7a7a', background: '#eeeeef' },
  NO_SHOW: { label: 'Non effectuée', color: '#d93025', background: '#fdecea' },
  NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
};

function formatDate(dateISO: string) {
  const date = new Date(dateISO);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const InterventionCard: React.FC<Props> = ({ intervention, onPress }) => {
  const typeMeta = TYPE_META[intervention.type];
  const statusMeta = STATUS_META[intervention.status];
  const typeLabel =
    intervention.type === 'REGULAR'
      ? typeMeta.label
      : intervention.subType ?? typeMeta.label;

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(intervention)}>
      <View style={styles.header}>
        <View style={styles.timeBlock}>
          <Text style={styles.time}>{intervention.startTime}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.time}>{intervention.endTime}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusMeta.background }]}>
          <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <Text style={styles.site}>{intervention.siteName}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name={typeMeta.icon} size={18} color={theme.colors.ink} />
          <Text style={styles.metaText}>{typeLabel}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.ink} />
          <Text style={styles.metaText}>{formatDate(intervention.date)}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  arrow: {
    color: theme.colors.muted,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  site: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
});
