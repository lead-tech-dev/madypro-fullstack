export type InterventionType = 'REGULAR' | 'PUNCTUAL' | 'PONCTUAL';
export type InterventionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'CANCELLED' | 'NO_SHOW';

export class InterventionEntity {
  id!: string;
  siteId!: string;
  date!: string;
  startTime!: string;
  endTime!: string;
  type!: InterventionType;
  subType?: string;
  label?: string;
  agentIds: string[] = [];
  truckLabels: string[] = [];
  observation?: string;
  photos: string[] = [];
  status: InterventionStatus = 'PLANNED';
  billable: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
  generatedFromRuleId?: string;
  generatedFromTourId?: string;
  batchId?: string;
}

export class InterventionRuleEntity {
  id!: string;
  siteId!: string;
  agentIds: string[] = [];
  label!: string;
  startTime!: string;
  endTime!: string;
  daysOfWeek!: number[];
  intervalWeeks: number = 1;
  startDate!: Date;
  endDate?: Date | null;
  active: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TourStopEntity {
  id!: string;
  dayOfWeek!: number;
  siteId!: string;
  startTime!: string;
  endTime!: string;
  agentIds: string[] = [];
  order: number = 0;
}

export class TourRuleEntity {
  id!: string;
  label!: string;
  intervalWeeks: number = 1;
  startDate!: Date;
  endDate?: Date | null;
  active: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
  stops: TourStopEntity[] = [];
}
