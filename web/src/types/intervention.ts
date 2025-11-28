export type InterventionType = 'REGULAR' | 'PONCTUAL';
export type InterventionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'CANCELLED' | 'NO_SHOW';

export type Intervention = {
  id: string;
  siteId: string;
  siteName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: InterventionType;
  subType?: string;
  label?: string;
  agents: { id: string; name: string; attendanceId?: string; attendanceStatus?: string; arrivalTime?: string; checkInTime?: string; checkOutTime?: string }[];
  agentIds: string[];
  truckLabels: string[];
  observation?: string;
  photos?: string[];
  status: InterventionStatus;
};

export type InterventionRule = {
  id: string;
  siteId: string;
  agentIds: string[];
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  active: boolean;
  createdAt: string;
};
