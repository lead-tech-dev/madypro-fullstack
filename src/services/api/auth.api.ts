import { AuthResponse } from '../../types/auth';
import { apiFetch } from './client';

type LoginPayload = {
  email: string;
  password: string;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>({
    path: '/auth/login',
    options: {
      method: 'POST',
      body: JSON.stringify({ email, password } satisfies LoginPayload),
    },
  });
}
