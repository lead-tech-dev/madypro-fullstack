import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  InterventionEntity,
  InterventionRuleEntity,
  InterventionStatus,
  InterventionType,
} from './entities/intervention.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { DuplicateInterventionDto } from './dto/duplicate-intervention.dto';
import { CreateInterventionRuleDto } from './dto/create-rule.dto';
import { UpdateInterventionRuleDto } from './dto/update-rule.dto';
import { SitesService } from '../sites/sites.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';

export type InterventionFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  clientId?: string;
  type?: InterventionType | 'all';
  subType?: string;
  agentId?: string;
  status?: InterventionStatus | 'all';
  page?: number;
  pageSize?: number;
};

export type InterventionView = InterventionEntity & {
  siteName: string;
  clientName: string;
  agents: { id: string; name: string }[];
};

type InterventionRecord = Prisma.InterventionGetPayload<{
  include: { assignments: true; trucks: true };
}>;

type PersistedInterventionType = 'REGULAR' | 'PUNCTUAL';

@Injectable()
export class InterventionsService implements OnModuleInit {
  private readonly logger = new Logger(InterventionsService.name);
  private generatingRules = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
    private readonly usersService: UsersService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.generateFromRules();
    setInterval(() => {
      this.generateFromRules().catch((error) =>
        this.logger.error('Erreur lors de la génération automatique des interventions', error.stack),
      );
    }, 1000 * 60 * 60 * 6);
  }

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private endOfDay(value: string) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  private toEntity(record: InterventionRecord): InterventionEntity {
    const now = new Date();
    const dateBase = new Date(record.date);
    const [endHour, endMinute] = record.endTime.split(':').map((v) => parseInt(v, 10) || 0);
    const plannedEnd = new Date(dateBase);
    plannedEnd.setHours(endHour, endMinute, 0, 0);
    const status: InterventionStatus =
      (record.status === 'PLANNED' || record.status === 'IN_PROGRESS') && now > plannedEnd
        ? 'NO_SHOW'
        : record.status;
    return {
      id: record.id,
      siteId: record.siteId,
      date: record.date.toISOString().slice(0, 10),
      startTime: record.startTime,
      endTime: record.endTime,
      type: record.type,
      subType: record.subType ?? undefined,
      label: record.label ?? undefined,
      agentIds: record.assignments.map((assignment) => assignment.userId),
      truckLabels: record.trucks.map((truck) => truck.label),
      observation: record.observation ?? undefined,
      status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      generatedFromRuleId: record.generatedFromRuleId ?? undefined,
    };
  }

  private normalizeTypeInput(type?: InterventionType): PersistedInterventionType | undefined {
    if (!type) {
      return undefined;
    }
    if (type === 'PONCTUAL') {
      return 'PUNCTUAL';
    }
    return type as PersistedInterventionType;
  }

  private present(entity: InterventionEntity): InterventionView {
    const site = this.sitesService.findOne(entity.siteId);
    const agents = entity.agentIds
      .map((id) => this.usersService.findOne(id))
      .filter((user): user is NonNullable<ReturnType<UsersService['findOne']>> => Boolean(user))
      .map((user) => ({ id: user.id, name: user.name }));
    return {
      ...entity,
      siteName: site.name,
      clientName: site.clientName,
      agents,
    };
  }

  private async notifyAssignedAgents(intervention: InterventionView, kind: 'created' | 'updated' = 'created') {
    if (!intervention.agentIds?.length) {
      return;
    }
    const title =
      kind === 'created'
        ? 'Nouvelle intervention planifiée'
        : 'Intervention mise à jour';
    const message = `${intervention.siteName} • ${intervention.date} ${intervention.startTime} → ${intervention.endTime}`;
    await Promise.all(
      intervention.agentIds.map((agentId) =>
        this.notifications.send({
          title,
          message,
          audience: 'AGENT',
          targetId: agentId,
        }),
      ),
    );
  }

  private async findRecord(id: string) {
    const record = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true },
    });
    if (!record) {
      throw new NotFoundException('Intervention introuvable');
    }
    return record;
  }

  async list(filters: InterventionFilters = {}) {
    const where: Prisma.InterventionWhereInput = {};

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = this.toDateOnly(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = this.endOfDay(filters.endDate);
      }
    }
    if (filters.siteId) {
      where.siteId = filters.siteId;
    }
    if (filters.clientId) {
      where.site = { clientId: filters.clientId };
    }
    if (filters.type && filters.type !== 'all') {
      const normalizedType = this.normalizeTypeInput(filters.type);
      if (normalizedType) {
        where.type = normalizedType;
      }
    }
    if (filters.subType) {
      where.subType = filters.subType;
    }
    if (filters.agentId) {
      where.assignments = { some: { userId: filters.agentId } };
    }
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const [records, total] = await Promise.all([
      this.prisma.intervention.findMany({
        where,
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        include: { assignments: true, trucks: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.intervention.count({ where }),
    ]);
    return {
      items: records.map((record) => this.present(this.toEntity(record))),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, viewer: { id: string; role: string }) {
    const record = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true },
    });
    if (!record) {
      throw new NotFoundException('Intervention introuvable');
    }
    // Agents can only access their assigned interventions
    return this.present(this.toEntity(record));
  }

  async create(dto: CreateInterventionDto) {
    const normalizedType = this.normalizeTypeInput(dto.type);
    if (!normalizedType) {
      throw new BadRequestException("Type d'intervention invalide");
    }
    if (normalizedType === 'PUNCTUAL' && !dto.subType) {
      throw new BadRequestException('Le sous-type est obligatoire pour une intervention ponctuelle.');
    }
    const record = await this.prisma.intervention.create({
      data: {
        siteId: dto.siteId,
        date: this.toDateOnly(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: normalizedType,
        subType: dto.subType ?? null,
        label: dto.label ?? null,
        observation: dto.observation ?? null,
        generatedFromRuleId: dto.generatedFromRuleId ?? null,
        assignments: dto.agentIds?.length
          ? {
              create: dto.agentIds.map((userId) => ({ userId })),
            }
          : undefined,
        trucks: dto.truckLabels?.length
          ? {
              create: dto.truckLabels.map((label) => ({ label })),
            }
          : undefined,
      },
      include: { assignments: true, trucks: true },
    });
    const view = this.present(this.toEntity(record));
    this.realtime.broadcast('intervention.created', {
      id: view.id,
      siteId: view.siteId,
      date: view.date,
      startTime: view.startTime,
      endTime: view.endTime,
      type: view.type,
      status: view.status,
    });
    this.notifyAssignedAgents(view, 'created').catch((err) =>
      this.logger.warn(`Notification agents échouée: ${err.message}`),
    );
    return view;
  }

  async update(id: string, dto: UpdateInterventionDto) {
    await this.findRecord(id);
    const data: Prisma.InterventionUpdateInput = {};
    if (dto.siteId) data.site = { connect: { id: dto.siteId } };
    if (dto.date) data.date = this.toDateOnly(dto.date);
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.type) {
      const normalizedType = this.normalizeTypeInput(dto.type);
      if (normalizedType) {
        data.type = normalizedType;
      }
    }
    if (dto.subType !== undefined) data.subType = dto.subType ?? null;
    if (dto.label !== undefined) data.label = dto.label ?? null;
    if (dto.observation !== undefined) data.observation = dto.observation ?? null;
    if (dto.generatedFromRuleId !== undefined) {
      data.generatedFromRule = dto.generatedFromRuleId
        ? { connect: { id: dto.generatedFromRuleId } }
        : { disconnect: true };
    }
    if (dto.agentIds) {
      data.assignments = {
        deleteMany: {},
        create: dto.agentIds.map((userId) => ({ userId })),
      };
    }
    if (dto.truckLabels) {
      data.trucks = {
        deleteMany: {},
        create: dto.truckLabels.map((label) => ({ label })),
      };
    }

    const record = await this.prisma.intervention.update({
      where: { id },
      data,
      include: { assignments: true, trucks: true },
    });
    const finalType = dto.type ? this.normalizeTypeInput(dto.type) ?? record.type : record.type;
    const finalSubType = dto.subType ?? record.subType;
    if (finalType === 'PUNCTUAL' && !finalSubType) {
      throw new BadRequestException('Le sous-type est obligatoire pour une intervention ponctuelle.');
    }
    const view = this.present(this.toEntity(record));
    this.realtime.broadcast('intervention.updated', {
      id: view.id,
      siteId: view.siteId,
      date: view.date,
      startTime: view.startTime,
      endTime: view.endTime,
      type: view.type,
      status: view.status,
    });
    this.notifyAssignedAgents(view, 'updated').catch((err) =>
      this.logger.warn(`Notification agents échouée: ${err.message}`),
    );
    return view;
  }

  async duplicate(id: string, dto: DuplicateInterventionDto) {
    const record = await this.findRecord(id);
    const copy = await this.prisma.intervention.create({
      data: {
        siteId: record.siteId,
        date: this.toDateOnly(dto.date),
        startTime: record.startTime,
        endTime: record.endTime,
        type: record.type,
        subType: record.subType,
        label: record.label,
        observation: record.observation,
        assignments: record.assignments.length
          ? {
              create: record.assignments.map((assignment) => ({ userId: assignment.userId })),
            }
          : undefined,
        trucks: record.trucks.length
          ? {
              create: record.trucks.map((truck) => ({ label: truck.label })),
            }
          : undefined,
      },
      include: { assignments: true, trucks: true },
    });
    const view = this.present(this.toEntity(copy));
    this.notifyAssignedAgents(view, 'created').catch((err) =>
      this.logger.warn(`Notification agents échouée: ${err.message}`),
    );
    return view;
  }

  async cancel(id: string, observation: string) {
    if (!observation) {
      throw new BadRequestException("L'observation est requise pour annuler une intervention");
    }
    const record = await this.prisma.intervention.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        observation,
      },
      include: { assignments: true, trucks: true },
    });
    const view = this.present(this.toEntity(record));
    this.realtime.broadcast('intervention.status', {
      id: view.id,
      siteId: view.siteId,
      status: view.status,
      observation: view.observation,
    });
    return view;
  }

  async listRules(): Promise<InterventionRuleEntity[]> {
    const rules = await this.prisma.interventionRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((rule) => ({
      id: rule.id,
      siteId: rule.siteId,
      agentIds: rule.agentIds,
      label: rule.label,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));
  }

  async createRule(dto: CreateInterventionRuleDto) {
    const rule = await this.prisma.interventionRule.create({
      data: {
        siteId: dto.siteId,
        label: dto.label,
        startTime: dto.startTime,
        endTime: dto.endTime,
        daysOfWeek: dto.daysOfWeek,
        agentIds: dto.agentIds,
        active: dto.active ?? true,
      },
    });
    return {
      id: rule.id,
      siteId: rule.siteId,
      agentIds: rule.agentIds,
      label: rule.label,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  async updateRule(id: string, dto: UpdateInterventionRuleDto) {
    const data: Prisma.InterventionRuleUpdateInput = {};
    if (dto.siteId) data.site = { connect: { id: dto.siteId } };
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.daysOfWeek) data.daysOfWeek = dto.daysOfWeek;
    if (dto.agentIds) data.agentIds = dto.agentIds;
    if (dto.active !== undefined) data.active = dto.active;

    const rule = await this.prisma.interventionRule.update({
      where: { id },
      data,
    });
    return {
      id: rule.id,
      siteId: rule.siteId,
      agentIds: rule.agentIds,
      label: rule.label,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  async toggleRule(id: string, active: boolean) {
    const rule = await this.prisma.interventionRule.update({
      where: { id },
      data: { active },
    });
    return {
      id: rule.id,
      siteId: rule.siteId,
      agentIds: rule.agentIds,
      label: rule.label,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private async generateFromRules() {
    if (this.generatingRules) {
      return;
    }
    this.generatingRules = true;
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      const day = tomorrow.getUTCDay();
      const dateStart = this.toDateOnly(dateStr);
      const dateEnd = this.endOfDay(dateStr);
      const rules = await this.prisma.interventionRule.findMany({
        where: {
          active: true,
          daysOfWeek: { has: day },
        },
      });

      for (const rule of rules) {
        const existing = await this.prisma.intervention.findFirst({
          where: {
            generatedFromRuleId: rule.id,
            date: {
              gte: dateStart,
              lte: dateEnd,
            },
          },
        });
        if (existing) continue;
        const created = await this.prisma.intervention.create({
          data: {
            siteId: rule.siteId,
            date: dateStart,
            startTime: rule.startTime,
            endTime: rule.endTime,
            type: 'REGULAR',
            label: rule.label,
            generatedFromRuleId: rule.id,
            assignments: rule.agentIds.length
              ? {
                  create: rule.agentIds.map((userId) => ({ userId })),
                }
              : undefined,
          },
          include: { assignments: true, trucks: true },
        });
        const view = this.present(this.toEntity(created));
        this.notifyAssignedAgents(view, 'created').catch((err) =>
          this.logger.warn(`Notification agents échouée: ${err.message}`),
        );
      }
    } catch (error) {
      this.logger.error('Erreur lors de la génération programmée', error.stack);
    } finally {
      this.generatingRules = false;
    }
  }
}
