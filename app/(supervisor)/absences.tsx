import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthContext } from '../../src/context/AuthContext';
import { listAbsences, updateAbsenceStatus } from '../../src/services/api/absences.api';
import { Absence, AbsenceStatus } from '../../src/types/absences';
import { theme } from '../../src/config/theme';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { Button } from '../../src/components/ui/Button';

const STATUS_META = {
  PENDING: { label: 'En attente', color: '#b46a00', background: '#fff0d6' },
  APPROVED: { label: 'Approuvée', color: '#0b874b', background: '#def5eb' },
  REJECTED: { label: 'Refusée', color: '#c62828', background: '#fdecea' },
} as const;

const TYPE_LABELS = {
  SICK: 'Maladie',
  PAID_LEAVE: 'Congés payés',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
} as const;

export default function SupervisorAbsencesScreen() {
  const { token, user } = useAuthContext();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listAbsences(token);
      setAbsences(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les absences');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const actOn = async (absence: Absence, status: AbsenceStatus) => {
    if (!token || !user) return;
    const comment = status === 'REJECTED' ? 'Demande refusée' : undefined;
    try {
      setRefreshing(true);
      await updateAbsenceStatus(token, absence.id, status, user.name ?? user.email ?? 'SUPERVISOR', comment);
      await load();
    } catch (err: any) {
      Alert.alert('Action impossible', err?.message ?? 'Erreur');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <HeaderLayout
      title="Absences"
      subtitle="Validez ou rejetez les demandes"
      accent="Superviseur"
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : absences.length === 0 ? (
        <Text style={styles.empty}>Aucune demande d’absence.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {absences.map((absence) => {
            const meta = STATUS_META[absence.status];
            const isPending = absence.status === 'PENDING';
            return (
              <View key={absence.id} style={styles.card}>
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>{TYPE_LABELS[absence.type]}</Text>
                    <Text style={styles.dates}>
                      {absence.from} → {absence.to}
                    </Text>
                    <Text style={styles.meta}>Agent : {absence.agent.name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.background }]}>
                    <Text style={[styles.badgeLabel, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.reason}>{absence.reason}</Text>
                {absence.validationComment && (
                  <View style={styles.comment}>
                    <Text style={styles.commentLabel}>Commentaire</Text>
                    <Text style={styles.commentText}>{absence.validationComment}</Text>
                  </View>
                )}
                {isPending && (
                  <View style={styles.actions}>
                    <Button
                      title="Rejeter"
                      variant="ghost"
                      onPress={() => actOn(absence, 'REJECTED')}
                      disabled={refreshing}
                    />
                    <Button
                      title="Approuver"
                      onPress={() => actOn(absence, 'APPROVED')}
                      disabled={refreshing}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  dates: {
    color: theme.colors.muted,
  },
  meta: {
    color: theme.colors.muted,
  },
  reason: {
    color: theme.colors.ink,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  comment: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: 4,
  },
  commentLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  commentText: {
    color: theme.colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  empty: {
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
