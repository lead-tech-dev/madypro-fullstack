export type AgentPerformanceReport = {
  id: string;
  name: string;
  totalMinutes: number;
  workingDays: number;
  absenceMinutes: number;
  clients: { name: string; minutes: number }[];
};

export type SitePerformanceReport = {
  id: string;
  name: string;
  clientName: string;
  totalMinutes: number;
  agents: string[];
  uncoveredDays: number;
};

export type ReportsPerformance = {
  period: {
    startDate: string;
    endDate: string;
  };
  agentReports: AgentPerformanceReport[];
  siteReports: SitePerformanceReport[];
  totals: {
    totalMinutes: number;
    clients: { name: string; minutes: number }[];
  };
};
