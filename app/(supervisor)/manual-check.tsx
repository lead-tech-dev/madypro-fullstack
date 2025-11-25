import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { theme } from '../../src/config/theme';
import { createManualAttendance } from '../../src/services/api/attendance.api';
import { useAuthContext } from '../../src/context/AuthContext';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { Intervention } from '../../src/types/intervention';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';

export default function ManualCheckScreen() {
  const [mode, setMode] = useState<'START' | 'END'>('START');
  const [interventionId, setInterventionId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const { token } = useAuthContext();
  const presetNotes = ["L’agent m’a appelé", 'Appareil HS', 'Début intervention confirmé sur site'];

  useEffect(() => {
    if (!token) return;
    listInterventionsByRange(token, 'today')
      .then((data) => setInterventions(data))
      .catch(() => setInterventions([]));
  }, [token]);

  const selectedIntervention = useMemo(
    () => interventions.find((i) => i.id === interventionId),
    [interventions, interventionId],
  );
  const agentOptions = selectedIntervention?.agents ?? [];

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Session expirée. Reconnectez-vous.');
      return;
    }
    if (!interventionId || !agentId || !date || !time || !note.trim()) {
      Alert.alert('Champs requis', 'Intervention, agent, heure et observation obligatoires.');
      return;
    }
    if (mode === 'START' && selectedIntervention && selectedIntervention.status === 'COMPLETED') {
      Alert.alert('Intervention terminée', 'Impossible de démarrer une intervention déjà terminée.');
      return;
    }
    setSubmitting(true);
    try {
      await createManualAttendance(
        token,
        {
          userId: agentId,
          siteId: selectedIntervention?.siteId ?? '',
          date,
          checkInTime: mode === 'START' ? time : selectedIntervention?.actualStartTime ?? time,
          checkOutTime: mode === 'END' ? time : undefined,
          note: `${mode === 'START' ? 'Start manuel' : 'End manuel'} - ${note.trim()}`,
        },
      );
      Alert.alert('Pointage enregistré', 'Le pointage manuel a été créé.');
      setAgentId('');
      setInterventionId('');
      setNote('');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de créer le pointage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HeaderLayout
      title="Pointage manuel"
      subtitle="Pointez à la place d’un agent en cas d’imprévu"
      accent="Superviseur"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Pointage assisté</Text>
          <Text style={styles.heroSubtitle}>Déclenchez un début ou une fin pour un agent.</Text>
          <View style={styles.modeSwitch}>
            <Button title="Début" variant={mode === 'START' ? 'primary' : 'ghost'} onPress={() => setMode('START')} />
            <Button title="Fin" variant={mode === 'END' ? 'primary' : 'ghost'} onPress={() => setMode('END')} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Intervention du jour</Text>
          <Text style={styles.helper}>Sélectionnez l’intervention et l’agent à pointer.</Text>
          <View style={styles.selector}>
            {interventions.length === 0 ? (
              <Text style={styles.selectorEmpty}>Aucune intervention trouvée.</Text>
            ) : (
              interventions.map((i) => {
                const active = i.id === interventionId;
                return (
                  <Button
                    key={i.id}
                    title={`${i.startTime} → ${i.endTime} • ${i.siteName}`}
                    variant={active ? 'primary' : 'ghost'}
                    onPress={() => {
                      setInterventionId(i.id);
                      setAgentId(i.agents?.[0]?.id ?? '');
                      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
                    }}
                  />
                );
              })
            )}
          </View>

          {agentOptions.length > 0 && (
            <View style={styles.selector}>
              <Text style={styles.selectorLabel}>Agent</Text>
              <View style={styles.rowWrap}>
                {agentOptions.map((agent) => {
                  const active = agent.id === agentId;
                  return (
                    <Button
                      key={agent.id}
                      title={agent.name}
                      variant={active ? 'primary' : 'ghost'}
                      onPress={() => setAgentId(agent.id)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Horodatage & motif</Text>
          <View style={styles.inputsRow}>
            <View style={{ flex: 1 }}>
              <Input label="Date" value={date} onChangeText={setDate} placeholder="2024-04-01" />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Heure"
                value={time}
                onChangeText={setTime}
                placeholder={new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              />
            </View>
          </View>
          <View style={styles.selector}>
            <Text style={styles.selectorLabel}>Motif</Text>
            <View style={styles.rowWrap}>
              {presetNotes.map((preset) => {
                const active = note === preset;
                return (
                  <Button
                    key={preset}
                    title={preset}
                    variant={active ? 'primary' : 'ghost'}
                    onPress={() => setNote(preset)}
                  />
                );
              })}
            </View>
          </View>
          <Input
            label="Observation (obligatoire)"
            value={note}
            onChangeText={setNote}
            placeholder="Ajoutez un commentaire si besoin"
          />
          <Button title={submitting ? 'Envoi…' : 'Valider'} onPress={handleSubmit} disabled={submitting} />
        </View>
      </ScrollView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  heroSubtitle: {
    color: theme.colors.muted,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  helper: {
    color: theme.colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  selector: {
    gap: theme.spacing.xs,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  selectorLabel: {
    fontWeight: '700',
  },
  selectorEmpty: {
    color: theme.colors.muted,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
});
