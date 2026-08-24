import { apiFetch } from './client';

export type TeamPost = {
  id: string;
  message: string;
  photos: string[];
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; role: string };
};

export async function listTeamFeed(token: string, page = 1, pageSize = 20) {
  return apiFetch<TeamPost[]>({ path: `/team-feed?page=${page}&pageSize=${pageSize}`, token });
}

export async function createTeamPost(token: string, message: string) {
  return apiFetch<TeamPost>({
    path: '/team-feed',
    token,
    options: { method: 'POST', body: JSON.stringify({ message }) },
  });
}

export async function deleteTeamPost(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>({ path: `/team-feed/${id}`, token, options: { method: 'DELETE' } });
}
