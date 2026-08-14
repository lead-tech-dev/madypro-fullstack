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
  categoryId?: string;
  label?: string;
  agentIds: string[] = [];
  truckLabels: string[] = [];
  observation?: string;
  photos: string[] = [];
  status: InterventionStatus = 'PLANNED';
  billable: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
  generatedFromTemplateId?: string;
  batchId?: string;
}

export class TemplateStopEntity {
  id!: string;
  daysOfWeek!: number[];
  siteId!: string;
  categoryId?: string | null;
  startTime!: string;
  endTime!: string;
  agentIds: string[] = [];
  order: number = 0;
}

export class InterventionTemplateEntity {
  id!: string;
  label!: string;
  intervalWeeks: number = 1;
  startDate!: Date;
  endDate?: Date | null;
  autoGenerate: boolean = false;
  active: boolean = true;
  createdAt!: Date;
  updatedAt!: Date;
  stops: TemplateStopEntity[] = [];
}
