import { Attendance } from '../../types/attendance';
import { apiFetch } from './client';

export async function listAttendance(
  token: string,
  filters: Partial<{ startDate: string; endDate: string; agentId: string; interventionId: string; status: string }> = {},
) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.agentId) {
    params.set('agentId', filters.agentId);
    params.set('userId', filters.agentId); // compat backend
  }
  if (filters.interventionId) params.set('interventionId', filters.interventionId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  const path = query ? `/attendance?${query}` : '/attendance';
  return apiFetch<Attendance[]>({ path, token });
}

type ManualAttendancePayload = {
  userId: string;
  siteId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  note: string;
};

export async function createManualAttendance(token: string, payload: ManualAttendancePayload) {
  return apiFetch<Attendance>({
    path: '/attendance/manual',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

type CheckInPayload = {
  userId: string;
  siteId: string;
  latitude: number;
  longitude: number;
  interventionId?: string;
};

export async function checkIn(token: string, payload: CheckInPayload) {
  return apiFetch<Attendance>({
    path: '/attendance/check-in',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

type MarkArrivalPayload = {
  userId: string;
  siteId: string;
  latitude: number;
  longitude: number;
  interventionId?: string;
};

export async function markArrival(token: string, payload: MarkArrivalPayload) {
  return apiFetch<Attendance>({
    path: '/attendance/arrival',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

type CheckOutPayload = {
  userId: string;
  interventionId?: string;
};

export type HeartbeatPayload = {
  userId: string;
  siteId: string;
  latitude: number;
  longitude: number;
};

export async function checkOut(token: string, payload: CheckOutPayload) {
  return apiFetch<Attendance>({
    path: '/attendance/check-out',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function heartbeat(token: string, payload: HeartbeatPayload) {
  return apiFetch<Attendance>({
    path: '/attendance/heartbeat',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}
