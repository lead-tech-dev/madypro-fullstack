import { ReportsPerformance } from '../../types/report';
import { DashboardSummary } from '../../types/dashboard';
import { apiFetch } from './client';

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
