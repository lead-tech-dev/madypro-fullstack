import { Site } from '../../types/site';
import { apiFetch } from './client';

export async function listSites(token: string) {
  return apiFetch<Site[]>({ path: '/sites', token });
}

export async function getSite(token: string, id: string) {
  console.log("------------inside-----------")
  return apiFetch<Site>({ path: `/sites/${id}`, token });
}
