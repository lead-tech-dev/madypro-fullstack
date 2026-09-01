import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import {
  InterventionChecklistItem,
  listInterventionChecklist,
  toggleInterventionChecklistItem,
} from '@/services/api/interventions.api';

type InterventionChecklistProps = {
  interventionId: string;
};

export const InterventionChecklist: React.FC<InterventionChecklistProps> = ({ interventionId }) => {
  const { token } = useAuthContext();
  const [items, setItems] = React.useState<InterventionChecklistItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listInterventionChecklist(token, interventionId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, interventionId]);

  const toggle = async (item: InterventionChecklistItem) => {
    if (!token) return;
    setPendingId(item.id);
    const nextDone = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)));
    try {
      await toggleInterventionChecklistItem(token, interventionId, item.id, nextDone);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) {
    return <ActivityIndicator color={theme.colors.primary} />;
  }

  if (!items.length) {
    return (
      <Text style={styles.empty}>
        Aucune checklist définie pour ce site. Suivez les consignes partagées par votre équipe.
      </Text>
    );
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <View style={styles.list}>
      <Text style={styles.progress}>
        {doneCount}/{items.length} tâches réalisées
      </Text>
      {items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.row} onPress={() => toggle(item)} disabled={pendingId === item.id}>
          <Ionicons
            name={item.done ? 'checkbox' : 'square-outline'}
            size={22}
            color={item.done ? theme.colors.primary : theme.colors.muted}
          />
          <Text style={[styles.label, item.done && styles.labelDone]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.sm,
  },
  progress: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.bodySemiBold,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.ink,
    flexShrink: 1,
  },
  labelDone: {
    color: theme.colors.muted,
    textDecorationLine: 'line-through',
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
