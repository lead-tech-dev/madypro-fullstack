export type AuditAction =
  | 'CREATE_NOTIFICATION'
  | 'CREATE_ABSENCE'
  | 'UPDATE_ABSENCE_STATUS'
  | 'CREATE_MANUAL_ATTENDANCE'
  | 'UPDATE_ATTENDANCE'
  | 'CANCEL_ATTENDANCE'
  | 'UPDATE_SETTINGS';

export type AuditLog = {
  id: string;
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
};
