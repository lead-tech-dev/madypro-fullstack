import { User } from '../../types/user';
import { apiFetch } from './client';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user: User;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>({
    path: 'auth/login',
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ message: string; password: string }>({
    path: 'auth/forgot-password',
    options: {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  });
}
