import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { NotificationItem } from '../types/notification';
import { useAuthContext } from '../context/AuthContext';
import { listNotifications, registerNotificationToken } from '../services/api/notifications.api';

type NotificationContextValue = {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  pushMockNotification: (notification: Partial<NotificationItem>) => void;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { token, user } = useAuthContext();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const addNotification = useCallback((notification: NotificationItem) => {
    setItems((prev) => [notification, ...prev]);
  }, []);

  const navigateFromPayload = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== 'object') {
        return;
      }
      const payload = data as { path?: string; interventionId?: string; anomalyId?: string };
      if (payload.path) {
        router.push(payload.path);
        return;
      }
      if (payload.interventionId) {
        const supPath = '/(supervisor)/intervention/[id]';
        const agentPath = '/(agent)/intervention/[id]';
        const pathname = user?.role === 'SUPERVISOR' ? supPath : agentPath;
        router.push({ pathname, params: { id: String(payload.interventionId) } });
        return;
      }
      if (payload.anomalyId && payload.interventionId) {
        // pas d'écran anomalie dédié : on ouvre l'intervention correspondante
        const supPath = '/(supervisor)/intervention/[id]';
        const agentPath = '/(agent)/intervention/[id]';
        const pathname = user?.role === 'SUPERVISOR' ? supPath : agentPath;
        router.push({ pathname, params: { id: String(payload.interventionId) } });
      }
    },
    [router, user?.role],
  );

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    try {
      const history = await listNotifications(token);
      setItems((prev) => {
        // merge read state with previous entries
        const readMap = new Map(prev.map((item) => [item.id, item.read]));
        return history.map((notification) => ({
          ...notification,
          read: readMap.get(notification.id) ?? false,
        }));
      });
    } catch (error) {
      console.warn('Failed to load notifications', error);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!token || !expoPushToken) return;
    registerNotificationToken(token, expoPushToken).catch((error) => {
      console.warn('Push token registration failed', error);
    });
  }, [token, expoPushToken]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    registerForPushNotificationsAsync()
      .then((value) => setExpoPushToken(value))
      .catch((err) => {
        console.warn('Permissions push refusées', err);
        Alert.alert(
          'Notifications désactivées',
          "Activez les notifications pour être informé en temps réel des interventions.",
        );
      });

    const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      addNotification({
        id: notification.request.identifier,
        title: content.title ?? 'Notification',
        message: content.body ?? '',
        receivedAt: new Date().toISOString(),
        read: false,
        data: (content.data as Record<string, unknown>) ?? undefined,
      });
      if (content.body || content.title) {
        Alert.alert(content.title ?? 'Notification', content.body ?? '');
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      navigateFromPayload(content.data);
      setItems((prev) =>
        prev.map((item) =>
          item.id === response.notification.request.identifier ? { ...item, read: true } : item,
        ),
      );
    });

    return () => {
      receiveSub.remove();
      responseSub.remove();
    };
  }, [addNotification, router]);

  const markAsRead = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const pushMockNotification = useCallback(
    (notification: Partial<NotificationItem>) => {
      addNotification({
        id: notification.id ?? `local-${Date.now()}`,
        title: notification.title ?? 'Notification',
        message: notification.message ?? '',
        receivedAt: notification.receivedAt ?? new Date().toISOString(),
        read: notification.read ?? false,
        data: notification.data,
      });
    },
    [addNotification],
  );

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const value = useMemo(
    () => ({
      notifications: items,
      markAsRead,
      markAllAsRead,
      pushMockNotification,
      refresh,
    }),
    [items, markAsRead, markAllAsRead, pushMockNotification, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationCenter = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within NotificationProvider');
  }
  return ctx;
};
