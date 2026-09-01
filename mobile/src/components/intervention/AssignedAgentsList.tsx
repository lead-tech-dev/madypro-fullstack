import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { Intervention } from '@/types/intervention';
import { formatTime } from '@/utils/interventionTime';
import { StatusPill, StatusTone } from '@/components/ui/StatusPill';

type AssignedAgentsListProps = {
  agents: Intervention['agents'];
  currentUserId?: string;
};

const STATUS_META: Record<'COMPLETED' | 'IN_PROGRESS' | 'PENDING', { label: string; tone: StatusTone }> = {
  COMPLETED: { label: 'Terminé', tone: 'success' },
  IN_PROGRESS: { label: 'En cours', tone: 'info' },
  PENDING: { label: 'En attente', tone: 'neutral' },
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
        const meta = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.PENDING;
        return (
          <View key={agent.id} style={styles.agentRow}>
            <View style={styles.agentHeader}>
              <Ionicons name="person-outline" size={14} color={theme.colors.ink} />
              <Text style={styles.row}>
                {agent.name} {isCurrent ? '(vous)' : ''}
              </Text>
              <StatusPill label={meta.label} tone={meta.tone} />
            </View>
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
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  textMuted: {
    color: theme.colors.muted,
  },
  row: {
    color: theme.colors.ink,
  },
});
