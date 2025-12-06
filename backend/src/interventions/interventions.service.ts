import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
import { ConfigService } from '@nestjs/config';

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
  agents: {
    id: string;
    name: string;
    attendanceId?: string;
    attendanceStatus?: string;
    arrivalTime?: string;
    checkInTime?: string;
    checkOutTime?: string;
  }[];
};

type InterventionRecord = Prisma.InterventionGetPayload<{
  include: { assignments: true; trucks: true; attendances: true };
}>;

type PersistedInterventionType = 'REGULAR' | 'PUNCTUAL';

@Injectable()
export class InterventionsService implements OnModuleInit {
  private readonly logger = new Logger(InterventionsService.name);
  private generatingRules = false;
  private AUTO_CLOSE_GRACE_MS = 30 * 60 * 1000; // 30 minutes de marge après l'heure de fin planifiée
  private AUTO_CLOSE_ENABLED = true;
  private AUTO_CLOSE_INCOMPLETE_STATUS: InterventionStatus = 'NEEDS_REVIEW';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
    private readonly usersService: UsersService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const graceMinutes = this.configService.get<number>('app.autoCloseGraceMinutes');
    const enabled = this.configService.get<boolean>('app.autoCloseEnabled');
    const incompleteStatus = (this.configService.get<string>('app.autoCloseIncompleteStatus') ??
      'NEEDS_REVIEW') as InterventionStatus;
    this.AUTO_CLOSE_GRACE_MS = (graceMinutes && graceMinutes > 0 ? graceMinutes : 30) * 60 * 1000;
    this.AUTO_CLOSE_ENABLED = enabled !== false;
    this.AUTO_CLOSE_INCOMPLETE_STATUS = incompleteStatus;

