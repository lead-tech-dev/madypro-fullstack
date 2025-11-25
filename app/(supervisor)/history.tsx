import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { Button } from '../../src/components/ui/Button';
import { useAuthContext } from '../../src/context/AuthContext';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { Intervention } from '../../src/types/intervention';
import { theme } from '../../src/config/theme';

const STATUS_META = {
  PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
  IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
  COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
  CANCELLED: { label: 'Annulée', color: '#6c6c6c', background: '#eeeeef' },
  NO_SHOW: { label: 'Non effectuée', color: '#c62828', background: '#fdecea' },
  NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
} as const;

export default function SupervisorHistoryScreen() {
  const { token } = useAuthContext();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | Intervention['type']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Intervention['status']>('all');

  useEffect(() => {
    if (!token) return;
    listInterventionsByRange(token, 'past')
      .then(setInterventions)
      .catch(() => setInterventions([]));
  }, [token]);

  const siteOptions = useMemo(
    () => ['all', ...Array.from(new Set(interventions.map((i) => `${i.siteId}::${i.siteName}`)))],
    [interventions],
  );

  const filtered = interventions.filter((i) => {
    const matchSite = siteFilter === 'all' || siteFilter.startsWith(i.siteId);
    const matchType = typeFilter === 'all' || i.type === typeFilter;
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSite && matchType && matchStatus;
  });

  return (
    <HeaderLayout title="Historique" subtitle="Interventions supervisées (période récente)" accent="Superviseur">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>Site</Text>
            <View style={styles.filterRow}>
              {siteOptions.slice(0, 3).map((value) => {
                const [id, name] = value === 'all' ? ['all', 'Tous'] : value.split('::');
                const active = siteFilter === id || siteFilter === value;
                return (
                  <Button
                    key={value}
                    title={name}
                    variant={active ? 'primary' : 'ghost'}
                    onPress={() => setSiteFilter(id)}
                  />
                );
              })}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterRow}>
              {[
                { value: 'all', label: 'Tous' },
                { value: 'REGULAR', label: 'Régulier' },
                { value: 'PONCTUAL', label: 'Ponctuel' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  title={opt.label}
                  variant={typeFilter === opt.value ? 'primary' : 'ghost'}
                  onPress={() => setTypeFilter(opt.value as any)}
                />
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>Statut</Text>
            <View style={styles.filterRow}>
              {[
                { value: 'all', label: 'Tous' },
                { value: 'PLANNED', label: 'Planifiée' },
                { value: 'IN_PROGRESS', label: 'En cours' },
                { value: 'COMPLETED', label: 'Terminée' },
                { value: 'NO_SHOW', label: 'Non effectuée' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  title={opt.label}
                  variant={statusFilter === opt.value ? 'primary' : 'ghost'}
                  onPress={() => setStatusFilter(opt.value as any)}
                />
              ))}
            </View>
          </View>
        </View>

        {filtered.map((intervention) => {
          const meta = STATUS_META[intervention.status];
          const anomalyBadge = intervention.hasAnomaly || intervention.status === 'NO_SHOW';
          return (
            <View key={intervention.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.title}>{intervention.siteName}</Text>
                  <Text style={styles.subtitle}>
                    {intervention.date} · {intervention.startTime} → {intervention.endTime}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: meta.background }]}>
                  <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {intervention.type === 'REGULAR'
                  ? 'Régulière'
                  : `Ponctuelle • ${intervention.subType ?? 'Sous-type'}`}
              </Text>
              <Text style={styles.meta}>
                Agents : {intervention.agents?.map((a) => a.name).join(', ') || '—'}
              </Text>
              <View style={styles.badgesRow}>
                {anomalyBadge && <Text style={styles.badgeWarning}>⚠️ Anomalie / No-show</Text>}
                <Text style={styles.badgeMuted}>ID {intervention.id.slice(0, 6)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  filters: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: theme.spacing.md,
  },
  filterLabel: {
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: theme.spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.muted,
  },
  meta: {
    color: theme.colors.muted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  badgeWarning: {
    backgroundColor: '#fdecea',
    color: '#c62828',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    fontWeight: '700',
  },
  badgeMuted: {
    backgroundColor: theme.colors.shell,
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  statusChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  statusLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
