import { AuditAction } from '@prisma/client';

export { AuditAction };

export class AuditLog {
  id!: string;
  actorId!: string;
  action!: AuditAction;
  entityType!: string;
  entityId?: string;
  details?: string;
  createdAt!: Date;
}
