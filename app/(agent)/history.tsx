import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { theme } from '../../src/config/theme';
import { Intervention } from '../../src/types/intervention';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuthContext } from '../../src/context/AuthContext';

const STATUS_FILTERS: Array<{ label: string; value: Intervention['status'] | 'ALL' }> = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Terminées', value: 'COMPLETED' },
  { label: 'Non effectuées', value: 'NO_SHOW' },
  { label: 'Annulées', value: 'CANCELLED' },
  { label: 'À valider', value: 'NEEDS_REVIEW' },
];

const TYPE_FILTERS = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Régulières', value: 'REGULAR' },
  { label: 'Ponctuelles', value: 'PUNCTUAL' },
] as const;

export default function HistoryScreen() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('ALL');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]['value']>('ALL');
  const { token, user } = useAuthContext();

  useFocusEffect(
    React.useCallback(() => {
      if (!token || !user) {
          setInterventions([]);
          setLoading(false);
        return () => {};
      }
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        try {
          const data = await listInterventionsByRange(token, 'past', user.id);
          if (!cancelled) {
            setInterventions(data);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [token, user]),
  );

  const filtered = useMemo(() => {
    return interventions.filter((intervention) => {
      if (statusFilter !== 'ALL' && intervention.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && intervention.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [interventions, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const totals = {
      week: 0,
      month: 0,
    };
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    interventions.forEach((intervention) => {
      const start = getDateFromActual(intervention.actualStartAt, intervention.date);
      const end = getDateFromActual(intervention.actualEndAt, intervention.date, intervention.actualEndTime);
      if (!start || !end) {
        return;
      }
      const durationHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      if (start >= currentWeekStart) {
        totals.week += durationHours;
      }
      if (start >= monthStart) {
        totals.month += durationHours;
      }
    });
    return {
      week: totals.week,
      month: totals.month,
    };
  }, [interventions]);

  return (
    <HeaderLayout
      title="Historique des interventions"
      subtitle="Synthèse des 4 dernières semaines"
      accent="Récap des heures"
    >
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Semaine courante</Text>
          <Text style={styles.summaryValue}>{stats.week.toFixed(1)} h</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Mois en cours</Text>
          <Text style={styles.summaryValue}>{stats.month.toFixed(1)} h</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setTypeFilter(filter.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Aucune intervention pour ces filtres.</Text>
      ) : (
        filtered.map((intervention) => <HistoryCard key={intervention.id} intervention={intervention} />)
      )}
    </HeaderLayout>
  );
}

const HistoryCard: React.FC<{ intervention: Intervention }> = ({ intervention }) => {
  const duration = getDuration(intervention);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{formatDate(intervention.date)}</Text>
          <Text style={styles.cardSite}>{intervention.siteName}</Text>
        </View>
        <StatusBadge status={intervention.status} />
      </View>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={16} color={theme.colors.muted} />
        <Text style={styles.rowText}>
          {intervention.actualStartTime ?? intervention.startTime} →{' '}
          {intervention.actualEndTime ?? intervention.endTime} ({duration})
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name={intervention.type === 'REGULAR' ? 'repeat-outline' : 'flash-outline'} size={16} color={theme.colors.muted} />
        <Text style={styles.rowText}>
          {intervention.type === 'REGULAR' ? 'Régulière' : intervention.subType ?? 'Ponctuelle'}
        </Text>
      </View>
      {intervention.hasAnomaly && (
        <View style={styles.anomaly}>
          <Ionicons name="alert-circle" size={16} color="#c62828" />
          <Text style={styles.anomalyText}>Anomalie signalée</Text>
        </View>
      )}
    </View>
  );
};

const StatusBadge: React.FC<{ status: Intervention['status'] }> = ({ status }) => {
  const map = {
    COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
    CANCELLED: { label: 'Annulée', color: '#6c6c6c', background: '#eeeeef' },
    NO_SHOW: { label: 'Non effectuée', color: '#c62828', background: '#fdecea' },
    NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
    IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
    PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
  } satisfies Record<Intervention['status'], { label: string; color: string; background: string }>;

  const meta = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.background }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

function getDuration(intervention: Intervention) {
  const start = getDateFromActual(
    intervention.actualStartAt,
    intervention.date,
    intervention.actualStartTime ?? intervention.startTime,
  );
  const end = getDateFromActual(
    intervention.actualEndAt,
    intervention.date,
    intervention.actualEndTime ?? intervention.endTime,
  );
  if (!start || !end) {
    return '—';
  }
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getDateFromActual(actual: string | undefined, fallbackDate: string, fallbackTime?: string) {
  if (actual) {
    return new Date(actual);
  }
  if (fallbackTime) {
    return new Date(`${fallbackDate}T${fallbackTime}:00`);
  }
  return null;
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    color: theme.colors.muted,
    letterSpacing: 1,
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  filters: {
    gap: theme.spacing.sm,
  },
  filterRow: {
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.shell,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  filterText: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.primary,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardDate: {
    textTransform: 'uppercase',
    color: theme.colors.muted,
    letterSpacing: 1,
    fontSize: 12,
  },
  cardSite: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  rowText: {
    color: theme.colors.ink,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  anomaly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 4,
  },
  anomalyText: {
    color: '#c62828',
    fontWeight: '600',
  },
});
