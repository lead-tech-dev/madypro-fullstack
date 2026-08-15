import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  InterventionEntity,
  InterventionStatus,
  InterventionType,
  InterventionTemplateEntity,
} from './entities/intervention.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { DuplicateInterventionDto } from './dto/duplicate-intervention.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SitesService } from '../sites/sites.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { haversineDistanceMeters } from '../common/utils/geo';
import { checkAttendanceCompleteness } from './attendance-completeness.util';
import { computeTemplateOccurrences, findTemplateStopConflicts, TemplateStopLike } from './recurrence.util';
import { ApprovalsService } from '../approvals/approvals.service';

export type InterventionFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  type?: InterventionType | 'all';
  subType?: string;
  agentId?: string;
  status?: InterventionStatus | 'all';
  page?: number;
  pageSize?: number;
};

export type InterventionView = InterventionEntity & {
  siteName: string;
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
  private generatingTemplates = false;
  private AUTO_CLOSE_GRACE_MS = 30 * 60 * 1000; // 30 minutes de marge après l'heure de fin planifiée
  private AUTO_CLOSE_ENABLED = true;
  private AUTO_CLOSE_INCOMPLETE_STATUS: InterventionStatus = 'NEEDS_REVIEW';
  private UPCOMING_WINDOW_MS = 15 * 60 * 1000;
  private readonly upcomingNotified = new Set<string>(); // key: interventionId:userId
  private END_REMINDER_WINDOW_MS = 10 * 60 * 1000;
  private readonly endReminderNotified = new Set<string>(); // key: interventionId:userId
  private DAILY_SUMMARY_HOUR = 18; // heure locale
  private lastSummaryDay: string | null = null;
  private MISSED_CHECKIN_GRACE_MS = 15 * 60 * 1000;
  private readonly missedCheckInNotified = new Set<string>(); // key: interventionId:userId
  private readonly GENERATION_HORIZON_DAYS = 56; // 8 semaines

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
    private readonly usersService: UsersService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
  ) {}

  async onModuleInit() {
    const graceMinutes = this.configService.get<number>('app.autoCloseGraceMinutes');
    const enabled = this.configService.get<boolean>('app.autoCloseEnabled');
    const incompleteStatus = (this.configService.get<string>('app.autoCloseIncompleteStatus') ??
      'NEEDS_REVIEW') as InterventionStatus;
    this.AUTO_CLOSE_GRACE_MS = (graceMinutes && graceMinutes > 0 ? graceMinutes : 30) * 60 * 1000;
    this.AUTO_CLOSE_ENABLED = enabled !== false;
    this.AUTO_CLOSE_INCOMPLETE_STATUS = incompleteStatus;
    const upcomingMinutes = Number(process.env.UPCOMING_WINDOW_MINUTES ?? '15');
    if (Number.isFinite(upcomingMinutes) && upcomingMinutes > 0) {
      this.UPCOMING_WINDOW_MS = upcomingMinutes * 60 * 1000;
    }
    const endReminderMinutes = Number(process.env.END_REMINDER_MINUTES ?? '10');
    if (Number.isFinite(endReminderMinutes) && endReminderMinutes > 0) {
      this.END_REMINDER_WINDOW_MS = endReminderMinutes * 60 * 1000;
    }
    const dailyHour = Number(process.env.DAILY_SUMMARY_HOUR ?? '18');
    if (Number.isFinite(dailyHour) && dailyHour >= 0 && dailyHour < 24) {
      this.DAILY_SUMMARY_HOUR = dailyHour;
    }

    await this.generateFromTemplates();
    setInterval(() => {
      this.generateFromTemplates().catch((error) =>
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

    // Notifications "intervention imminente"
    setInterval(() => {
      this.notifyUpcomingStarts().catch((err) =>
        this.logger.warn('Erreur notification début imminent', err),
      );
    }, 2 * 60 * 1000);

    // Rappel de fin imminente
    setInterval(() => {
      this.notifyUpcomingEnds().catch((err) =>
        this.logger.warn('Erreur notification fin imminente', err),
      );
    }, 2 * 60 * 1000);

    // Alerte superviseur sur oubli de pointage
    setInterval(() => {
      this.notifyMissedCheckIns().catch((err) =>
        this.logger.warn('Erreur alerte oubli de pointage', err),
      );
    }, 5 * 60 * 1000);

    // Résumé quotidien admin/superviseur
    setInterval(() => {
      this.sendDailySummary().catch((err) =>
        this.logger.warn('Erreur envoi résumé quotidien', err),
      );
    }, 5 * 60 * 1000);
  }

  /**
   * Notifie les agents lorsque l'heure de début approche (dans la fenêtre UPCOMING_WINDOW_MS).
   * Une seule notification par agent/intervention.
   */
  private async notifyUpcomingStarts() {
    const now = new Date();
    const horizon = new Date(now.getTime() + this.UPCOMING_WINDOW_MS);
    const dayStart = this.toDateOnly(now.toISOString().slice(0, 10));
    const dayEnd = this.endOfDay(now.toISOString().slice(0, 10));

    const records = await this.prisma.intervention.findMany({
      where: {
        status: 'PLANNED',
        date: { gte: dayStart, lte: dayEnd },
      },
        include: { assignments: true, site: true },
    });

    this.logger.log(`[Push] Upcoming check: ${records.length} interventions candidates, window ${now.toISOString()} -> ${horizon.toISOString()}`);

    for (const record of records) {
      if (!record.startTime) continue;
      const startAt = this.combine(record.date.toISOString().slice(0, 10), record.startTime);
      if (startAt.getTime() < now.getTime() || startAt.getTime() > horizon.getTime()) {
        continue;
      }
      for (const assignment of record.assignments) {
        const key = `${record.id}:${assignment.userId}`;
        if (this.upcomingNotified.has(key)) continue;
        this.upcomingNotified.add(key);
        try {
          const tokens =
            (this as any).notifications?.['deviceTokens']?.get(assignment.userId)?.size ||
            (this as any).notifications?.['expoTokens']?.get(assignment.userId)?.size ||
            0;
          if (!tokens) {
            this.logger.warn(`[Push] Aucun token pour agent ${assignment.userId} (intervention ${record.id})`);
          }
          await this.notifications.send({
            title: 'Intervention à venir',
            message: `${(record as any).site?.name ?? 'Site'} · ${record.startTime}-${record.endTime}`,
            audience: 'AGENT',
            targetId: assignment.userId,
          });
        } catch (err) {
          this.logger.warn(`Notif début imminent échouée (${record.id} -> ${assignment.userId}): ${err?.message || err}`);
        }
      }
    }

    // nettoyage des clés anciennes pour éviter la croissance infinie
    const cutoff = now.getTime() - this.UPCOMING_WINDOW_MS * 2;
    for (const key of Array.from(this.upcomingNotified)) {
      const [itvId] = key.split(':');
      const rec = records.find((r) => r.id === itvId);
      const startAt = rec
        ? this.combine(rec.date.toISOString().slice(0, 10), rec.startTime ?? '00:00').getTime()
        : 0;
      if (startAt < cutoff) {
        this.upcomingNotified.delete(key);
      }
    }
  }

  private async notifyMissedCheckIns() {
    const now = new Date();
    const dayStart = this.toDateOnly(now.toISOString().slice(0, 10));
    const dayEnd = this.endOfDay(now.toISOString().slice(0, 10));

    const candidates = await this.prisma.intervention.findMany({
      where: { status: 'PLANNED', date: { gte: dayStart, lte: dayEnd } },
      include: {
        assignments: { include: { user: true } },
        attendances: true,
        site: { include: { supervisors: true } },
      },
    });

    for (const intervention of candidates) {
      if (!intervention.startTime) continue;
      const startAt = this.combine(intervention.date.toISOString().slice(0, 10), intervention.startTime);
      if (now.getTime() < startAt.getTime() + this.MISSED_CHECKIN_GRACE_MS) continue;

      const checkedInIds = new Set(
        intervention.attendances.filter((a) => a.checkInTime).map((a) => a.userId),
      );
      const missingAgents = intervention.assignments.filter((a) => !checkedInIds.has(a.userId));
      if (!missingAgents.length || !intervention.site.supervisors.length) continue;

      for (const assignment of missingAgents) {
        const key = `${intervention.id}:${assignment.userId}`;
        if (this.missedCheckInNotified.has(key)) continue;
        this.missedCheckInNotified.add(key);
        const agentName = `${assignment.user.firstName} ${assignment.user.lastName}`.trim();
        for (const supervisor of intervention.site.supervisors) {
          try {
            await this.notifications.send({
              title: 'Oubli de pointage probable',
              message: `${agentName} n'a pas pointé pour ${(intervention as any).site?.name ?? 'le site'} (prévu à ${intervention.startTime}).`,
              audience: 'AGENT',
              targetId: supervisor.userId,
            });
          } catch (err) {
            this.logger.warn(`Alerte oubli pointage échouée (${intervention.id} -> ${supervisor.userId}): ${err?.message || err}`);
          }
        }
      }
    }

    const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
    for (const key of Array.from(this.missedCheckInNotified)) {
      const [itvId] = key.split(':');
      const rec = candidates.find((r) => r.id === itvId);
      const startAt = rec ? this.combine(rec.date.toISOString().slice(0, 10), rec.startTime ?? '00:00').getTime() : 0;
      if (startAt < cutoff) {
        this.missedCheckInNotified.delete(key);
      }
    }
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
   * Vérifie qu'aucun des agents n'est déjà planifié sur une intervention qui
   * chevauche ce créneau, ni en absence validée à cette date.
   */
  private async checkAssignmentConflicts(
    agentIds: string[],
    dateStr: string,
    startTime: string,
    endTime: string,
    excludeInterventionId?: string,
  ) {
    if (!agentIds.length) return;

    const dayStart = this.toDateOnly(dateStr);
    const dayEnd = this.endOfDay(dateStr);
    const newStart = this.combine(dateStr, startTime);
    const newEnd = this.combine(dateStr, endTime);

    const sameDayInterventions = await this.prisma.intervention.findMany({
      where: {
        date: dayStart,
        ...(excludeInterventionId ? { id: { not: excludeInterventionId } } : {}),
        status: { notIn: ['CANCELLED'] },
        assignments: { some: { userId: { in: agentIds } } },
      },
      include: { assignments: true, site: true },
    });

    for (const other of sameDayInterventions) {
      const otherStart = this.combine(dateStr, other.startTime);
      const otherEnd = this.combine(dateStr, other.endTime);
      const overlaps = newStart < otherEnd && otherStart < newEnd;
      if (!overlaps) continue;
      const conflictingIds = new Set(other.assignments.map((a) => a.userId));
      const conflictingAgentIds = agentIds.filter((id) => conflictingIds.has(id));
      if (!conflictingAgentIds.length) continue;
      const agents = await this.prisma.user.findMany({ where: { id: { in: conflictingAgentIds } } });
      const names = agents.map((a) => `${a.firstName} ${a.lastName}`.trim()).join(', ');
      throw new BadRequestException(
        `Conflit d'affectation : ${names || 'un agent'} déjà planifié sur "${other.site?.name ?? other.siteId}" de ${other.startTime} à ${other.endTime} le ${dateStr}.`,
      );
    }

    const absences = await this.prisma.absence.findMany({
      where: {
        userId: { in: agentIds },
        status: 'APPROVED',
        from: { lte: dayEnd },
        to: { gte: dayStart },
      },
      include: { user: true },
    });
    if (absences.length) {
      const names = Array.from(new Set(absences.map((a) => `${a.user.firstName} ${a.user.lastName}`.trim()))).join(
        ', ',
      );
      throw new BadRequestException(`Conflit d'affectation : ${names} en absence validée le ${dateStr}.`);
    }
  }

  /**
   * Envoie un résumé quotidien aux admins/superviseurs : interventions en retard et à valider.
   */
  private async sendDailySummary() {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const localHour = now.getHours();
    if (localHour < this.DAILY_SUMMARY_HOUR) return;
    if (this.lastSummaryDay === dayKey) return; // déjà envoyé aujourd'hui

    const todayEnd = this.endOfDay(dayKey);
    const records = await this.prisma.intervention.findMany({
      where: {
        date: { lte: todayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW'] },
      },
      select: { id: true, date: true, endTime: true, status: true },
    });

    let lateCount = 0;
    let toValidateCount = 0;
    for (const r of records) {
      const dateStr = r.date.toISOString().slice(0, 10);
      const endAt = r.endTime ? this.combine(dateStr, r.endTime) : null;
      if (endAt && endAt.getTime() < now.getTime() && ['PLANNED', 'IN_PROGRESS'].includes(r.status)) {
        lateCount++;
      }
      if (['COMPLETED', 'NEEDS_REVIEW'].includes(r.status)) {
        toValidateCount++;
      }
    }

    const message = `En retard: ${lateCount} | À valider: ${toValidateCount}`;
    const admins = this.usersService.findAll({ role: 'ADMIN' }).items;
    const supervisors = this.usersService.findAll({ role: 'SUPERVISOR' }).items;
    const targets = [...admins, ...supervisors];
    if (!targets.length) {
      this.lastSummaryDay = dayKey;
      return;
    }

    for (const user of targets) {
      try {
        await this.notifications.send({
          audience: 'AGENT',
          targetId: user.id,
          title: 'Résumé quotidien',
          message,
        });
      } catch (err) {
        this.logger.warn(`Résumé quotidien non envoyé à ${user.id}: ${err?.message || err}`);
      }
    }

    this.lastSummaryDay = dayKey;
  }

  /**
   * Notifie les agents quand l'heure de fin planifiée approche (dans END_REMINDER_WINDOW_MS).
   */
  private async notifyUpcomingEnds() {
    const now = new Date();
    const horizon = new Date(now.getTime() + this.END_REMINDER_WINDOW_MS);
    const dayStart = this.toDateOnly(now.toISOString().slice(0, 10));
    const dayEnd = this.endOfDay(now.toISOString().slice(0, 10));

    const records: Prisma.InterventionGetPayload<{ include: { assignments: true; site: true } }>[] =
      await this.prisma.intervention.findMany({
      where: {
        status: 'IN_PROGRESS',
        date: { gte: dayStart, lte: dayEnd },
      },
      include: { assignments: true, site: true },
    });

    this.logger.log(
      `[Push] End reminder check: ${records.length} interventions candidates, window ${now.toISOString()} -> ${horizon.toISOString()}`,
    );

    for (const record of records) {
      if (!record.endTime) continue;
      const endAt = this.combine(record.date.toISOString().slice(0, 10), record.endTime);
      if (endAt.getTime() < now.getTime() || endAt.getTime() > horizon.getTime()) {
        continue;
      }
      for (const assignment of record.assignments) {
        const key = `${record.id}:${assignment.userId}`;
        if (this.endReminderNotified.has(key)) continue;
        this.endReminderNotified.add(key);
        try {
          await this.notifications.send({
            title: 'Fin d’intervention à venir',
            message: `${record.site?.name ?? 'Site'} · fin prévue à ${record.endTime}`,
            audience: 'AGENT',
            targetId: assignment.userId,
          });
        } catch (err) {
          this.logger.warn(
            `Notif fin imminente échouée (${record.id} -> ${assignment.userId}): ${err?.message || err}`,
          );
        }
      }
    }

    // nettoyage des clés anciennes pour éviter la croissance
    const cutoff = now.getTime() - this.END_REMINDER_WINDOW_MS * 2;
    for (const key of Array.from(this.endReminderNotified)) {
      const [itvId] = key.split(':');
      const rec = records.find((r) => r.id === itvId);
      const endAt = rec
        ? this.combine(rec.date.toISOString().slice(0, 10), rec.endTime ?? '00:00').getTime()
        : 0;
      if (endAt < cutoff) {
        this.endReminderNotified.delete(key);
      }
    }
  }

  private startDateTime(record: InterventionRecord) {
    const dateStr = record.date.toISOString().slice(0, 10);
    const start = record.startTime ?? '00:00';
    return new Date(`${dateStr}T${start}:00.000Z`);
  }

  /**
   * Fait passer en attente de validation les interventions dont l'heure de fin planifiée
   * + marge est dépassée. Ne clôture jamais automatiquement (COMPLETED) : la validation
   * finale revient toujours au superviseur, que les pointages soient complets ou non.
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

      // Ne clôture jamais automatiquement : même quand tous les agents ont fini, l'intervention
      // passe en attente de validation superviseur (jamais directement à COMPLETED).
      const assignedUserIds = intervention.assignments.map((a) => a.userId);
      const attForAgents = intervention.attendances.filter((att: any) =>
        assignedUserIds.includes(att.userId),
      );
      const { complete } = checkAttendanceCompleteness(assignedUserIds, attForAgents as any);

      await this.prisma.intervention.update({
        where: { id: intervention.id },
        data: { status: this.AUTO_CLOSE_INCOMPLETE_STATUS as any },
      });

      if (this.AUTO_CLOSE_INCOMPLETE_STATUS === 'NEEDS_REVIEW') {
        // Alerte les agents et superviseurs que l'intervention est à valider
        try {
          const message = complete
            ? `${intervention.label ?? intervention.siteId} est prête à être validée.`
            : `${intervention.label ?? intervention.siteId} : le créneau est dépassé et des pointages sont incomplets. Merci de vérifier avant validation.`;
          await Promise.all([
            ...assignedUserIds.map((agentId) =>
              this.notifications.send({
                audience: 'AGENT',
                targetId: agentId,
                title: 'Intervention à valider',
                message,
              }),
            ),
            this.notifications.send({
              audience: 'SITE_AGENTS',
              targetId: intervention.siteId,
              title: 'Intervention à valider',
              message,
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
      categoryId: (record as any).categoryId ?? undefined,
      label: record.label ?? undefined,
      agentIds: record.assignments.map((assignment) => assignment.userId),
      truckLabels: record.trucks.map((truck) => truck.label),
      observation: record.observation ?? undefined,
      photos: Array.isArray((record as any).photos) ? (record as any).photos : [],
      status,
      billable: (record as any).billable ?? true,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      generatedFromTemplateId: (record as any).generatedFromTemplateId ?? undefined,
      batchId: (record as any).batchId ?? undefined,
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

  /**
   * Envoie UNE notification par agent concerné, résumant tout un lot d'interventions créées
   * en même temps (règle récurrente ou tournée) — évite qu'un lot de N occurrences déclenche N
   * notifications individuelles pour le même agent.
   */
  private async sendConsolidatedNotification(views: InterventionView[]) {
    if (!views.length) return;
    const byAgent = new Map<string, InterventionView[]>();
    for (const view of views) {
      for (const agentId of view.agentIds ?? []) {
        if (!byAgent.has(agentId)) byAgent.set(agentId, []);
        byAgent.get(agentId)!.push(view);
      }
    }
    await Promise.all(
      Array.from(byAgent.entries()).map(([agentId, agentViews]) => {
        const sorted = [...agentViews].sort((a, b) => a.date.localeCompare(b.date));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const period = first.date === last.date ? first.date : `${first.date} → ${last.date}`;
        const preview = sorted
          .slice(0, 5)
          .map((v) => `${v.siteName} (${v.date})`)
          .join(', ');
        const more = sorted.length > 5 ? ` et ${sorted.length - 5} autre(s)` : '';
        return this.notifications.send({
          title: `${sorted.length} intervention(s) planifiée(s)`,
          message: `Du ${period} : ${preview}${more}`,
          audience: 'AGENT',
          targetId: agentId,
        });
      }),
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

  async create(dto: CreateInterventionDto, actorId = 'system', options?: { silent?: boolean }) {
    const normalizedType = this.normalizeTypeInput(dto.type);
    if (!normalizedType) {
      throw new BadRequestException("Type d'intervention invalide");
    }
    if (normalizedType === 'PUNCTUAL' && !dto.subType) {
      throw new BadRequestException('Le sous-type est obligatoire pour une intervention ponctuelle.');
    }
    if (dto.agentIds?.length) {
      await this.checkAssignmentConflicts(dto.agentIds, dto.date, dto.startTime, dto.endTime);
    }
    const record = await this.prisma.intervention.create({
      data: {
        siteId: dto.siteId,
        date: this.toDateOnly(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: normalizedType,
        subType: dto.subType ?? null,
        categoryId: dto.categoryId ?? null,
        label: dto.label ?? null,
        observation: dto.observation ?? null,
        photos: dto.photos ?? [],
        generatedFromTemplateId: dto.generatedFromTemplateId ?? null,
        batchId: dto.batchId ?? null,
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

    // Copie la checklist de la catégorie (site + catégorie) comme point de départ de cette intervention
    if (dto.categoryId) {
      const siteCategory = await this.prisma.siteCategory.findUnique({
        where: { siteId_categoryId: { siteId: dto.siteId, categoryId: dto.categoryId } },
        include: { checklist: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
      });
      if (siteCategory?.checklist.length) {
        await this.prisma.interventionChecklistItem.createMany({
          data: siteCategory.checklist.map((item, index) => ({
            interventionId: record.id,
            label: item.label,
            order: index,
          })),
        });
      }
    }

    const view = this.present(this.toEntity(record as any), (record as any).attendances);
    this.auditService.record({
      actorId,
      action: 'CREATE_INTERVENTION',
      entityType: 'intervention',
      entityId: view.id,
      details: `${view.siteName} le ${view.date} ${view.startTime}-${view.endTime}`,
    });
    this.realtime.broadcast('intervention.created', {
      id: view.id,
      siteId: view.siteId,
      date: view.date,
      startTime: view.startTime,
      endTime: view.endTime,
      type: view.type,
      status: view.status,
    });
    if (!options?.silent) {
      this.notifyAssignedAgents(view, 'created').catch((err) =>
        this.logger.warn(`Notification agents échouée: ${err.message}`),
      );
    }
    return view;
  }

  /**
   * Refuse la clôture (COMPLETED) tant qu'un agent assigné n'a pas terminé son pointage.
   * Source de vérité unique, réutilisée par toutes les voies d'écriture du statut
   * (PATCH générique, PATCH /status) pour éviter que l'une contourne la règle que l'autre applique.
   */
  private assertAllAgentsCompletedAttendance(
    assignments: { userId: string }[],
    attendances: { userId: string; arrivalTime?: Date | null; checkInTime?: Date | null; checkOutTime?: Date | null; status?: string }[],
  ) {
    const assignedIds = assignments.map((a) => a.userId);
    const result = checkAttendanceCompleteness(assignedIds, attendances);
    if (!result.complete) {
      const names = (ids: string[]) => ids.map((id) => this.usersService.findOne(id)?.name ?? id).join(', ');
      const parts: string[] = [];
      if (result.missingStart.length) parts.push(`Heures manquantes (début) : ${names(result.missingStart)}`);
      if (result.missingEnd.length) parts.push(`Heures manquantes (fin) : ${names(result.missingEnd)}`);
      if (result.pending.length) parts.push(`Agents encore en cours : ${names(result.pending)}`);
      throw new BadRequestException(`Validation impossible : ${parts.join(' | ') || 'données incomplètes'}`);
    }
  }

  async update(id: string, dto: UpdateInterventionDto, actorId = 'system', viewerRole?: string) {
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

    if (dto.agentIds || dto.date || dto.startTime || dto.endTime) {
      const resolvedAgentIds = dto.agentIds ?? original.assignments.map((a) => a.userId);
      const resolvedDate = dto.date ?? original.date.toISOString().slice(0, 10);
      const resolvedStart = dto.startTime ?? original.startTime;
      const resolvedEnd = dto.endTime ?? original.endTime;
      if (resolvedAgentIds.length) {
        await this.checkAssignmentConflicts(resolvedAgentIds, resolvedDate, resolvedStart, resolvedEnd, id);
      }
    }

    if (dto.siteId) data.site = { connect: { id: dto.siteId } };
    if (dto.date) data.date = this.toDateOnly(dto.date);
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.status) {
      if (dto.status === 'COMPLETED') {
        if (viewerRole !== 'SUPERVISOR') {
          throw new ForbiddenException('Seul le superviseur peut valider une intervention');
        }
        this.assertAllAgentsCompletedAttendance(original.assignments, (original as any).attendances ?? []);
      }
      data.status = dto.status;
    }
    if (dto.type) {
      const normalizedType = this.normalizeTypeInput(dto.type);
      if (normalizedType) {
        data.type = normalizedType;
      }
    }
    if (dto.subType !== undefined) data.subType = dto.subType ?? null;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }
    if (dto.label !== undefined) data.label = dto.label ?? null;
    if (dto.observation !== undefined) data.observation = dto.observation ?? null;
    if (dto.billable !== undefined) data.billable = dto.billable;
    if (dto.generatedFromTemplateId !== undefined) {
      data.generatedFromTemplate = dto.generatedFromTemplateId
        ? { connect: { id: dto.generatedFromTemplateId } }
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
    this.auditService.record({
      actorId,
      action: 'UPDATE_INTERVENTION',
      entityType: 'intervention',
      entityId: view.id,
      details: Object.keys(data).join(', ') || undefined,
    });
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
      include: { assignments: true, trucks: true, attendances: true },
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
    if (status === 'COMPLETED' && viewer.role !== 'SUPERVISOR') {
      throw new ForbiddenException('Seul le superviseur peut valider une intervention');
    }
    if (status === 'COMPLETED' && viewer.role === 'AGENT') {
      const endDateTime = new Date(`${record.date.toISOString().slice(0, 10)}T${record.endTime || '23:59'}:00.000Z`);
      const now = new Date();
      const graceMs = 30 * 60 * 1000;
      if (now.getTime() < endDateTime.getTime() + graceMs) {
        throw new BadRequestException("L'intervention ne peut pas être terminée avant la fin planifiée + 30 minutes");
      }
    }
    if (status === 'COMPLETED') {
      this.assertAllAgentsCompletedAttendance(record.assignments, (record as any).attendances ?? []);
    }

    const updated = await this.prisma.intervention.update({
      where: { id },
      data: { status },
      include: { assignments: true, trucks: true, attendances: true },
    });
    const view = this.present(this.toEntity(updated), (updated as any).attendances);
    this.auditService.record({
      actorId: viewer.id,
      action: 'UPDATE_INTERVENTION_STATUS',
      entityType: 'intervention',
      entityId: view.id,
      details: status,
    });
    this.realtime.broadcast('intervention.status', {
      id: view.id,
      siteId: view.siteId,
      status: view.status,
      observation: view.observation,
    });
    return view;
  }

  async duplicate(id: string, dto: DuplicateInterventionDto, actorId = 'system') {
    const record = await this.findRecord(id);
    const agentIds = record.assignments.map((a) => a.userId);
    if (agentIds.length) {
      await this.checkAssignmentConflicts(agentIds, dto.date, record.startTime, record.endTime);
    }
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
    this.auditService.record({
      actorId,
      action: 'DUPLICATE_INTERVENTION',
      entityType: 'intervention',
      entityId: view.id,
      details: `Depuis ${id}, vers le ${dto.date}`,
    });
    this.notifyAssignedAgents(view, 'created').catch((err) =>
      this.logger.warn(`Notification agents échouée: ${err.message}`),
    );
    return view;
  }

  async cancel(id: string, observation: string, actorId = 'system') {
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
    this.auditService.record({
      actorId,
      action: 'CANCEL_INTERVENTION',
      entityType: 'intervention',
      entityId: view.id,
      details: observation,
    });
    this.realtime.broadcast('intervention.status', {
      id: view.id,
      siteId: view.siteId,
      status: view.status,
      observation: view.observation,
    });
    return view;
  }

  private presentTemplate(template: {
    id: string;
    label: string;
    siteId: string;
    startDate: Date;
    endDate: Date | null;
    autoGenerate: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    stops: { id: string; daysOfWeek: number[]; intervalWeeks: number; categoryId: string | null; startTime: string; endTime: string; agentIds: string[]; order: number }[];
  }): InterventionTemplateEntity {
    return {
      id: template.id,
      label: template.label,
      siteId: template.siteId,
      startDate: template.startDate,
      endDate: template.endDate,
      autoGenerate: template.autoGenerate,
      active: template.active,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      stops: template.stops
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          daysOfWeek: s.daysOfWeek,
          intervalWeeks: s.intervalWeeks,
          categoryId: s.categoryId,
          startTime: s.startTime,
          endTime: s.endTime,
          agentIds: s.agentIds,
          order: s.order,
        })),
    };
  }

  /** Un agent ne peut pas être sur deux arrêts dont les jours se recoupent avec des horaires qui se chevauchent. */
  private assertNoTemplateStopConflicts(stops: TemplateStopLike[]) {
    const conflicts = findTemplateStopConflicts(stops);
    if (conflicts.length) {
      const { a, b, agentId } = conflicts[0];
      const agent = this.usersService.findOne(agentId);
      throw new BadRequestException(
        `Conflit dans le gabarit : ${agent?.name ?? agentId} est affecté à deux arrêts qui se chevauchent (${a.startTime}–${a.endTime} et ${b.startTime}–${b.endTime}).`,
      );
    }
  }

  async listTemplates(): Promise<InterventionTemplateEntity[]> {
    const templates = await this.prisma.interventionTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { stops: true },
    });
    return templates.map((template) => this.presentTemplate(template));
  }

  async createTemplate(dto: CreateTemplateDto) {
    const existing = await this.prisma.interventionTemplate.findUnique({ where: { siteId: dto.siteId } });
    if (existing) {
      throw new BadRequestException('Un gabarit existe déjà pour ce site');
    }
    this.assertNoTemplateStopConflicts(
      dto.stops.map((s, index) => ({
        id: `new-${index}`,
        daysOfWeek: s.daysOfWeek,
        intervalWeeks: s.intervalWeeks ?? 1,
        startTime: s.startTime,
        endTime: s.endTime,
        agentIds: s.agentIds ?? [],
      })),
    );
    const template = await this.prisma.interventionTemplate.create({
      data: {
        label: dto.label,
        siteId: dto.siteId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        autoGenerate: dto.autoGenerate ?? false,
        active: dto.active ?? true,
        stops: {
          create: dto.stops.map((s, index) => ({
            daysOfWeek: s.daysOfWeek,
            intervalWeeks: s.intervalWeeks ?? 1,
            categoryId: s.categoryId ?? null,
            startTime: s.startTime,
            endTime: s.endTime,
            agentIds: s.agentIds ?? [],
            order: s.order ?? index,
          })),
        },
      },
      include: { stops: true },
    });
    return this.presentTemplate(template);
  }

  private describeTemplateStop(siteName: string, stop: { startTime: string; endTime: string }): string {
    return `${siteName} — ${stop.startTime}-${stop.endTime}`;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, actorId: string) {
    const existing = await this.prisma.interventionTemplate.findUnique({
      where: { id },
      include: { stops: true, site: { select: { name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Gabarit introuvable');
    }
    if (dto.siteId !== undefined && dto.siteId !== existing.siteId) {
      const conflict = await this.prisma.interventionTemplate.findUnique({ where: { siteId: dto.siteId } });
      if (conflict) {
        throw new BadRequestException('Un gabarit existe déjà pour ce site');
      }
    }
    if (dto.stops) {
      this.assertNoTemplateStopConflicts(
        dto.stops.map((s, index) => ({
          id: s.id ?? `new-${index}`,
          daysOfWeek: s.daysOfWeek,
          intervalWeeks: s.intervalWeeks ?? 1,
          startTime: s.startTime,
          endTime: s.endTime,
          agentIds: s.agentIds ?? [],
        })),
      );
    }

    const data: Prisma.InterventionTemplateUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.siteId !== undefined) data.site = { connect: { id: dto.siteId } };
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.autoGenerate !== undefined) data.autoGenerate = dto.autoGenerate;
    if (dto.active !== undefined) data.active = dto.active;

    const siteName = existing.site.name;

    const template = await this.prisma.$transaction(async (tx) => {
      if (dto.stops) {
        const existingStopById = new Map(existing.stops.map((s) => [s.id, s]));
        const incomingIds = new Set(dto.stops.filter((s) => s.id).map((s) => s.id as string));

        for (const oldStop of existing.stops) {
          if (!incomingIds.has(oldStop.id)) {
            await tx.templateStop.delete({ where: { id: oldStop.id } });
            this.auditService.record({
              actorId,
              action: 'DELETE_TEMPLATE_STOP',
              entityType: 'TemplateStop',
              entityId: oldStop.id,
              before: {
                daysOfWeek: oldStop.daysOfWeek,
                startTime: oldStop.startTime,
                endTime: oldStop.endTime,
                categoryId: oldStop.categoryId,
                agentIds: oldStop.agentIds,
              },
              details: this.describeTemplateStop(siteName, oldStop),
            });
          }
        }

        for (const [index, s] of dto.stops.entries()) {
          const stopData = {
            daysOfWeek: s.daysOfWeek,
            intervalWeeks: s.intervalWeeks ?? 1,
            categoryId: s.categoryId ?? null,
            startTime: s.startTime,
            endTime: s.endTime,
            agentIds: s.agentIds ?? [],
            order: s.order ?? index,
          };
          const oldStop = s.id ? existingStopById.get(s.id) : undefined;
          if (s.id && oldStop) {
            await tx.templateStop.update({ where: { id: s.id }, data: stopData });
            const oldAgents = new Set(oldStop.agentIds);
            const newAgents = new Set(stopData.agentIds);
            const agentsChanged =
              oldAgents.size !== newAgents.size || [...oldAgents].some((agentId) => !newAgents.has(agentId));
            if (agentsChanged) {
              this.auditService.record({
                actorId,
                action: 'UPDATE_TEMPLATE_STOP_AGENTS',
                entityType: 'TemplateStop',
                entityId: s.id,
                before: { agentIds: oldStop.agentIds },
                after: { agentIds: stopData.agentIds },
                details: this.describeTemplateStop(siteName, stopData),
              });
            }
          } else {
            const created = await tx.templateStop.create({ data: { ...stopData, templateId: id } });
            this.auditService.record({
              actorId,
              action: 'CREATE_TEMPLATE_STOP',
              entityType: 'TemplateStop',
              entityId: created.id,
              after: {
                daysOfWeek: stopData.daysOfWeek,
                startTime: stopData.startTime,
                endTime: stopData.endTime,
                categoryId: stopData.categoryId,
                agentIds: stopData.agentIds,
              },
              details: this.describeTemplateStop(siteName, stopData),
            });
          }
        }
      }
      return tx.interventionTemplate.update({
        where: { id },
        data,
        include: { stops: true },
      });
    });
    return this.presentTemplate(template);
  }

  async toggleTemplate(id: string, active: boolean) {
    const template = await this.prisma.interventionTemplate.update({
      where: { id },
      data: { active },
      include: { stops: true },
    });
    return this.presentTemplate(template);
  }

  /** Calcule (sans rien créer) les occurrences d'un gabarit sur une période, pour aperçu admin. */
  async previewTemplateOccurrences(templateId: string, startDate: string, endDate: string) {
    const template = await this.prisma.interventionTemplate.findUnique({
      where: { id: templateId },
      include: { stops: true },
    });
    if (!template) {
      throw new NotFoundException('Gabarit introuvable');
    }
    const stops: TemplateStopLike[] = template.stops.map((s) => ({
      id: s.id,
      daysOfWeek: s.daysOfWeek,
      intervalWeeks: s.intervalWeeks,
      categoryId: s.categoryId,
      startTime: s.startTime,
      endTime: s.endTime,
      agentIds: s.agentIds,
    }));
    const occurrences = computeTemplateOccurrences(
      { siteId: template.siteId, startDate: template.startDate, endDate: template.endDate },
      stops,
      this.toDateOnly(startDate),
      this.toDateOnly(endDate),
    );
    const siteIds = Array.from(new Set(occurrences.map((o) => o.siteId)));
    const sites = siteIds.length
      ? await this.prisma.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, name: true } })
      : [];
    const siteNameById = new Map(sites.map((s) => [s.id, s.name]));
    return {
      templateId: template.id,
      templateLabel: template.label,
      occurrences: occurrences.map((o) => ({ ...o, siteName: siteNameById.get(o.siteId) ?? o.siteId })),
    };
  }

  /**
   * Propose (sans jamais créer directement) les occurrences des 8 prochaines semaines pour
   * chaque gabarit actif dont la génération automatique est activée — single ou multi-site. Une
   * ApprovalRequest CREATE_TEMPLATE_BATCH par gabarit, à valider par un admin.
   */
  private async generateFromTemplates() {
    if (this.generatingTemplates) {
      return;
    }
    this.generatingTemplates = true;
    try {
      const horizonStart = this.toDateOnly(new Date().toISOString().slice(0, 10));
      const horizonEnd = new Date(horizonStart.getTime() + this.GENERATION_HORIZON_DAYS * 24 * 60 * 60 * 1000);
      const templates = await this.prisma.interventionTemplate.findMany({
        where: { active: true, autoGenerate: true },
        include: { stops: true },
      });

      for (const template of templates) {
        const stops: TemplateStopLike[] = template.stops.map((s) => ({
          id: s.id,
          daysOfWeek: s.daysOfWeek,
          intervalWeeks: s.intervalWeeks,
          startTime: s.startTime,
          endTime: s.endTime,
          agentIds: s.agentIds,
        }));
        const occurrences = computeTemplateOccurrences(
          { siteId: template.siteId, startDate: template.startDate, endDate: template.endDate },
          stops,
          horizonStart,
          horizonEnd,
        );
        if (!occurrences.length) continue;

        const [existingInterventions, existingBatches] = await Promise.all([
          this.prisma.intervention.findMany({
            where: { generatedFromTemplateId: template.id, date: { gte: horizonStart, lte: horizonEnd } },
            select: { date: true, siteId: true },
          }),
          this.prisma.approvalRequest.findMany({
            where: {
              entityType: 'InterventionTemplate',
              entityId: template.id,
              actionType: 'CREATE_TEMPLATE_BATCH',
              status: { in: ['PENDING', 'APPROVED'] },
            },
            select: { payload: true },
          }),
        ]);

        const covered = new Set<string>(
          existingInterventions.map((i) => `${i.date.toISOString().slice(0, 10)}:${i.siteId}`),
        );
        existingBatches.forEach((batch) => {
          const occ = (batch.payload as any)?.occurrences as { date: string; siteId: string }[] | undefined;
          occ?.forEach((o) => covered.add(`${o.date}:${o.siteId}`));
        });

        const newOccurrences = occurrences.filter((o) => !covered.has(`${o.date}:${o.siteId}`));
        if (!newOccurrences.length) continue;

        await this.approvals.createRequest({
          actionType: 'CREATE_TEMPLATE_BATCH',
          entityType: 'InterventionTemplate',
          entityId: template.id,
          payload: {
            templateId: template.id,
            templateLabel: template.label,
            occurrences: newOccurrences.map((o) => ({
              date: o.date,
              siteId: o.siteId,
              categoryId: o.categoryId,
              startTime: o.startTime,
              endTime: o.endTime,
              agentIds: o.agentIds,
            })),
          },
          requestedById: null,
          summary: `${newOccurrences.length} occurrence(s) — ${template.label}`,
        });
      }
    } catch (error) {
      this.logger.error('Erreur lors de la génération programmée', error.stack);
    } finally {
      this.generatingTemplates = false;
    }
  }

  /**
   * Applique un lot d'occurrences (généré à la demande, ou approuvé par un admin) : pré-valide
   * les conflits d'affectation, crée toutes les interventions en mode silencieux (une par
   * arrêt/date), taguées du même batchId, puis envoie une notification consolidée par agent
   * concerné.
   */
  async createTemplateBatch(
    payload: {
      templateId: string;
      templateLabel?: string;
      occurrences: { date: string; siteId: string; categoryId?: string | null; startTime: string; endTime: string; agentIds: string[] }[];
    },
    actorId: string,
  ) {
    for (const occurrence of payload.occurrences) {
      if (occurrence.agentIds?.length) {
        await this.checkAssignmentConflicts(occurrence.agentIds, occurrence.date, occurrence.startTime, occurrence.endTime);
      }
    }
    const batchId = randomUUID();
    const created: InterventionView[] = [];
    for (const occurrence of payload.occurrences) {
      const view = await this.create(
        {
          type: 'REGULAR',
          siteId: occurrence.siteId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          label: payload.templateLabel,
          agentIds: occurrence.agentIds,
          categoryId: occurrence.categoryId ?? undefined,
          generatedFromTemplateId: payload.templateId,
          batchId,
        } as CreateInterventionDto,
        actorId,
        { silent: true },
      );
      created.push(view);
    }
    try {
      await this.sendConsolidatedNotification(created);
    } catch (err) {
      this.logger.warn(`Notification de lot échouée: ${(err as Error).message}`);
    }
    return created;
  }

  /**
   * Création ponctuelle (un ou plusieurs arrêts, une seule fois, sans gabarit persisté). Un seul
   * arrêt se comporte exactement comme `create()` (notification individuelle normale) ; plusieurs
   * arrêts déclenchent la même sémantique de lot que `createTemplateBatch` (batchId partagé,
   * notification consolidée par agent).
   */
  async createOneshotBatch(
    occurrences: {
      siteId: string;
      date: string;
      startTime: string;
      endTime: string;
      agentIds: string[];
      label?: string;
      categoryId?: string;
    }[],
    actorId: string,
  ) {
    for (const occurrence of occurrences) {
      if (occurrence.agentIds?.length) {
        await this.checkAssignmentConflicts(occurrence.agentIds, occurrence.date, occurrence.startTime, occurrence.endTime);
      }
    }
    if (occurrences.length === 1) {
      const [occurrence] = occurrences;
      return this.create(
        {
          type: 'REGULAR',
          siteId: occurrence.siteId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          label: occurrence.label,
          agentIds: occurrence.agentIds,
          categoryId: occurrence.categoryId,
        } as CreateInterventionDto,
        actorId,
      );
    }
    const batchId = randomUUID();
    const created: InterventionView[] = [];
    for (const occurrence of occurrences) {
      const view = await this.create(
        {
          type: 'REGULAR',
          siteId: occurrence.siteId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          label: occurrence.label,
          agentIds: occurrence.agentIds,
          categoryId: occurrence.categoryId,
          batchId,
        } as CreateInterventionDto,
        actorId,
        { silent: true },
      );
      created.push(view);
    }
    try {
      await this.sendConsolidatedNotification(created);
    } catch (err) {
      this.logger.warn(`Notification de lot échouée: ${(err as Error).message}`);
    }
    return created;
  }

  async listChecklist(interventionId: string) {
    await this.findRecord(interventionId);
    return this.prisma.interventionChecklistItem.findMany({
      where: { interventionId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async toggleChecklistItem(interventionId: string, itemId: string, done: boolean, actorId: string) {
    await this.findRecord(interventionId);
    const existing = await this.prisma.interventionChecklistItem.findFirst({
      where: { id: itemId, interventionId },
    });
    if (!existing) {
      throw new NotFoundException('Élément de checklist introuvable');
    }
    const item = await this.prisma.interventionChecklistItem.update({
      where: { id: itemId },
      data: {
        done,
        completedAt: done ? new Date() : null,
        completedBy: done ? actorId : null,
      },
    });
    this.realtime.broadcast('intervention.checklist', {
      interventionId,
      itemId: item.id,
      done: item.done,
    });
    return item;
  }

  async setClientSignature(id: string, signature: string, actorId = 'system') {
    await this.findRecord(id);
    const updated = await this.prisma.intervention.update({
      where: { id },
      data: { clientSignature: signature },
    });
    this.auditService.record({
      actorId,
      action: 'UPDATE_INTERVENTION',
      entityType: 'intervention',
      entityId: id,
      details: 'Signature client enregistrée',
    });
    return { id: updated.id, clientSignature: updated.clientSignature };
  }

  /**
   * Payload minimal pensé pour un widget d'écran d'accueil natif (à construire
   * séparément côté iOS/Android — non réalisable dans cet environnement, aucun
   * outil de build natif ni device disponible). Retourne la mission en cours ou
   * la prochaine mission du jour pour l'agent.
   */
  async getNextInterventionForUser(userId: string) {
    const now = new Date();
    const dayStart = this.toDateOnly(now.toISOString().slice(0, 10));
    const dayEnd = this.endOfDay(now.toISOString().slice(0, 10));

    const interventions = await this.prisma.intervention.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        assignments: { some: { userId } },
      },
      include: { site: { select: { name: true } }, attendances: { where: { userId } } },
      orderBy: { startTime: 'asc' },
    });

    const inProgress = interventions.find((i) => i.status === 'IN_PROGRESS');
    const target = inProgress ?? interventions.find((i) => i.status === 'PLANNED');
    if (!target) {
      return { hasNext: false };
    }
    return {
      hasNext: true,
      interventionId: target.id,
      siteName: target.site.name,
      startTime: target.startTime,
      endTime: target.endTime,
      status: target.status,
    };
  }

  async getAssignmentSuggestions(id: string) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
      include: { site: true, assignments: true },
    });
    if (!intervention) {
      throw new NotFoundException('Intervention introuvable');
    }
    if (intervention.site.latitude == null || intervention.site.longitude == null) {
      return { interventionId: id, candidates: [] };
    }
    const assignedIds = new Set(intervention.assignments.map((a) => a.userId));
    const dateStr = intervention.date.toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const start = new Date(`${dateStr}T${intervention.startTime}:00`);
    const end = new Date(`${dateStr}T${intervention.endTime}:00`);

    const agents = await this.prisma.user.findMany({ where: { role: 'AGENT', active: true } });
    const [sameDayInterventions, sameDayAbsences, recentAttendance] = await Promise.all([
      this.prisma.intervention.findMany({
        where: { date: dayStart, id: { not: id }, status: { notIn: ['CANCELLED'] } },
        include: { assignments: true },
      }),
      this.prisma.absence.findMany({
        where: { status: 'APPROVED', from: { lte: dayEnd }, to: { gte: dayStart } },
      }),
      this.prisma.attendance.findMany({
        where: { userId: { in: agents.map((a) => a.id) }, lastSeenLatitude: { not: null } },
        orderBy: { lastSeenAt: 'desc' },
        distinct: ['userId'],
      }),
    ]);

    const busyIds = new Set<string>();
    sameDayAbsences.forEach((a) => busyIds.add(a.userId));
    sameDayInterventions.forEach((other) => {
      const otherStart = new Date(`${dateStr}T${other.startTime}:00`);
      const otherEnd = new Date(`${dateStr}T${other.endTime}:00`);
      if (start < otherEnd && otherStart < end) {
        other.assignments.forEach((a) => busyIds.add(a.userId));
      }
    });

    const lastKnown = new Map(recentAttendance.map((a) => [a.userId, a]));

    const candidates = agents
      .filter((agent) => !assignedIds.has(agent.id) && !busyIds.has(agent.id))
      .map((agent) => {
        const attendance = lastKnown.get(agent.id);
        const distanceMeters =
          attendance?.lastSeenLatitude != null && attendance?.lastSeenLongitude != null
            ? haversineDistanceMeters(
                { latitude: attendance.lastSeenLatitude, longitude: attendance.lastSeenLongitude },
                { latitude: intervention.site.latitude!, longitude: intervention.site.longitude! },
              )
            : null;
        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`.trim(),
          distanceMeters,
        };
      })
      .sort((a, b) => {
        if (a.distanceMeters == null) return 1;
        if (b.distanceMeters == null) return -1;
        return a.distanceMeters - b.distanceMeters;
      });

    return { interventionId: id, candidates };
  }

  /**
   * Roster d'un site dérivé des gabarits actifs (aucune donnée dédiée) : pour chaque jour de la
   * semaine, les agents dont un arrêt de gabarit couvre ce site ce jour-là. Le titulaire/
   * remplaçant se lit dans le nombre de jours couverts par chaque agent, pas dans un champ dédié.
   */
  async getSiteRoster(siteId: string) {
    const stops = await this.prisma.templateStop.findMany({
      where: { template: { siteId, active: true } },
      include: { template: { select: { id: true, label: true } } },
    });
    const agentIds = Array.from(new Set(stops.flatMap((s) => s.agentIds)));
    const agents = agentIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const agentNameById = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));

    const byDay: Record<
      number,
      { agentId: string; agentName: string; templateId: string; templateLabel: string; startTime: string; endTime: string }[]
    > = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const stop of stops) {
      for (const day of stop.daysOfWeek) {
        for (const agentId of stop.agentIds) {
          byDay[day].push({
            agentId,
            agentName: agentNameById.get(agentId) ?? agentId,
            templateId: stop.template.id,
            templateLabel: stop.template.label,
            startTime: stop.startTime,
            endTime: stop.endTime,
          });
        }
      }
    }
    return byDay;
  }

  async getRouteOptimization(userId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const interventions = await this.prisma.intervention.findMany({
      where: {
        date: dayStart,
        status: { notIn: ['CANCELLED'] },
        assignments: { some: { userId } },
      },
      include: { site: true },
    });
    const withCoords = interventions.filter((i) => i.site.latitude != null && i.site.longitude != null);
    if (withCoords.length <= 1) {
      return {
        userId,
        date,
        stops: withCoords.map((i) => ({ interventionId: i.id, siteName: i.site.name, startTime: i.startTime })),
        totalDistanceMeters: 0,
      };
    }

    // Heuristique du plus proche voisin à partir de l'intervention la plus tôt planifiée
    const remaining = [...withCoords].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const route = [remaining.shift()!];
    let totalDistance = 0;
    while (remaining.length) {
      const current = route[route.length - 1];
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      remaining.forEach((candidate, index) => {
        const distance = haversineDistanceMeters(
          { latitude: current.site.latitude!, longitude: current.site.longitude! },
          { latitude: candidate.site.latitude!, longitude: candidate.site.longitude! },
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      totalDistance += nearestDistance;
      route.push(remaining.splice(nearestIndex, 1)[0]);
    }

    return {
      userId,
      date,
      stops: route.map((i) => ({ interventionId: i.id, siteName: i.site.name, startTime: i.startTime })),
      totalDistanceMeters: Math.round(totalDistance),
    };
  }

  async estimateDuration(siteId: string, type?: string) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        intervention: { siteId, ...(type ? { type: type as any } : {}) },
        checkInTime: { not: null },
        checkOutTime: { not: null },
      },
      select: { checkInTime: true, checkOutTime: true },
      take: 200,
      orderBy: { checkOutTime: 'desc' },
    });
    if (!attendances.length) {
      return { siteId, type: type ?? null, sampleSize: 0, estimatedMinutes: null };
    }
    const durations = attendances.map(
      (a) => (a.checkOutTime!.getTime() - a.checkInTime!.getTime()) / 60000,
    );
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return { siteId, type: type ?? null, sampleSize: durations.length, estimatedMinutes: Math.round(avg) };
  }
}
