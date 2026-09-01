import { apiFetch } from './client';

export type AvailabilityType = 'AVAILABLE' | 'UNAVAILABLE';

export type Availability = {
  id: string;
  userId: string;
  date: string;
  type: AvailabilityType;
  note?: string | null;
  createdAt: string;
};

export async function listMyAvailability(token: string) {
  const response = await apiFetch<Availability[] | null>({ path: '/availability/me', token });
  return Array.isArray(response) ? response : [];
}

export async function setAvailability(token: string, date: string, type: AvailabilityType, note?: string) {
  return apiFetch<Availability>({
    path: '/availability',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ date, type, note }),
    },
  });
}

export async function removeAvailability(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>({
    path: `/availability/${id}`,
    token,
    options: { method: 'DELETE' },
  });
}
