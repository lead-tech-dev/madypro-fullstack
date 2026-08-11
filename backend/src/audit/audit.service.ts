import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditAction } from './audit.entity';

export type AuditFilters = {
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogInput = {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(log: AuditLogInput) {
    return this.prisma.auditLog.create({ data: log as any }).catch((err) => {
      this.logger.warn(`Échec d'enregistrement d'audit (${log.action}/${log.entityType}): ${err.message}`);
      return undefined;
    });
  }

  async list(filters: AuditFilters = {}) {
    const where: Record<string, unknown> = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async exportCsv(filters: AuditFilters = {}) {
    const where: Record<string, unknown> = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }
    const items = await this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' } });
    const escape = (value: unknown) => {
      const str = value == null ? '' : String(typeof value === 'object' ? JSON.stringify(value) : value);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const header = 'Date;Acteur;Action;Type;Entité;Détails;Avant;Après';
    const lines = items.map((item) =>
      [
        item.createdAt.toISOString(),
        item.actorId,
        item.action,
        item.entityType,
        item.entityId ?? '',
        item.details ?? '',
        item.before ?? '',
        item.after ?? '',
      ]
        .map(escape)
        .join(';'),
    );
    return [header, ...lines].join('\n');
  }
}
