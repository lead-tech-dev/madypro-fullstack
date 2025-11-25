import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { Intervention } from '../../src/types/intervention';
import { useAuthContext } from '../../src/context/AuthContext';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { theme } from '../../src/config/theme';
import { Button } from '../../src/components/ui/Button';

const STATUS_META: Record<Intervention['status'], { label: string; color: string; background: string }> = {
  PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
  IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
  COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
  CANCELLED: { label: 'Annulée', color: '#6c6c6c', background: '#eeeeef' },
  NO_SHOW: { label: 'Non effectuée', color: '#c62828', background: '#fdecea' },
  NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
};

export default function SupervisorInterventionsScreen() {
  const { token } = useAuthContext();
  const router = useRouter();
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{
    visible: boolean;
    intervention: Intervention | null;
    mode: 'NO_SHOW' | 'START' | 'END';
    note: string;
  }>({ visible: false, intervention: null, mode: 'NO_SHOW', note: '' });

  useEffect(() => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listInterventionsByRange(token, 'today')
      .then(setItems)
      .finally(() => setLoading(false));
  }, [token]);

  const grouped = useMemo(() => {
    const bySite: Record<string, { siteName: string; data: Intervention[] }> = {};
    items.forEach((i) => {
      if (!bySite[i.siteId]) bySite[i.siteId] = { siteName: i.siteName, data: [] };
      bySite[i.siteId].data.push(i);
    });
    return Object.values(bySite);
  }, [items]);

  return (
    <HeaderLayout
      title="Interventions du jour"
      subtitle="Vue d’ensemble de vos sites"
      accent="Superviseur"
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : grouped.length === 0 ? (
        <Text style={styles.empty}>Aucune intervention aujourd’hui.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {grouped.map((group) => (
            <View key={group.siteName} style={styles.siteBlock}>
              <Text style={styles.siteName}>{group.siteName}</Text>
              {group.data.map((intervention) => {
                const status = STATUS_META[intervention.status];
                return (
                  <View key={intervention.id} style={styles.card}>
                    <View style={styles.headerRow}>
                      <Text style={styles.time}>
                        {intervention.startTime} → {intervention.endTime}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: status.background }]}>
                        <Text style={[styles.badgeLabel, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.type}>
                      {intervention.type === 'REGULAR'
                        ? 'Régulière'
                        : `Ponctuelle • ${intervention.subType ?? 'Sous-type'}`}
                    </Text>
                    <Text style={styles.meta}>Agents : {intervention.agents?.map((a) => a.name).join(', ') || '—'}</Text>
                    <View style={styles.tagsRow}>
                      {intervention.hasAnomaly && <Text style={styles.tagWarn}>Anomalie</Text>}
                      {intervention.type === 'PUNCTUAL' && <Text style={styles.tag}>Ponctuel</Text>}
                      {intervention.type === 'PUNCTUAL' && intervention.truckLabels?.length ? (
                        <Text style={styles.tag}>Camion(s)</Text>
                      ) : null}
                    </View>
                    <View style={styles.actions}>
                      <Button
                        title="Détail"
                        variant="ghost"
                        onPress={() =>
                          router.push({ pathname: '/(supervisor)/intervention/[id]', params: { id: intervention.id } })
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modal.mode === 'NO_SHOW'
                ? 'Marquer NO_SHOW'
                : modal.mode === 'START'
                ? 'Pointer début'
                : 'Pointer fin'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={
                modal.mode === 'NO_SHOW' ? 'Observation obligatoire' : 'Observation (optionnel)'
              }
              value={modal.note}
              onChangeText={(text) => setModal((prev) => ({ ...prev, note: text }))}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="ghost"
                onPress={() => setModal((prev) => ({ ...prev, visible: false }))}
              />
              <Button
                title="Valider"
                onPress={() => {
                  if (!modal.intervention) return;
                  const note = modal.note.trim();
                  if (modal.mode === 'NO_SHOW' && !note) return;
                  setNotes((prev) => ({ ...prev, [modal.intervention!.id]: note }));
                  setItems((prev) =>
                    prev.map((it) => {
                      if (it.id !== modal.intervention?.id) return it;
                      if (modal.mode === 'NO_SHOW') {
                        return { ...it, status: 'NO_SHOW', observation: note };
                      }
                      if (modal.mode === 'START') {
                        return {
                          ...it,
                          status: 'IN_PROGRESS',
                          actualStartTime:
                            it.actualStartTime ??
                            new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                        };
                      }
                      return {
                        ...it,
                        status: 'COMPLETED',
                        actualEndTime:
                          it.actualEndTime ??
                          new Date().toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                      };
                    }),
                  );
                  setModal({ visible: false, intervention: null, mode: 'NO_SHOW', note: '' });
                }}
                disabled={modal.mode === 'NO_SHOW' && !modal.note.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  siteBlock: {
    gap: theme.spacing.sm,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  badge: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  type: {
    color: theme.colors.muted,
  },
  meta: {
    color: theme.colors.muted,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: theme.colors.shell,
    color: theme.colors.ink,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    fontWeight: '600',
  },
  tagWarn: {
    backgroundColor: '#fdecea',
    color: '#c62828',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    fontWeight: '700',
  },
  empty: {
    color: theme.colors.muted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.shell,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
});
