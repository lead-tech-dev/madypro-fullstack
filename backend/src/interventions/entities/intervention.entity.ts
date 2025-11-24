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
  status: InterventionStatus = 'PLANNED';
  createdAt!: Date;
  updatedAt!: Date;
  generatedFromRuleId?: string;
}

export class InterventionRuleEntity {
  id!: string;
  siteId!: string;
  agentIds: string[] = [];
  label!: string;
  startTime!: string;
  endTime!: string;
  daysOfWeek!: number[];
  active: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
}
