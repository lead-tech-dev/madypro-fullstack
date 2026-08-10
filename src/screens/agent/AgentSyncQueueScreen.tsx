import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { useSyncContext } from '@/context/SyncContext';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';

export default function AgentSyncQueueScreen() {
  const { pendingEvents, flush, clearQueue, removeEvent, isOnline, lastError } = useSyncContext();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await flush();
    setRefreshing(false);
  };

  return (
    <HeaderLayout title="File d'attente" subtitle="Actions hors ligne" accent="Synchronisation">
      <View style={styles.container}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Réseau : {isOnline ? 'en ligne' : 'hors ligne'}</Text>
          {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
        </View>
        <View style={styles.actionsRow}>
          <Button title="Synchroniser" onPress={flush} disabled={!pendingEvents.length} />
          <Button title="Vider la file" variant="ghost" onPress={clearQueue} disabled={!pendingEvents.length} />
        </View>
        <FlatList
          data={pendingEvents}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune action en attente. Tout est synchronisé.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.badge}>{item.type}</Text>
                <Text style={styles.time}>{item.timestamp?.slice(0, 16).replace('T', ' ')}</Text>
              </View>
              <Text style={styles.subtitle}>Intervention : {item.interventionId}</Text>
              <Text style={styles.subtitle}>Site : {item.siteId}</Text>
              <Text style={styles.status}>Statut : {item.status ?? 'pending'}</Text>
              {item.error ? <Text style={styles.errorText}>{item.error}</Text> : null}
              <View style={styles.actionsRow}>
                <Button title="Retirer" variant="ghost" onPress={() => removeEvent(item.id)} />
              </View>
            </View>
          )}
        />
      </View>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '600',
    color: theme.colors.ink,
  },
  errorText: {
    color: '#c62828',
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: theme.colors.primary,
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.md,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 12,
  },
  time: {
    color: theme.colors.muted,
  },
  subtitle: {
    color: theme.colors.muted,
  },
  status: {
    fontWeight: '600',
    color: theme.colors.ink,
  },
});
