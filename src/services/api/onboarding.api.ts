import { apiFetch } from './client';

export type OnboardingItem = {
  id: string;
  userId: string;
  label: string;
  order: number;
  done: boolean;
  completedAt: string | null;
  createdAt: string;
};

export async function listMyOnboarding(token: string, userId: string) {
  return apiFetch<OnboardingItem[]>({ path: `/onboarding/users/${userId}`, token });
}

export async function setOnboardingItemDone(token: string, itemId: string, done: boolean) {
  return apiFetch<OnboardingItem>({
    path: `/onboarding/items/${itemId}`,
    token,
    options: { method: 'PATCH', body: JSON.stringify({ done }) },
  });
}
