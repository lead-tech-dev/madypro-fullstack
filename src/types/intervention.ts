export type InterventionType = 'REGULAR' | 'PUNCTUAL';

export type InterventionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'NEEDS_REVIEW';

export type Intervention = {
  id: string;
  siteId: string;
  siteName: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: InterventionType;
  subType?: string;
  label?: string;
  status: InterventionStatus;
  agentIds: string[];
  agents: { id: string; name: string }[];
  truckLabels: string[];
  observation?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  siteAddress?: string;
  siteLatitude?: number;
  siteLongitude?: number;
  hasAnomaly?: boolean;
};
