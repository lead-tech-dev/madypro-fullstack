import { Absence, AbsenceStatus, AbsenceType } from '../../types/absences';
import { apiFetch } from './client';

export async function listAbsences(token: string, filters: Partial<{ status: AbsenceStatus | 'all'; type: AbsenceType | 'all'; agentId: string }> = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.agentId) params.set('agentId', filters.agentId);
  const query = params.toString();
  const path = query ? `/absences?${query}` : '/absences';
  const response = await apiFetch<Absence[] | { data?: Absence[]; items?: Absence[]; results?: Absence[] } | null>({
    path,
    token,
  });
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.items && Array.isArray(response.items)) return response.items;
  if (response?.results && Array.isArray(response.results)) return response.results;
  return [];
}

type CreateAbsenceRequestPayload = {
  userId: string;
  type: AbsenceType;
  from: string;
  to: string;
  reason: string;
  note?: string;
};

export async function submitAbsenceRequest(token: string, payload: CreateAbsenceRequestPayload) {
  return apiFetch<Absence>({
    path: '/absences/request',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function updateAbsenceStatus(
  token: string,
  id: string,
  status: AbsenceStatus,
  validatedBy: string,
  comment?: string,
) {
  return apiFetch<Absence>({
    path: `/absences/${id}/status`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify({ status, validatedBy, comment }),
    },
  });
}
