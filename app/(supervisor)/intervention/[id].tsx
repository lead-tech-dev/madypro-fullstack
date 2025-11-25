import React, { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeaderLayout } from '../../../src/components/layout/HeaderLayout';
import { theme } from '../../../src/config/theme';
import { useAuthContext } from '../../../src/context/AuthContext';
import { getInterventionById } from '../../../src/services/api/interventions.api';
import { Intervention } from '../../../src/types/intervention';
import { Button } from '../../../src/components/ui/Button';
import { Anomaly } from '../../../src/types/anomaly';
import { createAnomaly, listAnomalies, updateAnomalyStatus } from '../../../src/services/api/anomalies.api';

const STATUS_META = {
  PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
  IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
  COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
  CANCELLED: { label: 'Annulée', color: '#6c6c6c', background: '#eeeeef' },
  NO_SHOW: { label: 'Non effectuée', color: '#c62828', background: '#fdecea' },
  NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
} as const;

export default function SupervisorInterventionDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuthContext();
  const router = useRouter();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [modal, setModal] = useState<{ visible: boolean; mode: 'NO_SHOW' | 'START' | 'END' }>({
    visible: false,
    mode: 'NO_SHOW',
  });
  const [started, setStarted] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [creatingAnomaly, setCreatingAnomaly] = useState(false);
  const [anomalyForm, setAnomalyForm] = useState({ type: '', description: '', title: '' });
  const [trucksConfirmed, setTrucksConfirmed] = useState(false);
  const [truckNote, setTruckNote] = useState('');

  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    getInterventionById(token, id as string)
      .then((data) => {
        setIntervention(data);
        setNote(data?.observation ?? '');
        setStarted(data?.status === 'IN_PROGRESS' || data?.status === 'COMPLETED');
        setTrucksConfirmed(false);
        setTruckNote('');
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return;
    listAnomalies(token, id as string)
      .then(setAnomalies)
      .catch(() => setAnomalies([]));
  }, [id, token]);

  const statusMeta = intervention ? STATUS_META[intervention.status] : null;
  const canEditTimes = intervention && (intervention.status === 'IN_PROGRESS' || intervention.status === 'COMPLETED');
  const canEditNote = intervention && (intervention.status === 'IN_PROGRESS' || intervention.status === 'COMPLETED');
  const canStart = intervention && intervention.status === 'PLANNED' && !started;
  const canFinish = intervention && intervention.status === 'IN_PROGRESS';
  const canValidate = intervention && (intervention.status === 'IN_PROGRESS' || intervention.status === 'COMPLETED');

  const agents = useMemo(
    () => intervention?.agents?.map((a) => a.name).join(', ') || 'Non assigné',
    [intervention],
  );

  if (loading) {
    return (
      <HeaderLayout title="Intervention" subtitle="Chargement..." accent="Superviseur">
        <ActivityIndicator color={theme.colors.primary} />
      </HeaderLayout>
    );
  }

  if (!intervention) {
    return (
      <HeaderLayout title="Intervention" subtitle="Introuvable" accent="Superviseur">
        <Text>Intervention introuvable.</Text>
      </HeaderLayout>
    );
  }

  const openModal = (mode: 'NO_SHOW' | 'START' | 'END') => {
    if (!note.trim()) {
      Alert.alert('Observation requise', 'Merci de renseigner une observation avant cette action.');
      return;
    }
    setModal({ visible: true, mode });
  };

  const confirmModal = () => {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setIntervention((prev) => {
      if (!prev) return prev;
      if (modal.mode === 'NO_SHOW') {
        return { ...prev, status: 'NO_SHOW', observation: note.trim() };
      }
      if (modal.mode === 'START') {
        return { ...prev, status: 'IN_PROGRESS', actualStartTime: prev.actualStartTime ?? now };
      }
      return { ...prev, status: 'COMPLETED', actualEndTime: prev.actualEndTime ?? now };
    });
    if (modal.mode === 'START' || modal.mode === 'END') {
      setStarted(true);
    }
    setModal({ visible: false, mode: 'NO_SHOW' });
  };

  const submitAnomaly = async () => {
    if (!token || !id) return;
    if (!anomalyForm.type.trim() || !anomalyForm.description.trim()) {
      Alert.alert('Champs requis', 'Type et description sont obligatoires.');
      return;
    }
    setCreatingAnomaly(true);
    try {
      const created = await createAnomaly(token, {
        interventionId: id as string,
        type: anomalyForm.type.trim(),
        description: anomalyForm.description.trim(),
        title: anomalyForm.title.trim() || undefined,
      });
      setAnomalies((prev) => [created, ...prev]);
      setAnomalyForm({ type: '', description: '', title: '' });
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de créer l’anomalie');
    } finally {
      setCreatingAnomaly(false);
    }
  };

  const resolveAnomaly = async (anomalyId: string) => {
    if (!token) return;
    try {
      const updated = await updateAnomalyStatus(token, anomalyId, 'RESOLVED');
      setAnomalies((prev) => prev.map((a) => (a.id === anomalyId ? updated : a)));
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de mettre à jour');
    }
  };

  return (
    <HeaderLayout
      title={intervention.siteName}
      subtitle={`${intervention.date} • ${intervention.startTime} → ${intervention.endTime}`}
      accent="Superviseur"
      trailing={
        statusMeta ? (
          <View style={[styles.statusChip, { backgroundColor: statusMeta.background }]}>
            <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        ) : null
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>{intervention.type === 'REGULAR' ? 'Régulière' : `Ponctuelle • ${intervention.subType ?? 'Sous-type'}`}</Text>
          <Text style={styles.meta}>{intervention.label || 'Sans libellé'}</Text>
          {intervention.type === 'PUNCTUAL' && intervention.truckLabels?.length ? (
            <Text style={styles.meta}>Camion(s) : {intervention.truckLabels.join(', ')}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agents</Text>
          <Text style={styles.meta}>{agents}</Text>
        </View>

        {intervention.truckLabels?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camions</Text>
            {intervention.truckLabels.map((truck) => (
              <View key={truck} style={styles.truckRow}>
                <Text style={styles.meta}>{truck}</Text>
                <View style={{ gap: 4 }}>
                  <Text style={styles.meta}>Matricule : N/A</Text>
                  <Text style={styles.meta}>Chauffeur : N/A</Text>
                  <Text style={styles.meta}>Capacité : N/A</Text>
                </View>
              </View>
            ))}
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>Camions arrivés</Text>
              <Button
                title={trucksConfirmed ? 'Confirmé' : 'Confirmer arrivée'}
                variant={trucksConfirmed ? 'primary' : 'ghost'}
                onPress={() => setTrucksConfirmed((v) => !v)}
              />
            </View>
            <TextInput
              style={styles.textarea}
              placeholder="Note superviseur liée aux camions"
              value={truckNote}
              onChangeText={setTruckNote}
              multiline
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anomalies</Text>
          {anomalies.length === 0 ? (
            <Text style={styles.meta}>Aucune anomalie.</Text>
          ) : (
            anomalies.map((anomaly) => (
              <View key={anomaly.id} style={styles.anomalyCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.meta}>{anomaly.type}</Text>
                  <Text style={[styles.statusLabel, anomaly.status === 'NEW' ? styles.statusNew : styles.statusResolved]}>
                    {anomaly.status === 'NEW' ? 'Nouveau' : 'Résolu'}
                  </Text>
                </View>
                {anomaly.title ? <Text style={styles.title}>{anomaly.title}</Text> : null}
                <Text style={styles.meta}>{anomaly.description}</Text>
                <Text style={styles.metaSmall}>
                  {anomaly.user?.name ?? '—'} • {new Date(anomaly.createdAt).toLocaleString('fr-FR')}
                </Text>
                {anomaly.photos?.length ? (
                  <View style={styles.photosRow}>
                    {anomaly.photos.map((uri) => (
                      <Image
                        key={uri}
                        source={{ uri }}
                        style={{ width: 64, height: 64, borderRadius: 8, marginRight: 6 }}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                ) : null}
                {anomaly.status === 'NEW' && (
                  <Button title="Marquer résolu" variant="ghost" onPress={() => resolveAnomaly(anomaly.id)} />
                )}
              </View>
            ))
          )}

          <View style={styles.anomalyForm}>
            <Text style={styles.sectionTitle}>Ajouter une anomalie</Text>
            <TextInput
              style={styles.input}
              placeholder="Type (ex: Accès impossible)"
              value={anomalyForm.type}
              onChangeText={(text) => setAnomalyForm((prev) => ({ ...prev, type: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Titre (optionnel)"
              value={anomalyForm.title}
              onChangeText={(text) => setAnomalyForm((prev) => ({ ...prev, title: text }))}
            />
            <TextInput
              style={[styles.textarea, { minHeight: 80 }]}
              placeholder="Description"
              value={anomalyForm.description}
              onChangeText={(text) => setAnomalyForm((prev) => ({ ...prev, description: text }))}
              multiline
            />
            <Button
              title={creatingAnomaly ? 'Enregistrement...' : 'Ajouter'}
              onPress={submitAnomaly}
              disabled={creatingAnomaly}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observation superviseur</Text>
          <TextInput
            style={styles.textarea}
            value={note}
            onChangeText={setNote}
            placeholder="Consignes ou remarques"
            multiline
            editable={!!canEditNote}
          />
          {!canEditNote && (
            <Text style={styles.meta}>Observation modifiable uniquement pendant ou après l'intervention.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horaires prévus</Text>
          <Text style={styles.meta}>
            {intervention.startTime} → {intervention.endTime}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horaires réels</Text>
          <Text style={styles.meta}>Modifiables quand l'intervention est en cours ou terminée.</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.meta}>Début</Text>
              <TextInput
                style={[styles.timeInput, !canEditTimes && styles.timeInputDisabled]}
                value={intervention.actualStartTime ?? intervention.startTime}
                onChangeText={(text) =>
                  canEditTimes &&
                  setIntervention((prev) => (prev ? { ...prev, actualStartTime: text } : prev))
                }
                editable={!!canEditTimes}
                placeholder="HH:MM"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.meta}>Fin</Text>
              <TextInput
                style={[styles.timeInput, !canEditTimes && styles.timeInputDisabled]}
                value={intervention.actualEndTime ?? intervention.endTime}
                onChangeText={(text) =>
                  canEditTimes &&
                  setIntervention((prev) => (prev ? { ...prev, actualEndTime: text } : prev))
                }
                editable={!!canEditTimes}
                placeholder="HH:MM"
              />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Marquer NO_SHOW" variant="ghost" onPress={() => openModal('NO_SHOW')} />
          <Button
            title="Démarrer l'intervention"
            variant="ghost"
            onPress={() => openModal('START')}
            disabled={!canStart}
          />
          <Button
            title="Terminer l'intervention"
            variant="ghost"
            onPress={() => openModal('END')}
            disabled={!canFinish}
          />
          {canValidate && (
            <Button
              title="Valider l'intervention"
              onPress={() =>
                setIntervention((prev) => (prev ? { ...prev, status: 'COMPLETED' } : prev))
              }
            />
          )}
          <Button title="Fermer" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>

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
                ? 'Confirmer NO_SHOW'
                : modal.mode === 'START'
                ? 'Confirmer pointage début'
                : 'Confirmer pointage fin'}
            </Text>
            <Text style={styles.meta}>
              Observation : {note.trim() || '—'}
            </Text>
            <Text style={styles.meta}>
              Vous allez enregistrer un pointage {modal.mode === 'START' ? 'début' : modal.mode === 'END' ? 'fin' : 'NO_SHOW'}.
            </Text>
            <View style={styles.modalActions}>
              <Button title="Annuler" variant="ghost" onPress={() => setModal((prev) => ({ ...prev, visible: false }))} />
              <Button
                title="Valider"
                onPress={confirmModal}
                disabled={!note.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.muted,
  },
  textarea: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.shell,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
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
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.shell,
  },
  timeInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: theme.colors.muted,
  },
  anomalyCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: '#f7f7f7',
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photosRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
  },
  statusNew: { color: '#b15b00' },
  statusResolved: { color: '#0b874b' },
  metaSmall: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  anomalyForm: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.shell,
  },
  truckRow: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
