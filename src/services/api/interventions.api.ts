import { Intervention, InterventionStatus, InterventionType } from '../../types/intervention';
import { apiFetch } from './client';
import { getSite } from './sites.api';

export type InterventionFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  clientId?: string;
  type?: InterventionType | 'all';
  subType?: string;
  agentId?: string;
  status?: InterventionStatus | 'all';
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const rangeToFilters = (range: 'today' | 'week' | 'past'): Pick<InterventionFilters, 'startDate' | 'endDate'> => {
  const today = new Date();
  if (range === 'today') {
    const iso = formatDate(today);
    return { startDate: iso, endDate: iso };
  }
  if (range === 'week') {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return { startDate: formatDate(today), endDate: formatDate(end) };
  }
  const start = new Date(today);
  start.setDate(start.getDate() - 28);
  return { startDate: formatDate(start), endDate: formatDate(today) };
};

export async function fetchInterventions(token: string, filters: InterventionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.siteId) params.set('siteId', filters.siteId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.subType) params.set('subType', filters.subType);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  const query = params.toString();
  const path = query ? `/interventions?${query}` : '/interventions';
  const response = await apiFetch<Array<ApiIntervention>>({ path, token });

  return response.map((intervention) => mapIntervention(intervention));
}

export async function listInterventionsByRange(
  token: string,
  range: 'today' | 'week' | 'past',
  agentId?: string,
) {
  const filters = rangeToFilters(range);
  return fetchInterventions(token, { ...filters, agentId });
}

export async function getInterventionById(token: string, id: string): Promise<Intervention | null> {
  try {
    const intervention = await apiFetch<ApiIntervention>({ path: `/interventions/${id}`, token });
    const mapped = mapIntervention(intervention);
    // Always hydrate with site to ensure coords/address are present & numeric
    try {
      const site = await getSite(token, mapped.siteId);
      return {
        ...mapped,
        siteAddress: site.address ?? mapped.siteAddress,
        siteLatitude: typeof site.latitude === 'number' ? site.latitude : mapped.siteLatitude,
        siteLongitude: typeof site.longitude === 'number' ? site.longitude : mapped.siteLongitude,
      };
    } catch {
      return mapped;
    }
  } catch (error) {
    console.error('Failed to load intervention', error);
    return null;
  }
}

function mapIntervention(intervention: ApiIntervention): Intervention {
  const toNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    id: intervention.id,
    siteId: intervention.siteId,
    siteName: intervention.siteName,
    clientName: intervention.clientName,
    date: intervention.date,
    startTime: intervention.startTime,
    endTime: intervention.endTime,
    type: intervention.type,
    subType: intervention.subType,
    label: intervention.label,
    status: intervention.status,
    agentIds: intervention.agentIds,
    agents: intervention.agents ?? [],
    truckLabels: intervention.truckLabels ?? [],
    observation: intervention.observation,
    hasAnomaly: false,
    siteAddress: intervention.siteAddress,
    siteLatitude: toNumber(intervention.siteLatitude),
    siteLongitude: toNumber(intervention.siteLongitude),
  };
}

type ApiIntervention = {
  id: string;
  siteId: string;
  siteName: string;
  siteAddress?: string;
  siteLatitude?: number;
  siteLongitude?: number;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: InterventionType;
  subType?: string;
  label?: string;
  status: InterventionStatus;
  agentIds: string[];
  truckLabels?: string[];
  observation?: string;
  agents?: { id: string; name: string }[];
};
