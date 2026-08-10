import { Site, SiteChecklistItem } from '../../types/site';
import { apiFetch } from './client';

export type SitePayload = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: string;
  active?: boolean;
  supervisorIds?: string[];
  accessInstructions?: string;
  accessCode?: string;
  contactName?: string;
  contactPhone?: string;
  photos?: string[];
  gpsDistanceMeters?: number;
  toleranceMinutes?: number;
  minimumDurationMinutes?: number;
};

export type SitesPage = { items: Site[]; total: number; page: number; pageSize: number };

export async function listSites(
  token: string,
  params?: { page?: number; pageSize?: number },
): Promise<SitesPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
  const path = search.toString() ? `sites?${search.toString()}` : 'sites';
  const res = await apiFetch<any>({ path, token });
  if (Array.isArray(res)) {
    return { items: res, total: res.length, page: 1, pageSize: res.length || 1 };
  }
  if (res && Array.isArray(res.items)) {
    return res as SitesPage;
  }
  return { items: [], total: 0, page: 1, pageSize: params?.pageSize ?? 20 };
}

export async function getSite(token: string, id: string): Promise<Site> {
  return apiFetch<Site>({ path: `sites/${id}`, token });
}

export async function createSite(token: string, payload: SitePayload): Promise<Site> {
  return apiFetch<Site>({
    path: 'sites',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function updateSite(token: string, id: string, payload: SitePayload): Promise<Site> {
  return apiFetch<Site>({
    path: `sites/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  });
}

export async function deleteSite(token: string, id: string): Promise<Site> {
  return apiFetch<Site>({
    path: `sites/${id}`,
    token,
    options: {
      method: 'DELETE',
    },
  });
}

export async function listSiteChecklist(token: string, siteId: string): Promise<SiteChecklistItem[]> {
  return apiFetch<SiteChecklistItem[]>({ path: `sites/${siteId}/checklist`, token });
}

export async function createSiteChecklistItem(
  token: string,
  siteId: string,
  payload: { label: string; order?: number },
): Promise<SiteChecklistItem> {
  return apiFetch<SiteChecklistItem>({
    path: `sites/${siteId}/checklist`,
    token,
    options: { method: 'POST', body: JSON.stringify(payload) },
  });
}

export async function deleteSiteChecklistItem(token: string, siteId: string, itemId: string): Promise<void> {
  await apiFetch({
    path: `sites/${siteId}/checklist/${itemId}`,
    token,
    options: { method: 'DELETE' },
  });
}
