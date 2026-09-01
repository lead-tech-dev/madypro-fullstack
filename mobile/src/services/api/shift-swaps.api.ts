import { apiFetch } from './client';

export type ShiftSwapStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type ShiftSwapRequest = {
  id: string;
  interventionId: string;
  requesterId: string;
  targetUserId: string | null;
  status: ShiftSwapStatus;
  reason: string | null;
  createdAt: string;
  respondedAt: string | null;
  intervention: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    siteId: string;
  };
  requester: { id: string; firstName: string; lastName: string };
  target: { id: string; firstName: string; lastName: string } | null;
};

export type ShiftSwapColleague = { id: string; firstName: string; lastName: string };

export async function listShiftSwaps(token: string) {
  return apiFetch<ShiftSwapRequest[]>({ path: '/shift-swaps', token });
}

export async function listShiftSwapColleagues(token: string, search?: string) {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch<ShiftSwapColleague[]>({ path: `/shift-swaps/colleagues${query}`, token });
}

export async function createShiftSwap(
  token: string,
  interventionId: string,
  reason?: string,
  targetUserId?: string,
) {
  return apiFetch<ShiftSwapRequest>({
    path: '/shift-swaps',
    token,
    options: { method: 'POST', body: JSON.stringify({ interventionId, reason, targetUserId }) },
  });
}

export async function acceptShiftSwap(token: string, id: string) {
  return apiFetch<ShiftSwapRequest>({ path: `/shift-swaps/${id}/accept`, token, options: { method: 'POST' } });
}

export async function rejectShiftSwap(token: string, id: string) {
  return apiFetch<ShiftSwapRequest>({ path: `/shift-swaps/${id}/reject`, token, options: { method: 'POST' } });
}

export async function cancelShiftSwap(token: string, id: string) {
  return apiFetch<ShiftSwapRequest>({ path: `/shift-swaps/${id}/cancel`, token, options: { method: 'POST' } });
}