    await this.generateFromRules();
    setInterval(() => {
      this.generateFromRules().catch((error) =>
        this.logger.error('Erreur lors de la génération automatique des interventions', error.stack),
      );
    }, 1000 * 60 * 60 * 6);
    // Clôture automatique des interventions dépassées
    setInterval(() => {
      if (!this.AUTO_CLOSE_ENABLED) return;
      this.autoCloseExpired().catch((error) =>
        this.logger.error('Erreur lors de la clôture automatique des interventions', error.stack),
      );
    }, 5 * 60 * 1000); // toutes les 5 minutes
  }

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private endOfDay(value: string) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  private combine(dateStr: string, time: string) {
    return new Date(`${dateStr}T${time}:00`);
  }

  /**
   * Clôture les interventions dont l'heure de fin planifiée + marge est dépassée.
   * Si tous les agents affectés ont pointé (status COMPLETED + checkOut), on passe à COMPLETED,
   * sinon on passe à NEEDS_REVIEW.
   */
  private async autoCloseExpired() {
    const now = new Date();
    const dayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.intervention.findMany({
      where: {
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        date: { gte: dayBefore },
      },
      include: { assignments: true, attendances: true },
    });

    for (const intervention of candidates) {
      const end = this.combine(
        intervention.date.toISOString().slice(0, 10),
        intervention.endTime ?? '00:00',
      );
      if (now.getTime() <= end.getTime() + this.AUTO_CLOSE_GRACE_MS) continue;

      const assignedUserIds = intervention.assignments.map((a) => a.userId);
      if (assignedUserIds.length === 0) {
        await this.prisma.intervention.update({
          where: { id: intervention.id },
          data: { status: 'COMPLETED' },
        });
        continue;
      }
      const attForAgents = intervention.attendances.filter((att: any) =>
        assignedUserIds.includes(att.userId),
      );
      const completedUsers = new Set(
        attForAgents
          .filter((att) => att.status === 'COMPLETED' && att.checkOutTime != null)
          .map((att) => att.userId),
      );
      const allDone = assignedUserIds.every((uid) => completedUsers.has(uid));
      const targetStatus = allDone ? 'COMPLETED' : this.AUTO_CLOSE_INCOMPLETE_STATUS;

      await this.prisma.intervention.update({
        where: { id: intervention.id },
        data: { status: targetStatus as any },
      });

      if (!allDone && this.AUTO_CLOSE_INCOMPLETE_STATUS === 'NEEDS_REVIEW') {
        // Alerte les agents et superviseurs que l'intervention est à valider
        try {
          await Promise.all([
            ...assignedUserIds.map((agentId) =>
              this.notifications.send({
                audience: 'AGENT',
                targetId: agentId,
                title: 'Intervention à valider',
                message: `L'intervention ${intervention.label ?? intervention.siteId} est à valider (fin dépassée).`,
              }),
            ),
            this.notifications.send({
              audience: 'SITE_AGENTS',
              targetId: intervention.siteId,
              title: 'Intervention à valider',
              message: `Le créneau est dépassé pour ${intervention.label ?? intervention.siteId}. Merci de vérifier les pointages.`,
            }),
          ]);
        } catch (err) {
          this.logger.warn(`Notification auto-close échouée: ${(err as Error).message}`);
        }
      }
    }
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
      photos: Array.isArray((record as any).photos) ? (record as any).photos : [],
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

  private present(
    entity: InterventionEntity,
    attendances?: { id: string; userId: string; status: string; arrivalTime: Date | null; checkInTime: Date | null; checkOutTime: Date | null }[],
  ): InterventionView {
    const site = this.sitesService.findOne(entity.siteId);
    const attMap = new Map<string, any>();
    attendances?.forEach((att) => attMap.set(att.userId, att));
    const agents = entity.agentIds
      .map((id) => this.usersService.findOne(id))
      .filter((user): user is NonNullable<ReturnType<UsersService['findOne']>> => Boolean(user))
      .map((user) => {
        const att = attMap.get(user.id);
        return {
          id: user.id,
          name: user.name,
          attendanceId: att?.id,
          attendanceStatus: att?.status,
          arrivalTime: att?.arrivalTime ? att.arrivalTime.toISOString() : undefined,
          checkInTime: att?.checkInTime ? att.checkInTime.toISOString() : undefined,
          checkOutTime: att?.checkOutTime ? att.checkOutTime.toISOString() : undefined,
        };
      });
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
        include: { assignments: true, trucks: true, attendances: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.intervention.count({ where }),
    ]);
    return {
      items: records.map((record) => this.present(this.toEntity(record), record.attendances as any)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, viewer: { id: string; role: string }) {
    const record = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true, attendances: true },
    });
    if (!record) {
      throw new NotFoundException('Intervention introuvable');
    }
    // Agents can only access their assigned interventions
    return this.present(this.toEntity(record), (record as any).attendances);
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
        photos: dto.photos ?? [],
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
      } as any,
      include: { assignments: true, trucks: true, attendances: true },
    });

    // Pré-crée une ligne d'assiduité par agent assigné, avec horaires vides
    if (record.assignments?.length) {
      const plannedStart = this.combine(dto.date, dto.startTime);
      const plannedEnd = this.combine(dto.date, dto.endTime);
      await this.prisma.attendance.createMany({
        data: record.assignments.map((assignment) => ({
          userId: assignment.userId,
          interventionId: record.id,
          date: this.toDateOnly(dto.date),
          plannedStart,
          plannedEnd,
          status: 'PENDING',
          manual: false,
          createdBy: 'SYSTEM',
        })),
      });
    }

    const view = this.present(this.toEntity(record as any), (record as any).attendances);
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
    // Pré-calcul pour synchroniser attendances après mise à jour
    const original = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true, attendances: true },
    });
    if (!original) {
      throw new NotFoundException('Intervention introuvable');
    }

    if (dto.siteId) data.site = { connect: { id: dto.siteId } };
    if (dto.date) data.date = this.toDateOnly(dto.date);
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.status) data.status = dto.status;
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
    if (dto.photos !== undefined) {
      (data as any).photos = dto.photos ?? [];
    }

    const record = await this.prisma.intervention.update({
      where: { id },
      data,
      include: { assignments: true, trucks: true, attendances: true },
    });
    const finalType = dto.type ? this.normalizeTypeInput(dto.type) ?? record.type : record.type;
    const finalSubType = dto.subType ?? record.subType;
    if (finalType === 'PUNCTUAL' && !finalSubType) {
      throw new BadRequestException('Le sous-type est obligatoire pour une intervention ponctuelle.');
    }

    // Synchronise les attendances avec les agents assignés si agentIds fournis
    if (dto.agentIds) {
      const uniqueAgents = Array.from(new Set(dto.agentIds));
      const targetAgents = new Set(uniqueAgents);
      const currentAtt = await this.prisma.attendance.findMany({
        where: { interventionId: id },
        select: { id: true, userId: true },
      });
      const currentAgentIds = new Set(currentAtt.map((a) => a.userId));
      const toCreate = uniqueAgents.filter((u) => !currentAgentIds.has(u));
      const toDelete = currentAtt.filter((att) => !targetAgents.has(att.userId)).map((att) => att.id);

      if (toDelete.length) {
        await this.prisma.attendance.deleteMany({ where: { id: { in: toDelete } } });
      }
      if (toCreate.length) {
        const dateStr = dto.date ?? record.date.toISOString().slice(0, 10);
        const startTime = dto.startTime ?? record.startTime;
        const endTime = dto.endTime ?? record.endTime;
        const plannedStart = this.combine(dateStr, startTime);
        const plannedEnd = this.combine(dateStr, endTime);
        await this.prisma.attendance.createMany({
          data: toCreate.map((userId) => ({
            userId,
            interventionId: id,
            date: this.toDateOnly(dateStr),
            plannedStart,
            plannedEnd,
            status: 'PENDING',
            manual: false,
            createdBy: 'SYSTEM',
          })),
        });
      }
    }

    const refreshed = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true, attendances: true },
    });
    if (!refreshed) throw new NotFoundException('Intervention introuvable après mise à jour');
    const view = this.present(this.toEntity(refreshed), (refreshed as any).attendances);
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

  async updateStatus(id: string, status: InterventionStatus, viewer: { id: string; role: string }) {
    const record = await this.prisma.intervention.findUnique({
      where: { id },
      include: { assignments: true, trucks: true },
    });
    if (!record) {
      throw new NotFoundException('Intervention introuvable');
    }
    const allowedForAgent: InterventionStatus[] = ['IN_PROGRESS', 'NO_SHOW', 'NEEDS_REVIEW'];
    if (viewer.role === 'AGENT') {
      const assigned = record.assignments.some((a) => a.userId === viewer.id);
      if (!assigned) {
        throw new ForbiddenException('Accès refusé');
      }
      if (!allowedForAgent.includes(status)) {
        throw new BadRequestException('Statut non autorisé');
      }
    }
    if (viewer.role === 'AGENT' && status === 'COMPLETED') {
      throw new BadRequestException('Un agent ne peut pas terminer l’intervention globale. Seul son pointage est clôturé.');
    }
    if (status === 'COMPLETED' && !['SUPERVISOR', 'ADMIN'].includes(viewer.role)) {
      throw new ForbiddenException('Seuls le superviseur ou un admin peuvent valider une intervention');
    }
    if (status === 'COMPLETED' && viewer.role === 'AGENT') {
      const endDateTime = new Date(`${record.date.toISOString().slice(0, 10)}T${record.endTime || '23:59'}:00.000Z`);
      const now = new Date();
      const graceMs = 30 * 60 * 1000;
      if (now.getTime() < endDateTime.getTime() + graceMs) {
        throw new BadRequestException("L'intervention ne peut pas être terminée avant la fin planifiée + 30 minutes");
      }
    }
    const updated = await this.prisma.intervention.update({
      where: { id },
      data: { status },
      include: { assignments: true, trucks: true, attendances: true },
    });
    const view = this.present(this.toEntity(updated), (updated as any).attendances);
    this.realtime.broadcast('intervention.status', {
      id: view.id,
      siteId: view.siteId,
      status: view.status,
      observation: view.observation,
    });
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
      include: { assignments: true, trucks: true, attendances: true },
    });
    const view = this.present(this.toEntity(copy), (copy as any).attendances);
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
      include: { assignments: true, trucks: true, attendances: true },
    });
    const view = this.present(this.toEntity(record), (record as any).attendances);
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
          include: { assignments: true, trucks: true, attendances: true },
        });
        const view = this.present(this.toEntity(created), (created as any).attendances);
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
