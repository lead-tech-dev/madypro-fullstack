import { Quote, QuoteStatus } from '../../types/quote';
import { apiFetch } from './client';

export type CreateQuotePayload = {
  siteId: string;
  interventionId?: string;
  label: string;
  amount: number;
  dueAt?: string;
  documentUrl?: string;
};

export async function listQuotes(token: string, siteId?: string) {
  const path = siteId ? `quotes?siteId=${encodeURIComponent(siteId)}` : 'quotes';
  return apiFetch<Quote[]>({ path, token });
}

export async function createQuote(token: string, payload: CreateQuotePayload) {
  return apiFetch<Quote>({
    path: 'quotes',
    token,
    options: { method: 'POST', body: JSON.stringify(payload) },
  });
}

export async function setQuoteStatus(token: string, id: string, status: QuoteStatus) {
  return apiFetch<Quote>({
    path: `quotes/${id}/status`,
    token,
    options: { method: 'PATCH', body: JSON.stringify({ status }) },
  });
}

export async function deleteQuote(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>({
    path: `quotes/${id}`,
    token,
    options: { method: 'DELETE' },
  });
}
