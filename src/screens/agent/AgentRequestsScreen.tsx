import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { listAbsences } from '@/services/api/absences.api';
import { Absence } from '@/types/absences';
import { AbsenceRequestForm } from '@/components/forms/AbsenceRequestForm';
import { theme } from '@/config/theme';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { useAuthContext } from '@/context/AuthContext';

const TYPE_LABELS = {
  SICK: 'Maladie',
  PAID_LEAVE: 'Congés payés',
  UNPAID: 'Congés sans solde',
  OTHER: 'Autre',
} as const;

const STATUS_META = {
  PENDING: { label: 'En attente', color: '#b46a00', background: '#fff0d6' },
  APPROVED: { label: 'Approuvée', color: '#0b874b', background: '#def5eb' },
  REJECTED: { label: 'Refusée', color: '#c62828', background: '#fdecea' },
} as const;

export default function RequestsScreen() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { token, user } = useAuthContext();

  const loadAbsences = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setAbsences([]);
    try {
      const data = await listAbsences(token, { agentId: user.id });
      setAbsences(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      loadAbsences();
    } else {
      setAbsences([]);
      setLoading(false);
    }
  }, [token, user, loadAbsences]);

  return (
    <HeaderLayout
      title="Demandes d'absence"
      subtitle="Créez et consultez vos absences"
      accent="Congés & absences"
    >
      {token && user && (
        <View style={styles.card}>
          <AbsenceRequestForm token={token} userId={user.id} onSubmitted={() => loadAbsences()} />
        </View>
      )}
      <Text style={styles.subtitle}>Historique</Text>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : absences.length === 0 ? (
        <Text style={styles.empty}>Aucune demande encore enregistrée.</Text>
      ) : (
        absences.map((absence) => {
          const statusMeta = STATUS_META[absence.status];
          return (
            <View key={absence.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{TYPE_LABELS[absence.type]}</Text>
                <View style={[styles.badge, { backgroundColor: statusMeta.background }]}>
                  <Text style={[styles.badgeLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Agent : {absence.agent.name}</Text>
              <Text style={styles.date}>
                {absence.from} → {absence.to}
              </Text>
              <Text style={styles.reason}>{absence.reason}</Text>
              {absence.validationComment && (
                <View style={styles.managerBox}>
                  <Text style={styles.managerLabel}>Commentaire manager</Text>
                  <Text style={styles.managerText}>{absence.validationComment}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  itemTitle: {
    fontWeight: '600',
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.muted,
  },
  date: {
    color: theme.colors.muted,
  },
  reason: {
    color: theme.colors.ink,
  },
  managerBox: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: 4,
  },
  managerLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  managerText: {
    color: theme.colors.ink,
  },
});
