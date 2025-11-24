import { Client } from '../../types/client';
import { apiFetch } from './client';

export type ClientsPage = { items: Client[]; total: number; page: number; pageSize: number };

export async function listClients(token: string): Promise<Client[]> {
  return apiFetch<Client[]>({ path: 'clients', token });
}

export async function listClientsPage(token: string, params?: { page?: number; pageSize?: number }): Promise<ClientsPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
  const path = search.toString() ? `clients?${search.toString()}` : 'clients';
  const res = await apiFetch<any>({ path, token });
  if (Array.isArray(res)) {
    return { items: res, total: res.length, page: 1, pageSize: res.length || 1 };
  }
  return res as ClientsPage;
}

type ClientPayload = {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export async function createClient(token: string, payload: ClientPayload) {
  return apiFetch<Client>({
    path: 'clients',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function updateClient(token: string, id: string, payload: ClientPayload) {
  return apiFetch<Client>({
    path: `clients/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  });
}

export async function deleteClient(token: string, id: string) {
  return apiFetch<void>({
    path: `clients/${id}`,
    token,
    options: {
      method: 'DELETE',
    },
  });
}
