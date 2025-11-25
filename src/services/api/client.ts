import { env } from '../../config/env';
import { Platform } from 'react-native';

type FetchArgs = {
  path: string;
  token?: string;
  options?: RequestInit;
};

const normalizeBaseUrl = () => {
  if (!env.apiUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_URL');
  }
  let base = env.apiUrl.replace(/\/$/, '');
  if (Platform.OS === 'android') {
    base = base.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return base;
};

const buildUrl = (path: string) => {
  const base = normalizeBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

export async function apiFetch<T>({ path, token, options = {} }: FetchArgs): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message || 'API error');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
