import { Intervention, InterventionRule, InterventionStatus, InterventionType } from '../../types/intervention';
import { apiFetch } from './client';

export type InterventionFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  type?: InterventionType | 'all';
  subType?: string;
  agentId?: string;
  status?: InterventionStatus | 'all';
  page?: number;
  pageSize?: number;
};
export type InterventionsPage = { items: Intervention[]; total: number; page: number; pageSize: number };

export type CreateInterventionPayload = {
  type: InterventionType;
  siteId: string;
  date: string;
  startTime: string;
  endTime: string;
  label?: string;
  subType?: string;
  agentIds: string[];
  truckLabels?: string[];
  observation?: string;
  photos?: string[];
};

export type UpdateInterventionPayload = Partial<CreateInterventionPayload> & {
  status?: InterventionStatus;
};

export type CreateRulePayload = {
  siteId: string;
  agentIds: string[];
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  active?: boolean;
};

export type UpdateRulePayload = Partial<CreateRulePayload>;

const mapTypeFromApi = (type: InterventionType | 'PUNCTUAL'): InterventionType =>
  type === 'PUNCTUAL' ? 'PONCTUAL' : type;
const mapTypeToApi = (type: InterventionType | undefined) =>
  type === 'PONCTUAL' ? 'PUNCTUAL' : type;

export async function listInterventions(token: string, filters: InterventionFilters = {}): Promise<InterventionsPage> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.siteId) params.set('siteId', filters.siteId);
  if (filters.type && filters.type !== 'all') params.set('type', mapTypeToApi(filters.type) as string);
  if (filters.subType) params.set('subType', filters.subType);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  const path = query ? `interventions?${query}` : 'interventions';
  const data = await apiFetch<any>({ path, token });
  if (Array.isArray(data)) {
    return {
      items: data.map((item) => ({ ...item, type: mapTypeFromApi(item.type) })),
      total: data.length,
      page: 1,
      pageSize: data.length || 1,
    };
  }
  const mapped = (data.items ?? []).map((item: any) => ({ ...item, type: mapTypeFromApi(item.type) }));
  return { ...data, items: mapped } as InterventionsPage;
}

export async function createIntervention(token: string, payload: CreateInterventionPayload) {
  return apiFetch<Intervention>({
    path: 'interventions',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ ...payload, type: mapTypeToApi(payload.type) }),
    },
  }).then((item) => ({ ...item, type: mapTypeFromApi(item.type) }));
}

export async function updateIntervention(token: string, id: string, payload: UpdateInterventionPayload) {
  return apiFetch<Intervention>({
    path: `interventions/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, type: mapTypeToApi(payload.type) }),
    },
  }).then((item) => ({ ...item, type: mapTypeFromApi(item.type) }));
}

export async function duplicateIntervention(token: string, id: string, date: string) {
  return apiFetch<Intervention>({
    path: `interventions/${id}/duplicate`,
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ date }),
    },
  });
}

export async function cancelIntervention(token: string, id: string, observation: string) {
  return apiFetch<Intervention>({
    path: `interventions/${id}/cancel`,
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ observation }),
    },
  }).then((item) => ({ ...item, type: mapTypeFromApi(item.type) }));
}

export async function listRules(token: string) {
  return apiFetch<InterventionRule[]>({ path: 'interventions/rules/list', token });
}

export async function createRule(token: string, payload: CreateRulePayload) {
  return apiFetch<InterventionRule>({
    path: 'interventions/rules',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function updateRule(token: string, id: string, payload: UpdateRulePayload) {
  return apiFetch<InterventionRule>({
    path: `interventions/rules/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  });
}

export async function toggleRule(token: string, id: string, active: boolean) {
  return apiFetch<InterventionRule>({
    path: `interventions/rules/${id}/toggle`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    },
  });
}
