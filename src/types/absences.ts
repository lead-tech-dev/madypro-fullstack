export type AbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AbsenceType = 'SICK' | 'PAID_LEAVE' | 'UNPAID' | 'OTHER';

export type Absence = {
  id: string;
  agent: {
    id: string;
    name: string;
  };
  type: AbsenceType;
  status: AbsenceStatus;
  from: string;
  to: string;
  reason: string;
  note?: string;
  attachment?: string;
  validatedBy?: string;
  validationComment?: string;
};
