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

const REQUEST_TIMEOUT_MS = 20000;

export async function apiFetch<T>({ path, token, options = {} }: FetchArgs): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Le serveur ne répond pas. Vérifiez votre connexion et réessayez.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = response.statusText;
    const raw = await response.text();
    try {
      const data = JSON.parse(raw);
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message || message;
    } catch {
      if (raw) message = raw;
    }
    throw new Error(message || 'API error');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
