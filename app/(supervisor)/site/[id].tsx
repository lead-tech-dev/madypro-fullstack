import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeaderLayout } from '../../../src/components/layout/HeaderLayout';
import { getSite } from '../../../src/services/api/sites.api';
import { Site } from '../../../src/types/site';
import { listInterventionsByRange } from '../../../src/services/api/interventions.api';
import { Intervention } from '../../../src/types/intervention';
import { theme } from '../../../src/config/theme';
import { Button } from '../../../src/components/ui/Button';
import { useAuthContext } from '../../../src/context/AuthContext';
import { listAttendance } from '../../../src/services/api/attendance.api';
import { Attendance } from '../../../src/types/attendance';

const todayISO = new Date().toISOString().split('T')[0];

type ManualModalState = {
  visible: boolean;
  intervention: Intervention | null;
  mode: 'start' | 'end';
  time: string;
  note: string;
};

type NoShowState = {
  visible: boolean;
  intervention: Intervention | null;
  note: string;
};

export default function SiteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noShow, setNoShow] = useState<NoShowState>({ visible: false, intervention: null, note: '' });
  const [manual, setManual] = useState<ManualModalState>({
    visible: false,
    intervention: null,
    mode: 'start',
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    note: '',
  });
  const { token } = useAuthContext();

  useEffect(() => {
    if (typeof id !== 'string' || !token) {
      return;
    }
    getSite(token, id).then((result) => result && setSite(result));
    listInterventionsByRange(token, 'today').then((data) =>
      setInterventions(data.filter((intervention) => intervention.siteId === id)),
    );
    listAttendance(token, { siteId: id, startDate: todayISO, endDate: todayISO, status: 'all' })
      .then(setAttendance)
      .catch(() => setAttendance([]));
  }, [id, token]);

  const stats = useMemo(() => {
    const completed = interventions.filter((i) => i.status === 'COMPLETED').length;
    return {
      total: interventions.length,
      completed,
      inProgress: interventions.filter((i) => i.status === 'IN_PROGRESS').length,
      pending: interventions.filter((i) => i.status === 'PLANNED').length,
    };
  }, [interventions]);

  const openDetail = (intervention: Intervention) => {
    router.push({ pathname: '/(supervisor)/intervention/[id]', params: { id: intervention.id } });
  };

  const openNoShow = (intervention: Intervention) => {
    setNoShow({
      visible: true,
      intervention,
      note: notes[intervention.id] ?? '',
    });
  };

  const confirmNoShow = () => {
    if (!noShow.intervention || !noShow.note.trim()) {
      Alert.alert('Observation requise', 'Merci de saisir un commentaire.');
      return;
    }
    setInterventions((prev) =>
      prev.map((item) =>
        item.id === noShow.intervention?.id
          ? {
              ...item,
              status: 'NO_SHOW',
            }
          : item,
      ),
    );
    setNotes((prev) => ({ ...prev, [noShow.intervention.id]: noShow.note.trim() }));
    setNoShow({ visible: false, intervention: null, note: '' });
  };

  const openManual = (intervention: Intervention, mode: 'start' | 'end') => {
    setManual({
      visible: true,
      intervention,
      mode,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      note: notes[intervention.id] ?? '',
    });
  };

  const confirmManual = () => {
    if (!manual.intervention || !manual.time || !manual.note.trim()) {
      Alert.alert('Champs requis', 'Merci de renseigner heure et observation.');
      return;
    }
    setInterventions((prev) =>
      prev.map((item) => {
        if (item.id !== manual.intervention?.id) {
          return item;
        }
        if (manual.mode === 'start') {
          return {
            ...item,
            status: 'IN_PROGRESS',
            actualStartTime: manual.time,
            actualStartAt: `${todayISO}T${manual.time}:00`,
          };
        }
        return {
          ...item,
          status: 'COMPLETED',
          actualEndTime: manual.time,
          actualEndAt: `${todayISO}T${manual.time}:00`,
        };
      }),
    );
    setNotes((prev) => ({ ...prev, [manual.intervention.id]: manual.note.trim() }));
    setManual({
      visible: false,
      intervention: null,
      mode: 'start',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      note: '',
    });
  };

  const agentsView = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        interventions: Intervention[];
        status: 'Non arrivé' | 'En intervention' | 'Terminée' | 'Absent';
        lastPointage?: string;
      }
    >();

    interventions.forEach((intervention) => {
      intervention.agentIds.forEach((agentId) => {
        const agent = intervention.agents?.find((a) => a.id === agentId);
        if (!agent) return;
        const entry = map.get(agentId) ?? {
          id: agentId,
          name: agent.name,
          interventions: [],
          status: 'Non arrivé' as const,
          lastPointage: undefined,
        };
        entry.interventions.push(intervention);

        const att = attendance
          .filter((a) => a.agent.id === agentId)
          .sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''));
        const first = att[0];
        const hasNoShow = intervention.status === 'NO_SHOW';
        const isCompleted = att.some((a) => a.status === 'COMPLETED' || a.checkOutTime);
        const isRunning = att.some((a) => a.checkInTime && !a.checkOutTime);

        if (hasNoShow) {
          entry.status = 'Absent';
        } else if (isCompleted) {
          entry.status = 'Terminée';
        } else if (isRunning) {
          entry.status = 'En intervention';
        } else {
          entry.status = 'Non arrivé';
        }
        entry.lastPointage = first?.checkInTime ?? first?.plannedStart ?? undefined;
        map.set(agentId, entry);
      });
    });

    return Array.from(map.values());
  }, [interventions, attendance]);

  if (!site) {
    return (
      <HeaderLayout title="Site" subtitle="Chargement..." accent="Superviseur">
        <Text style={{ padding: theme.spacing.xl }}>Site introuvable</Text>
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout
      title={site.name}
      subtitle={`${site.clientName ?? ''} ${site.address ?? ''}`.trim()}
      accent="Superviseur"
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Interventions</Text>
          </View>
          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{stats.inProgress}</Text>
            <Text style={styles.summaryLabel}>En cours</Text>
          </View>
          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{stats.completed}</Text>
            <Text style={styles.summaryLabel}>Terminées</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agents du site aujourd'hui</Text>
          {agentsView.length === 0 ? (
            <Text style={styles.muted}>Aucun agent prévu aujourd'hui.</Text>
          ) : (
            agentsView.map((agent) => (
              <View key={agent.id} style={styles.agentCard}>
                <View style={styles.agentRow}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentStatus}>{agent.status}</Text>
                </View>
                {agent.lastPointage && (
                  <Text style={styles.muted}>Dernier pointage : {agent.lastPointage}</Text>
                )}
                <Text style={styles.muted}>
                  Interventions :{' '}
                  {agent.interventions.map((i) => `${i.startTime}-${i.endTime}`).join(', ')}
                </Text>
                <View style={styles.actionsRow}>
                  <Button
                    title="Voir intervention"
                    variant="ghost"
                    onPress={() =>
                      router.push({ pathname: '/(supervisor)/intervention/[id]', params: { id: agent.interventions[0]?.id } })
                    }
                    disabled={!agent.interventions.length}
                  />
                  <Button title="Pointage manuel" variant="ghost" onPress={() => router.push('/(supervisor)/manual-check')} />
                  <Button
                    title="NO_SHOW"
                    variant="ghost"
                    onPress={() => agent.interventions[0] && openNoShow(agent.interventions[0])}
                    disabled={!agent.interventions.length}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {interventions.map((intervention) => (
          <View key={intervention.id} style={styles.interventionCard}>
            <View style={styles.interventionHeader}>
              <View style={{ gap: 4 }}>
                <Text style={styles.interventionTime}>
                  {intervention.startTime} → {intervention.endTime}
                </Text>
              <Text style={styles.interventionType}>
                {intervention.type === 'REGULAR' ? 'Régulière' : `Ponctuelle • ${intervention.subType ?? 'Sous-type'}`}
              </Text>
              <View style={styles.badgesRow}>
                <StatusPill status={intervention.status} />
                {intervention.hasAnomaly && <Text style={styles.badgeAnomaly}>⚠️ Anomalie</Text>}
                {intervention.type === 'PUNCTUAL' && <Text style={styles.badgeInfo}>Ponctuel</Text>}
                {intervention.type === 'PUNCTUAL' && intervention.truckLabels?.length ? (
                  <Text style={styles.badgeInfo}>Camion(s)</Text>
                ) : null}
              </View>
            </View>
          </View>

          <Text style={styles.assignees}>
            Agents : {intervention.agents?.map((agent) => agent.name).join(', ') || 'Non assigné'}
          </Text>
          {intervention.type === 'PUNCTUAL' && intervention.truckLabels?.length ? (
            <Text style={styles.assignees}>Camions : {intervention.truckLabels.join(', ')}</Text>
          ) : null}

          <TextInput
            style={styles.noteInput}
            placeholder="Observation superviseur"
            value={notes[intervention.id] ?? ''}
            onChangeText={(text) => setNotes((prev) => ({ ...prev, [intervention.id]: text }))}
            multiline
          />

          <View style={styles.actions}>
            <Button title="Voir" variant="ghost" onPress={() => openDetail(intervention)} />
            {intervention.status !== 'NO_SHOW' && (
              <Button title="Marquer NO SHOW" variant="ghost" onPress={() => openNoShow(intervention)} />
            )}
            {!intervention.actualStartTime && (
              <Button title="Pointer arrivée" variant="ghost" onPress={() => openManual(intervention, 'start')} />
            )}
            {intervention.status !== 'COMPLETED' && (
              <Button title="Pointer départ" variant="ghost" onPress={() => openManual(intervention, 'end')} />
            )}
          </View>
          </View>
        ))}

        <ActionModal
          visible={noShow.visible}
          title="Marquer en NO SHOW"
          note={noShow.note}
          onNoteChange={(note) => setNoShow((prev) => ({ ...prev, note }))}
          onClose={() => setNoShow({ visible: false, intervention: null, note: '' })}
          onConfirm={confirmNoShow}
          confirmLabel="Confirmer"
        />

        <ManualModal
          visible={manual.visible}
          time={manual.time}
          note={manual.note}
          mode={manual.mode}
          onClose={() =>
            setManual({
              visible: false,
              intervention: null,
              mode: 'start',
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              note: '',
            })
          }
          onTimeChange={(time) => setManual((prev) => ({ ...prev, time }))}
          onNoteChange={(note) => setManual((prev) => ({ ...prev, note }))}
          onConfirm={confirmManual}
        />
      </ScrollView>
    </HeaderLayout>
  );
}

const StatusPill: React.FC<{ status: Intervention['status'] }> = ({ status }) => {
  const meta = {
    PLANNED: { label: 'Planifiée', color: theme.colors.primary, background: theme.colors.primarySoft },
    IN_PROGRESS: { label: 'En cours', color: '#1e5aa6', background: '#e2ecff' },
    COMPLETED: { label: 'Terminée', color: '#0b874b', background: '#def5eb' },
    NO_SHOW: { label: 'Non effectuée', color: '#c62828', background: '#fdecea' },
    CANCELLED: { label: 'Annulée', color: '#6c6c6c', background: '#eeeeef' },
    NEEDS_REVIEW: { label: 'À valider', color: '#b15b00', background: '#fff2e1' },
  } satisfies Record<Intervention['status'], { label: string; color: string; background: string }>;
  const info = meta[status];
  return (
    <View style={[styles.pill, { backgroundColor: info.background }]}>\
      <Text style={[styles.pillLabel, { color: info.color }]}>{info.label}</Text>
    </View>
  );
};

const ActionModal: React.FC<{
  visible: boolean;
  title: string;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}> = ({ visible, title, note, onNoteChange, onClose, onConfirm, confirmLabel }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Observation"
          value={note}
          onChangeText={onNoteChange}
          multiline
        />
        <Button title={confirmLabel} onPress={onConfirm} />
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
    </View>
  </Modal>
);

const ManualModal: React.FC<{
  visible: boolean;
  mode: 'start' | 'end';
  time: string;
  note: string;
  onTimeChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ visible, mode, time, note, onTimeChange, onNoteChange, onClose, onConfirm }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {mode === 'start' ? 'Pointer arrivée' : 'Pointer départ'}
        </Text>
        <TextInput
          style={styles.modalInput}
          value={time}
          onChangeText={onTimeChange}
          placeholder="HH:MM"
        />
        <TextInput
          style={[styles.modalInput, { height: 100 }]}
          placeholder="Observation"
          value={note}
          onChangeText={onNoteChange}
          multiline
        />
        <Button title="Valider" onPress={onConfirm} />
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  summary: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    color: theme.colors.muted,
  },
  section: {
    backgroundColor: '#fff',
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    color: theme.colors.muted,
  },
  agentCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  agentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
  },
  agentStatus: {
    fontWeight: '700',
    color: '#1e40af',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  interventionCard: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  interventionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interventionTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  interventionType: {
    color: theme.colors.muted,
  },
  assignees: {
    color: theme.colors.ink,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.shell,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pill: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
  },
  pillLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  badgeAnomaly: {
    backgroundColor: '#fdecea',
    color: '#c62828',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    fontWeight: '700',
  },
  badgeInfo: {
    backgroundColor: theme.colors.shell,
    color: theme.colors.ink,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    backgroundColor: theme.colors.shell,
  },
});
