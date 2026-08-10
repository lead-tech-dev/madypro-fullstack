import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AbsenceEntity, AbsenceStatus, AbsenceType } from './entities/absence.entity';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { CreateAbsenceRequestDto } from './dto/create-absence-request.dto';
import { CreateManualAbsenceDto } from './dto/create-manual-absence.dto';
import { UpdateAbsenceStatusDto } from './dto/update-absence-status.dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { BadRequestException } from '@nestjs/common';

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
  attachment?: string;
  manual: boolean;
  createdBy: string;
  validatedBy?: string;
  validationComment?: string;
  site?: { id: string; name: string };
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
    const normalized = (value ?? '').trim();
    const d = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    return d;
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
      attachment: record.attachment ?? undefined,
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
      attachment: absence.attachment,
      manual: absence.manual,
      createdBy: absence.createdBy,
      validatedBy: absence.validatedBy,
      validationComment: absence.validationComment,
      site: site ? { id: site.id, name: site.name } : undefined,
    };
  }

  async list(filters: AbsenceFilters = {}, viewer?: { id?: string; role?: string }) {
    const where: Prisma.AbsenceWhereInput = {};
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.type && filters.type !== 'all') where.type = filters.type;
    const role = viewer?.role?.toString().trim().toUpperCase();
    if (role === 'AGENT') {
      if (!viewer?.id) {
        throw new UnauthorizedException('Utilisateur requis');
      }
      where.userId = viewer.id;
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
    if (!data.userId) {
      throw new BadRequestException('userId requis');
    }
    const fromDate = this.toDateOnly(data.from);
    const toDate = this.toDateOnly(data.to);
    if (fromDate > toDate) {
      throw new BadRequestException('La date de début doit être avant la date de fin');
    }
    const record = await this.prisma.absence.create({
      data: {
        userId: data.userId,
        siteId: data.siteId,
        type: data.type,
        status: 'PENDING',
        from: fromDate,
        to: toDate,
        reason: data.reason,
        note: data.note,
        attachment: data.attachment,
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
    const fromDate = this.toDateOnly(data.from);
    const toDate = this.toDateOnly(data.to);
    if (fromDate > toDate) {
      throw new BadRequestException('La date de début doit être avant la date de fin');
    }
    const record = await this.prisma.absence.create({
      data: {
        userId: data.userId,
        siteId: data.siteId,
        type: data.type,
        status: 'APPROVED',
        from: fromDate,
        to: toDate,
        reason: data.reason,
        note: data.note,
        attachment: data.attachment,
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

  /**
   * Pour une absence validée, propose pour chaque intervention impactée
   * des agents disponibles (ni déjà affectés, ni en conflit d'horaire,
   * ni eux-mêmes absents) pour remplacer l'agent absent.
   */
  async getReplacementSuggestions(id: string) {
    const absence = await this.prisma.absence.findUnique({ where: { id } });
    if (!absence) {
      throw new NotFoundException('Absence introuvable');
    }
    if (absence.status !== 'APPROVED') {
      return { absenceId: id, interventions: [] };
    }

    const dayEnd = new Date(absence.to.getTime());
    dayEnd.setUTCHours(23, 59, 59, 999);

    const affectedInterventions = await this.prisma.intervention.findMany({
      where: {
        date: { gte: absence.from, lte: dayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        assignments: { some: { userId: absence.userId } },
      },
      include: { assignments: true, site: true },
    });

    if (!affectedInterventions.length) {
      return { absenceId: id, interventions: [] };
    }

    const agents = await this.prisma.user.findMany({
      where: { role: 'AGENT', active: true, id: { not: absence.userId } },
    });

    const results = await Promise.all(
      affectedInterventions.map(async (intervention) => {
        const dateStr = intervention.date.toISOString().slice(0, 10);
        const dayStart = this.toDateOnly(dateStr);
        const thisDayEnd = new Date(dayStart.getTime());
        thisDayEnd.setUTCHours(23, 59, 59, 999);
        const start = new Date(`${dateStr}T${intervention.startTime}:00`);
        const end = new Date(`${dateStr}T${intervention.endTime}:00`);
        const assignedIds = new Set(intervention.assignments.map((a) => a.userId));

        const [sameDayInterventions, sameDayAbsences] = await Promise.all([
          this.prisma.intervention.findMany({
            where: {
              date: dayStart,
              id: { not: intervention.id },
              status: { notIn: ['CANCELLED'] },
              assignments: { some: { userId: { in: agents.map((a) => a.id) } } },
            },
            include: { assignments: true },
          }),
          this.prisma.absence.findMany({
            where: {
              status: 'APPROVED',
              userId: { in: agents.map((a) => a.id) },
              from: { lte: thisDayEnd },
              to: { gte: dayStart },
            },
          }),
        ]);

        const busyIds = new Set<string>();
        sameDayAbsences.forEach((a) => busyIds.add(a.userId));
        sameDayInterventions.forEach((other) => {
          const otherStart = new Date(`${dateStr}T${other.startTime}:00`);
          const otherEnd = new Date(`${dateStr}T${other.endTime}:00`);
          const overlaps = start < otherEnd && otherStart < end;
          if (!overlaps) return;
          other.assignments.forEach((a) => busyIds.add(a.userId));
        });

        const candidates = agents.filter((agent) => !assignedIds.has(agent.id) && !busyIds.has(agent.id));

        return {
          interventionId: intervention.id,
          siteId: intervention.siteId,
          siteName: intervention.site.name,
          date: dateStr,
          startTime: intervention.startTime,
          endTime: intervention.endTime,
          candidates: candidates.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`.trim() })),
        };
      }),
    );

    return { absenceId: id, interventions: results };
  }
}
