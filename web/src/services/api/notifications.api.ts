import { Notification, NotificationAudience } from '../../types/notification';
import { apiFetch } from './client';

export type SendNotificationPayload = {
  title: string;
  message: string;
  audience: NotificationAudience;
  targetId?: string;
};

export type NotificationPage = {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listNotifications(token: string, page: number = 1, pageSize: number = 20) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const data = await apiFetch<Notification[] | NotificationPage>({ path: `notifications?${params.toString()}`, token });
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page,
      pageSize: data.length || pageSize,
    };
  }
  return data;
}

export async function sendNotification(token: string, payload: SendNotificationPayload) {
  return apiFetch<Notification>({
    path: 'notifications',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}
