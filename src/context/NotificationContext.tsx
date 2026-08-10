import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { NotificationItem } from '../types/notification';
import { useAuthContext } from '../context/AuthContext';
import { listNotifications, registerNotificationToken } from '../services/api/notifications.api';
import { navigationRef } from '../navigation/navigationRef';
import { AgentTabParamList } from '../navigation/types';

type NotificationContextValue = {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  pushMockNotification: (notification: Partial<NotificationItem>) => void;
  refresh: () => Promise<void>;
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const STORAGE_KEY = 'notification-center';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuthContext();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);

  const addNotification = useCallback((notification: NotificationItem) => {
    setItems((prev) => [notification, ...prev]);
  }, []);

  const navigateToAgentTab = useCallback((screen?: keyof AgentTabParamList) => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Agent', {
      screen: 'AgentTabs',
      params: { screen: screen ?? 'AgentHome' },
    });
  }, []);

  const navigateFromPayload = useCallback(
    (data: unknown) => {
      if (!navigationRef.isReady() || !data || typeof data !== 'object') {
        return;
      }
      const payload = data as { path?: string; interventionId?: string | number; anomalyId?: string };
      if (payload.path) {
        navigateToAgentTab('AgentHome');
        return;
      }
      if (payload.interventionId) {
        const targetId = String(payload.interventionId);
        navigationRef.navigate('Agent', { screen: 'AgentIntervention', params: { id: targetId } });
      }
    },
    [navigateToAgentTab],
  );

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      const cachedItems: NotificationItem[] = cached ? JSON.parse(cached) : [];
      const cachedRead = new Map(cachedItems.map((n) => [n.id, n.read]));
      const history = await listNotifications(token);
      setItems((prev) => {
        const readMap = new Map(prev.map((item) => [item.id, item.read]));
        return history.map((notification) => ({
          ...notification,
          read: readMap.get(notification.id) ?? cachedRead.get(notification.id) ?? false,
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
    if (!token || !user) return;
    if (!expoPushToken && !devicePushToken) {
      console.warn('[Push] Aucun token à enregistrer (expo/native)');
      return;
    }
    console.log('[Push] Enregistrement tokens', { expoPushToken, devicePushToken });
    registerNotificationToken(token, expoPushToken || undefined, devicePushToken || undefined).catch((error) => {
      console.warn('Push token registration failed', error);
    });
  }, [token, expoPushToken, devicePushToken, user]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    registerForPushNotificationsAsync().then((value) => {
      if (!value) {
        Alert.alert(
          'Notifications désactivées',
          "Activez les notifications pour être informé en temps réel des interventions. Vérifiez les autorisations système et utilisez un appareil physique.",
        );
        console.warn('[Push] Aucun token obtenu (permission refusée ou simulateur).');
        return;
      }
      console.log('[Push] Token Expo reçu', value?.expoToken);
      console.log('[Push] Token natif reçu', value?.deviceToken);
      if (value?.expoToken) setExpoPushToken(value.expoToken);
      if (value?.deviceToken) setDevicePushToken(value.deviceToken);
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
  }, [addNotification, navigateFromPayload]);

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

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({
      notifications: items,
      markAsRead,
      markAllAsRead,
      pushMockNotification,
      refresh,
      unreadCount,
    }),
    [items, markAsRead, markAllAsRead, pushMockNotification, refresh, unreadCount],
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
