import { Injectable } from '@nestjs/common';
import { AuditLog, AuditAction } from './audit.entity';

export type AuditFilters = {
  actorId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AuditService {
  private logs: AuditLog[] = [];

  constructor() {
    this.logs = [
      {
        id: 'audit-1',
        actorId: 'admin@madyproclean.com',
        action: 'UPDATE_SETTINGS',
        entityType: 'settings',
        details: 'Tolérance horaires ajustée à 10 min',
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    ];
  }

  record(log: Omit<AuditLog, 'id' | 'createdAt'>) {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date(),
      ...log,
    };
    this.logs.unshift(entry);
    return entry;
  }

  list(filters: AuditFilters = {}) {
    const filtered = this.logs.filter((log) => {
      if (filters.actorId && log.actorId !== filters.actorId) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.startDate && log.createdAt < new Date(filters.startDate)) return false;
      if (filters.endDate && log.createdAt > new Date(filters.endDate)) return false;
      return true;
    });
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return {
      items,
      total: filtered.length,
      page,
      pageSize,
    };
  }
}
