import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Intervention } from '../../types/intervention';
import { theme } from '../../config/theme';
import { Card } from '../ui/Card';
import { StatusPill, StatusTone } from '../ui/StatusPill';

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
  PLANNED: { label: 'Planifiée', tone: 'info' as StatusTone },
  IN_PROGRESS: { label: 'En cours', tone: 'info' as StatusTone },
  COMPLETED: { label: 'Terminée', tone: 'success' as StatusTone },
  CANCELLED: { label: 'Annulée', tone: 'neutral' as StatusTone },
  NO_SHOW: { label: 'Non effectuée', tone: 'danger' as StatusTone },
  NEEDS_REVIEW: { label: 'À valider', tone: 'warning' as StatusTone },
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
    <Pressable onPress={() => onPress?.(intervention)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.timeBlock}>
            <Text style={styles.time}>{intervention.startTime}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.time}>{intervention.endTime}</Text>
          </View>
          <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
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
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
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
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
  },
  arrow: {
    color: theme.colors.muted,
  },
  site: {
    fontSize: 16,
    fontFamily: theme.fonts.bodySemiBold,
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
