import { NotificationItem } from '../../types/notification';
import { apiFetch } from './client';

export async function listNotifications(token: string) {
  const serverNotifications = await apiFetch<ServerNotification[]>({ path: '/notifications/feed', token });
  return serverNotifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    receivedAt: notification.createdAt,
    read: false,
    audience: notification.audience,
    targetName: notification.targetName,
  } satisfies NotificationItem));
}

export async function registerNotificationToken(token: string, expoToken?: string, deviceToken?: string) {
  return apiFetch<{ success: boolean }>({
    path: '/notifications/register-token',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ expoToken, deviceToken }),
    },
  });
}

type ServerNotification = {
  id: string;
  title: string;
  message: string;
  audience: 'ALL_AGENTS' | 'SITE_AGENTS' | 'AGENT';
  targetId?: string;
  targetName?: string;
  createdAt: string;
};
