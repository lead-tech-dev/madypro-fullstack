import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listMyAbsences } from '@/services/api/absences.api';
import { Absence } from '@/types/absences';
import { theme } from '@/config/theme';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStackParamList } from '@/navigation/types';

const TYPE_LABELS = {
  SICK: 'Maladie',
  PAID_LEAVE: 'Congés payés',
  UNPAID: 'Congés sans solde',
  OTHER: 'Autre',
} as const;

const STATUS_META = {
  PENDING: { label: 'En attente', color: '#b46a00', background: '#fff6e8' },
  APPROVED: { label: 'Approuvée', color: '#0b874b', background: '#e6f5ef' },
  REJECTED: { label: 'Refusée', color: '#c62828', background: '#fdecef' },
} as const;

const formatDate = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
};

export default function RequestsScreen() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { token, user } = useAuthContext();
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();

  const loadAbsences = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setAbsences([]);
    try {
      const data = await listMyAbsences(token);
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
      subtitle="Consultez vos absences et demandes"
      accent="Congés & absences"
      trailing={
        <Button
          title="Nouvelle demande"
          onPress={() => navigation.navigate('AgentAbsenceForm')}
          size="sm"
        />
      }
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Historique</Text>
          <Text style={styles.sectionHint}>Vos dernières demandes</Text>
        </View>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{absences.length}</Text>
          <Text style={styles.counterLabel}>demandes</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : absences.length === 0 ? (
        <Text style={styles.empty}>Aucune demande encore enregistrée.</Text>
      ) : (
        <View style={styles.list}>
          {absences.map((absence) => {
            const statusMeta = STATUS_META[absence.status];
            return (
              <View key={absence.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <View style={styles.titleRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.itemTitle}>{TYPE_LABELS[absence.type]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusMeta.background, borderColor: statusMeta.color }]}>
                    <Text style={[styles.badgeLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Période</Text>
                  <Text style={styles.metaValue}>
                    {formatDate(absence.from)} → {formatDate(absence.to)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Agent</Text>
                  <Text style={styles.metaValue}>{absence.agent.name}</Text>
                </View>

                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Motif</Text>
                  <Text style={styles.reason}>{absence.reason || '—'}</Text>
                </View>

                {absence.validationComment && (
                  <View style={styles.managerBox}>
                    <Text style={styles.managerLabel}>Commentaire manager</Text>
                    <Text style={styles.managerText}>{absence.validationComment}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  sectionHint: {
    color: theme.colors.muted,
    marginTop: 2,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f6ff',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  counterText: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.primary,
    marginRight: 6,
  },
  counterLabel: {
    color: theme.colors.muted,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  list: {
    gap: theme.spacing.md,
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.ink,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    opacity: 0.8,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  metaValue: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  reason: {
    color: theme.colors.ink,
    lineHeight: 20,
  },
  reasonLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  reasonBox: {
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  managerBox: {
    backgroundColor: '#fef7ec',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: '#f3d9a4',
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
