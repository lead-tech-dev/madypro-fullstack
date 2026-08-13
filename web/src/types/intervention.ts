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
  clientSignature?: string;
  billable: boolean;
  status: InterventionStatus;
};

export type AssignmentSuggestion = {
  interventionId: string;
  candidates: { id: string; name: string; distanceMeters: number | null }[];
};

export type RouteOptimizationResult = {
  userId: string;
  date: string;
  stops: { interventionId: string; siteName: string; startTime: string }[];
  totalDistanceMeters: number;
};

export type DurationEstimate = {
  siteId: string;
  type: string | null;
  sampleSize: number;
  estimatedMinutes: number | null;
};

export type InterventionRule = {
  id: string;
  siteId: string;
  agentIds: string[];
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  intervalWeeks: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
};

export type TourStop = {
  id: string;
  dayOfWeek: number;
  siteId: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
  order: number;
};

export type TourRule = {
  id: string;
  label: string;
  intervalWeeks: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  stops: TourStop[];
};

export type TourOccurrence = {
  date: string;
  stopId: string;
  siteId: string;
  siteName: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

export type TourPreview = {
  tourRuleId: string;
  tourRuleLabel: string;
  occurrences: TourOccurrence[];
};
