import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { useNotificationCenter } from '../../src/context/NotificationContext';
import { theme } from '../../src/config/theme';

export default function NotificationsScreen() {
  const { notifications, markAsRead, markAllAsRead, refresh } = useNotificationCenter();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
    [notifications],
  );

  return (
    <HeaderLayout
      title="Notifications"
      subtitle="Derniers rappels et messages"
      accent="Alertes"
      scrollable={false}
      contentStyle={styles.container}
    >
      <View style={styles.actions}>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.refresh}>Actualiser</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAll}>Marquer tout comme lu</Text>
        </TouchableOpacity>
      </View>
      {sorted.length === 0 ? (
        <Text style={styles.empty}>Aucune notification pour l’instant.</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => markAsRead(item.id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>{formatDate(item.receivedAt)}</Text>
              </View>
              <Text style={styles.cardBody}>{item.message}</Text>
              {!item.read && <Text style={styles.unreadBadge}>Non lu</Text>}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </HeaderLayout>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  actions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  refresh: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  markAll: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xl,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  cardDate: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  cardBody: {
    color: theme.colors.ink,
  },
  unreadBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
