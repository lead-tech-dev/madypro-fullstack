import {
  AssignmentSuggestion,
  DurationEstimate,
  Intervention,
  InterventionStatus,
  InterventionType,
  RouteOptimizationResult,
  TemplatePreview,
  InterventionTemplate,
} from '../../types/intervention';
import { ApprovalRequest, isApprovalRequest } from '../../types/approval';
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
  billable?: boolean;
};

export type UpdateInterventionPayload = Partial<CreateInterventionPayload> & {
  status?: InterventionStatus;
};

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

/**
 * Un superviseur reçoit une ApprovalRequest (PENDING) au lieu de l'intervention : son action
 * n'est pas appliquée tant qu'un admin ne l'a pas validée. L'appelant doit vérifier
 * isApprovalRequest() sur le résultat avant de traiter la réponse comme une Intervention.
 */
export async function createIntervention(
  token: string,
  payload: CreateInterventionPayload,
): Promise<Intervention | ApprovalRequest> {
  const item = await apiFetch<Intervention | ApprovalRequest>({
    path: 'interventions',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ ...payload, type: mapTypeToApi(payload.type) }),
    },
  });
  return isApprovalRequest(item) ? item : { ...item, type: mapTypeFromApi(item.type) };
}

export async function updateIntervention(
  token: string,
  id: string,
  payload: UpdateInterventionPayload,
): Promise<Intervention | ApprovalRequest> {
  const item = await apiFetch<Intervention | ApprovalRequest>({
    path: `interventions/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, type: mapTypeToApi(payload.type) }),
    },
  });
  return isApprovalRequest(item) ? item : { ...item, type: mapTypeFromApi(item.type) };
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

export async function cancelIntervention(
  token: string,
  id: string,
  observation: string,
): Promise<Intervention | ApprovalRequest> {
  const item = await apiFetch<Intervention | ApprovalRequest>({
    path: `interventions/${id}/cancel`,
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ observation }),
    },
  });
  return isApprovalRequest(item) ? item : { ...item, type: mapTypeFromApi(item.type) };
}

export type OneshotOccurrence = {
  siteId: string;
  date: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
  label?: string;
};

/**
 * Création ponctuelle (une seule fois) — un ou plusieurs arrêts en une soumission. Un seul arrêt
 * se comporte comme `createIntervention`, plusieurs déclenchent la sémantique de lot (batchId
 * partagé, notification consolidée par agent).
 */
export async function createOneshotBatch(
  token: string,
  occurrences: OneshotOccurrence[],
): Promise<Intervention[] | ApprovalRequest> {
  const item = await apiFetch<Intervention[] | ApprovalRequest>({
    path: 'interventions/batch',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ occurrences }),
    },
  });
  return isApprovalRequest(item) ? item : item.map((i) => ({ ...i, type: mapTypeFromApi(i.type) }));
}

export type TemplateStopPayload = {
  daysOfWeek: number[];
  siteId: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
  order?: number;
};

export type CreateTemplatePayload = {
  label: string;
  stops: TemplateStopPayload[];
  intervalWeeks?: number;
  startDate?: string;
  endDate?: string;
  autoGenerate?: boolean;
  active?: boolean;
};

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export async function listTemplates(token: string) {
  return apiFetch<InterventionTemplate[]>({ path: 'interventions/templates/list', token });
}

export async function createTemplate(token: string, payload: CreateTemplatePayload) {
  return apiFetch<InterventionTemplate>({
    path: 'interventions/templates',
    token,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  });
}

export async function updateTemplate(token: string, id: string, payload: UpdateTemplatePayload) {
  return apiFetch<InterventionTemplate>({
    path: `interventions/templates/${id}`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  });
}

export async function toggleTemplate(token: string, id: string, active: boolean) {
  return apiFetch<InterventionTemplate>({
    path: `interventions/templates/${id}/toggle`,
    token,
    options: {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    },
  });
}

export async function previewTemplate(token: string, id: string, startDate: string, endDate: string) {
  return apiFetch<TemplatePreview>({
    path: `interventions/templates/${id}/preview?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    token,
  });
}

export async function generateTemplate(token: string, id: string, startDate: string, endDate: string) {
  return apiFetch<Record<string, unknown>[] | { status: string }>({
    path: `interventions/templates/${id}/generate`,
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    },
  });
}

export async function getAssignmentSuggestions(token: string, interventionId: string) {
  return apiFetch<AssignmentSuggestion>({ path: `interventions/${interventionId}/assignment-suggestions`, token });
}

export async function getRouteOptimization(token: string, userId: string, date: string) {
  return apiFetch<RouteOptimizationResult>({
    path: `interventions/route-optimization?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`,
    token,
  });
}

export async function estimateDuration(token: string, siteId: string, type?: string) {
  const query = type ? `siteId=${encodeURIComponent(siteId)}&type=${encodeURIComponent(type)}` : `siteId=${encodeURIComponent(siteId)}`;
  return apiFetch<DurationEstimate>({ path: `interventions/estimate-duration?${query}`, token });
}

export async function setClientSignature(token: string, interventionId: string, signature: string) {
  return apiFetch<{ id: string; clientSignature: string }>({
    path: `interventions/${interventionId}/signature`,
    token,
    options: { method: 'POST', body: JSON.stringify({ signature }) },
  });
}
