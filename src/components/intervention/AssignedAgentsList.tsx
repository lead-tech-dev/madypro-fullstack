import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/config/theme';
import { Intervention } from '@/types/intervention';
import { formatTime } from '@/utils/interventionTime';

type AssignedAgentsListProps = {
  agents: Intervention['agents'];
  currentUserId?: string;
};

export const AssignedAgentsList: React.FC<AssignedAgentsListProps> = ({ agents, currentUserId }) => {
  if (!agents?.length) {
    return <Text style={styles.textMuted}>Aucun agent associé.</Text>;
  }

  return (
    <>
      {agents.map((agent) => {
        const isCurrent = agent.id === currentUserId;
        const status = agent.attendanceStatus ?? (agent.checkOutTime ? 'COMPLETED' : agent.checkInTime ? 'IN_PROGRESS' : 'PENDING');
        const statusLabel = status === 'COMPLETED' ? 'Terminé' : status === 'IN_PROGRESS' ? 'En cours' : 'En attente';
        const statusColor =
          status === 'COMPLETED' ? '#0b874b' : status === 'IN_PROGRESS' ? theme.colors.primary : theme.colors.muted;
        return (
          <View key={agent.id} style={styles.agentRow}>
            <Text style={styles.row}>
              • {agent.name} {isCurrent ? '(vous)' : ''}
            </Text>
            <Text style={[styles.statusInline, { color: statusColor }]}>({statusLabel})</Text>
            <Text style={styles.textMuted}>
              Arrivée : {agent.arrivalTime ? formatTime(new Date(agent.arrivalTime)) : '—'} · Début :{' '}
              {agent.checkInTime ? formatTime(new Date(agent.checkInTime)) : '—'} · Fin :{' '}
              {agent.checkOutTime ? formatTime(new Date(agent.checkOutTime)) : '—'}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  agentRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  statusInline: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  textMuted: {
    color: theme.colors.muted,
  },
  row: {
    color: theme.colors.ink,
  },
});
