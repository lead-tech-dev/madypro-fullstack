import { ReportsPerformance } from '../../types/report';
import { DashboardSummary } from '../../types/dashboard';
import { apiFetch, API_BASE_URL } from './client';

export async function getDashboardSummary(token: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>({ path: 'reports/summary', token });
}

export async function getPerformanceReport(
  token: string,
  filters: { startDate?: string; endDate?: string } = {}
) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const query = params.toString();
  const path = query ? `reports/performance?${query}` : 'reports/performance';
  return apiFetch<ReportsPerformance>({ path, token });
}

export async function getPayrollCsv(
  token: string,
  filters: { startDate?: string; endDate?: string } = {},
): Promise<string> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const query = params.toString();
  const path = `${API_BASE_URL.replace(/\/$/, '')}/reports/payroll${query ? `?${query}` : ''}`;
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error("Impossible de générer l'export paie");
  }
  return response.text();
}
