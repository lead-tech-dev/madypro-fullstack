export type AbsenceType = 'SICK' | 'PAID_LEAVE' | 'UNPAID' | 'OTHER';
export type AbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export class AbsenceEntity {
  id!: string;
  userId!: string;
  siteId?: string;
  type!: AbsenceType;
  status!: AbsenceStatus;
  from!: string;
  to!: string;
  reason!: string;
  note?: string;
  manual!: boolean;
  createdBy!: 'USER' | 'ADMIN';
  createdAt!: Date;
  updatedAt!: Date;
  validatedBy?: string;
  validationComment?: string;
}
