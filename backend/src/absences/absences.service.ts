import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AbsenceEntity, AbsenceStatus, AbsenceType } from './entities/absence.entity';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { CreateAbsenceRequestDto } from './dto/create-absence-request.dto';
import { CreateManualAbsenceDto } from './dto/create-manual-absence.dto';
import { UpdateAbsenceStatusDto } from './dto/update-absence-status.dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';

type AbsenceFilters = {
  status?: AbsenceStatus | 'all';
  type?: AbsenceType | 'all';
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

type AbsenceView = {
  id: string;
  agent: { id: string; name: string };
  type: AbsenceType;
  status: AbsenceStatus;
  from: string;
  to: string;
  reason: string;
  note?: string;
  manual: boolean;
  createdBy: string;
  validatedBy?: string;
  validationComment?: string;
  site?: { id: string; name: string; clientName: string };
};

type AbsenceRecord = Prisma.AbsenceGetPayload<{
  include: { site: false };
}>;

@Injectable()
export class AbsencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly sitesService: SitesService,
    private readonly auditService: AuditService,
  ) {}

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toEntity(record: AbsenceRecord): AbsenceEntity {
    return {
      id: record.id,
      userId: record.userId,
      siteId: record.siteId ?? undefined,
      type: record.type,
      status: record.status,
      from: record.from.toISOString().slice(0, 10),
      to: record.to.toISOString().slice(0, 10),
      reason: record.reason,
      note: record.note ?? undefined,
      manual: record.manual,
      createdBy: record.createdBy as 'USER' | 'ADMIN',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      validatedBy: record.validatedBy ?? undefined,
      validationComment: record.validationComment ?? undefined,
    };
  }

  private toView(absence: AbsenceEntity): AbsenceView {
    const user = this.usersService.findOne(absence.userId);
    const site = absence.siteId ? this.sitesService.findOne(absence.siteId) : null;
    return {
      id: absence.id,
      agent: { id: user?.id ?? absence.userId, name: user?.name ?? 'Agent inconnu' },
      type: absence.type,
      status: absence.status,
      from: absence.from,
      to: absence.to,
      reason: absence.reason,
      note: absence.note,
      manual: absence.manual,
      createdBy: absence.createdBy,
      validatedBy: absence.validatedBy,
      validationComment: absence.validationComment,
      site: site ? { id: site.id, name: site.name, clientName: site.clientName } : undefined,
    };
  }

  async list(filters: AbsenceFilters = {}, viewer?: { id?: string; role?: string }) {
    const where: Prisma.AbsenceWhereInput = {};
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.type && filters.type !== 'all') where.type = filters.type;
    const role = viewer?.role?.toString().trim().toUpperCase();
    const forcedUserId = role === 'AGENT' ? viewer?.id : undefined;
    if (forcedUserId) {
      where.userId = forcedUserId;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.startDate) {
      where.to = { gte: this.toDateOnly(filters.startDate) };
    }
    if (filters.endDate) {
      where.from = { lte: this.toDateOnly(filters.endDate) };
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [records, total] = await Promise.all([
      this.prisma.absence.findMany({
        where,
        orderBy: [{ from: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.absence.count({ where }),
    ]);
    // filet de sécurité : si AGENT, on ne retourne que ses propres demandes même si un filtre incorrect est passé
    const filteredRecords =
      role === 'AGENT' && viewer?.id ? records.filter((r) => r.userId === viewer.id) : records;
    return {
      items: filteredRecords.map((record) => this.toView(this.toEntity(record))),
      total: role === 'AGENT' ? filteredRecords.length : total,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const record = await this.prisma.absence.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('Absence introuvable');
    }
    return this.toView(this.toEntity(record));
  }

  async request(data: CreateAbsenceRequestDto) {
    const record = await this.prisma.absence.create({
      data: {
        userId: data.userId,
        siteId: data.siteId,
        type: data.type,
        status: 'PENDING',
        from: this.toDateOnly(data.from),
        to: this.toDateOnly(data.to),
        reason: data.reason,
        note: data.note,
        manual: false,
        createdBy: 'USER',
      },
    });
    this.auditService.record({
      actorId: data.userId,
      action: 'CREATE_ABSENCE',
      entityType: 'absence',
      entityId: record.id,
      details: `Demande ${data.type}`,
    });
    return this.toView(this.toEntity(record));
  }

  async createManual(data: CreateManualAbsenceDto) {
    const record = await this.prisma.absence.create({
      data: {
        userId: data.userId,
        siteId: data.siteId,
        type: data.type,
        status: 'APPROVED',
        from: this.toDateOnly(data.from),
        to: this.toDateOnly(data.to),
        reason: data.reason,
        note: data.note,
        manual: true,
        createdBy: 'ADMIN',
        validatedBy: 'ADMIN',
      },
    });
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'CREATE_ABSENCE',
      entityType: 'absence',
      entityId: record.id,
      details: `Manuel ${data.type}`,
    });
    return this.toView(this.toEntity(record));
  }

  async updateStatus(id: string, dto: UpdateAbsenceStatusDto) {
    const record = await this.prisma.absence.update({
      where: { id },
      data: {
        status: dto.status,
        validatedBy: dto.validatedBy,
        validationComment: dto.comment,
      },
    });
    this.auditService.record({
      actorId: dto.validatedBy,
      action: 'UPDATE_ABSENCE_STATUS',
      entityType: 'absence',
      entityId: id,
      details: dto.status,
    });
    return this.toView(this.toEntity(record));
  }
}
