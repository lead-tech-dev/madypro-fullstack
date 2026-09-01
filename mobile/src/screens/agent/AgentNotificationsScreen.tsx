import React, { useEffect, useMemo } from 'react';
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { useNotificationCenter } from '@/context/NotificationContext';
import { theme } from '@/config/theme';
import { useStaggeredFadeIn } from '@/hooks/useStaggeredFadeIn';
import type { NotificationItem } from '@/types/notification';

function getNotificationIcon(item: NotificationItem): keyof typeof Ionicons.glyphMap {
  const data = item.data as { interventionId?: unknown; anomalyId?: unknown } | undefined;
  if (data?.anomalyId) return 'alert-circle-outline';
  if (data?.interventionId) return 'time-outline';
  return 'notifications-outline';
}

export default function NotificationsScreen() {
  const { notifications, openNotification, markAllAsRead, refresh } = useNotificationCenter();
  const { getItemStyle } = useStaggeredFadeIn();

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
      <View style={styles.headerRow}>
        <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.headerRowText}>Vos notifications</Text>
      </View>
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
          renderItem={({ item, index }) => (
            <Animated.View style={getItemStyle(index)}>
              <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => openNotification(item)}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name={getNotificationIcon(item)} size={16} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(item.receivedAt)}</Text>
                </View>
                <Text style={styles.cardBody}>{item.message}</Text>
                {!item.read && <Text style={styles.unreadBadge}>Non lu</Text>}
              </TouchableOpacity>
            </Animated.View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  headerRowText: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 15,
    color: theme.colors.ink,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
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
