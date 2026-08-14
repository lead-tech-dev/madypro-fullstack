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
  categoryId?: string;
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

export type TemplateStop = {
  id: string;
  daysOfWeek: number[];
  siteId: string;
  categoryId?: string | null;
  startTime: string;
  endTime: string;
  agentIds: string[];
  order: number;
};

export type InterventionTemplate = {
  id: string;
  label: string;
  intervalWeeks: number;
  startDate: string;
  endDate: string | null;
  autoGenerate: boolean;
  active: boolean;
  createdAt: string;
  stops: TemplateStop[];
};

export type TemplateOccurrence = {
  date: string;
  stopId: string;
  siteId: string;
  siteName: string;
  categoryId?: string | null;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

export type TemplatePreview = {
  templateId: string;
  templateLabel: string;
  occurrences: TemplateOccurrence[];
};
