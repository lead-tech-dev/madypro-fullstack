import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { theme } from '@/config/theme';
import { Intervention } from '@/types/intervention';
import { fetchInterventions, listInterventionsByRange } from '@/services/api/interventions.api';
import { listAttendance } from '@/services/api/attendance.api';
import { useAuthContext } from '@/context/AuthContext';

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
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('ALL');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]['value']>('ALL');
  const [hours, setHours] = useState({ week: 0, month: 0 });
  const { token, user } = useAuthContext();
  const now = useMemo(() => new Date(), []);

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
        setError(null);
        try {
          const [history, weekHours, monthHours] = await Promise.all([
            listInterventionsByRange(token, 'past', user.id),
            computeHoursForRange(token, user.id, 'week', now),
            computeHoursForRange(token, user.id, 'month', now),
          ]);
          if (!cancelled) {
            setInterventions(history);
            setHours({ week: weekHours, month: monthHours });
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Impossible de charger les interventions');
            setInterventions([]);
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

  const stats = hours;

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
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
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

async function computeHoursForRange(token: string, agentId: string, range: 'week' | 'month', now: Date) {
  const start = new Date(now);
  if (range === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
    start.setDate(start.getDate() + diff);
  } else {
    start.setDate(1);
  }
  const startISO = start.toISOString().slice(0, 10);
  const endISO = now.toISOString().slice(0, 10);
  try {
    // 1) tenter via pointages (plus fiable si disponibles)
    const attendanceRes = await listAttendance(token, {
      agentId,
      startDate: startISO,
      endDate: endISO,
      pageSize: 500,
    });
    const attendanceItems =
      Array.isArray(attendanceRes) ||
      attendanceRes instanceof Array ? attendanceRes : (attendanceRes as any).items ?? (attendanceRes as any).data ?? [];
    const attendanceHours = attendanceItems.reduce((total: number, att: any) => {
      const startTime = parseAttendanceTime(att.date, att.checkInTime || att.plannedStart || att.actualStartAt);
      const endTime = parseAttendanceTime(att.date, att.checkOutTime || att.plannedEnd || att.actualEndAt);
      if (!startTime || !endTime) return total;
      const hours = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      return total + hours;
    }, 0);
    if (attendanceHours > 0) return attendanceHours;

    // 2) fallback via interventions (si le backend ne renvoie pas les pointages)
    let interventions = await fetchInterventions(token, { startDate: startISO, endDate: endISO, agentId });
    if (agentId && interventions.length === 0) {
      const fallback = await fetchInterventions(token, { startDate: startISO, endDate: endISO });
      interventions = fallback.filter((i) => i.agentIds?.includes(agentId));
    }
    return interventions.reduce((total, intervention) => {
      const startDate = getDateFromActual(
        intervention.actualStartAt,
        intervention.date,
        intervention.actualStartTime ?? intervention.startTime,
      );
      const endDate = getDateFromActual(
        intervention.actualEndAt,
        intervention.date,
        intervention.actualEndTime ?? intervention.endTime,
      );
      if (!startDate || !endDate) return total;
      const hours = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      return total + hours;
    }, 0);
  } catch {
    return 0;
  }
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

function parseAttendanceTime(date: string, time?: string) {
  if (!time) return null;
  if (time.includes('T')) {
    const d = new Date(time);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // format HH:mm
  const candidate = new Date(`${date}T${time}:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
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
  error: {
    color: theme.colors.danger,
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
