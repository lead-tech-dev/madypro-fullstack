import { apiFetch } from './client';

export type ChatMessage = {
  id: string;
  threadUserId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export async function listMyThread(token: string) {
  const response = await apiFetch<ChatMessage[] | null>({ path: '/chat/threads/me', token });
  return Array.isArray(response) ? response : [];
}

export async function sendMyMessage(token: string, body: string) {
  return apiFetch<ChatMessage>({
    path: '/chat/threads/me/messages',
    token,
    options: { method: 'POST', body: JSON.stringify({ body }) },
  });
}

export async function markMyThreadRead(token: string) {
  return apiFetch<{ success: boolean }>({
    path: '/chat/threads/me/read',
    token,
    options: { method: 'PATCH' },
  });
}
