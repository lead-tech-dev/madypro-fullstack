export type ApprovalActionType =
  | 'CREATE_INTERVENTION'
  | 'UPDATE_INTERVENTION_SCHEDULE'
  | 'ASSIGN_AGENT'
  | 'UNASSIGN_AGENT'
  | 'CANCEL_INTERVENTION';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export type ApprovalRequest = {
  id: string;
  actionType: ApprovalActionType;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  previousState: Record<string, unknown> | null;
  status: ApprovalStatus;
  requestedById: string;
  requestedByName?: string;
  reviewedById?: string | null;
  reviewedByName?: string;
  reviewComment?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export const isApprovalRequest = (value: unknown): value is ApprovalRequest =>
  Boolean(value) && typeof value === 'object' && 'actionType' in (value as Record<string, unknown>);
