import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AttendanceEntity, AttendanceStatus } from './entities/attendance.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { CreateManualAttendanceDto } from './dto/create-manual.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CancelAttendanceDto } from './dto/cancel-attendance.dto';
import { AuditService } from '../audit/audit.service';
import { MarkArrivalDto } from './dto/mark-arrival.dto';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

type AttendanceFilters = {
  startDate?: string;
  endDate?: string;
  userId?: string;
  siteId?: string;
  clientId?: string;
  status?: AttendanceStatus | 'all';
  page?: number;
  pageSize?: number;
};

type AttendanceView = {
  id: string;
  date: string;
  agent: { id: string; name: string };
  site: { id: string; name: string; clientName: string };
  clientId: string;
  checkInTime?: string;
  checkOutTime?: string;
  plannedStart?: string;
  plannedEnd?: string;
  durationMinutes?: number;
  status: AttendanceStatus;
  manual: boolean;
  createdBy: string;
  note?: string;
  gps: {
    checkIn?: { latitude: number; longitude: number; distanceMeters?: number };
    checkOut?: { latitude: number; longitude: number; distanceMeters?: number };
  };
};

type AttendanceRecord = Prisma.AttendanceGetPayload<{
  include: { site: false };
}>;

@Injectable()
export class AttendanceService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly MAX_DISTANCE_METERS = 100;
  private readonly OUTSIDE_GRACE_MS = 5 * 60 * 1000;
  private readonly TZ_OFFSET_MINUTES = Number.isFinite(Number(process.env.TIMEZONE_OFFSET_MINUTES))
    ? Number(process.env.TIMEZONE_OFFSET_MINUTES)
    : 120; // default Europe/Paris (UTC+1/+2)

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly sitesService: SitesService,
    private readonly auditService: AuditService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.checkOutsideAgents().catch((err) => console.warn('Drift monitor error', err));
    }, 20 * 60 * 1000);
  }

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private endOfDay(value: string) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  private toEntity(record: AttendanceRecord): AttendanceEntity {
    const r: any = record as any;
    return {
      id: record.id,
      userId: record.userId,
      siteId: record.siteId,
      clientId: record.clientId,
      arrivalTime: r.arrivalTime ?? undefined,
      arrivalLocation:
        r.arrivalLatitude != null && r.arrivalLongitude != null
          ? { latitude: r.arrivalLatitude, longitude: r.arrivalLongitude }
          : undefined,
      plannedStart: record.plannedStart ?? undefined,
      plannedEnd: record.plannedEnd ?? undefined,
      checkIn: record.checkInTime ?? undefined,
      checkOut: record.checkOutTime ?? undefined,
      checkInLocation:
        record.checkInLatitude != null && record.checkInLongitude != null
          ? { latitude: record.checkInLatitude, longitude: record.checkInLongitude }
          : undefined,
      checkOutLocation:
        record.checkOutLatitude != null && record.checkOutLongitude != null
          ? { latitude: record.checkOutLatitude, longitude: record.checkOutLongitude }
          : undefined,
      status: record.status,
      note: record.note ?? undefined,
      manual: record.manual,
      createdBy: record.createdBy as 'AGENT' | 'SUPERVISOR' | 'ADMIN',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastSeenAt: r.lastSeenAt ?? undefined,
      lastSeenLocation:
        r.lastSeenLatitude != null && r.lastSeenLongitude != null
          ? { latitude: r.lastSeenLatitude, longitude: r.lastSeenLongitude }
          : undefined,
      outsideSince: r.outsideSince ?? undefined,
    };
  }

  private async getRecord(id: string) {
    const record = await this.prisma.attendance.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('Pointage introuvable');
    }
    return record;
  }

  private toView(record: AttendanceEntity): AttendanceView {
    const user = this.usersService.findOne(record.userId);
    const site = this.sitesService.findOne(record.siteId);
    const durationMinutes =
      record.checkIn && record.checkOut
        ? Math.max(0, Math.round((record.checkOut.getTime() - record.checkIn.getTime()) / 60000))
        : undefined;

    return {
      id: record.id,
      date: this.formatDate(record.checkIn ?? record.plannedStart ?? record.createdAt),
      agent: { id: user?.id ?? record.userId, name: user?.name ?? 'Agent inconnu' },
      site: { id: site.id, name: site.name, clientName: site.clientName },
      clientId: site.clientId,
      checkInTime: this.formatTime(record.checkIn),
      checkOutTime: this.formatTime(record.checkOut),
      plannedStart: this.formatTime(record.plannedStart),
      plannedEnd: this.formatTime(record.plannedEnd),
      durationMinutes,
      status: record.status,
      manual: record.manual,
      createdBy: record.createdBy,
      note: record.note,
      gps: {
        checkIn: record.checkInLocation
          ? {
              ...record.checkInLocation,
              distanceMeters: this.computeDistance(record.checkInLocation, site),
            }
          : undefined,
        checkOut: record.checkOutLocation
          ? {
              ...record.checkOutLocation,
              distanceMeters: this.computeDistance(record.checkOutLocation, site),
            }
          : undefined,
      },
    };
  }

  async list(filters: AttendanceFilters = {}) {
    const where: Prisma.AttendanceWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = this.toDateOnly(filters.startDate);
      if (filters.endDate) where.date.lte = this.endOfDay(filters.endDate);
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { user: true, site: { include: { client: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return {
      items: records.map((record) => this.toView(this.toEntity(record as any))),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const record = await this.getRecord(id);
    return this.toView(this.toEntity(record));
  }

  async createManual(dto: CreateManualAttendanceDto) {
    const site = this.sitesService.findOne(dto.siteId);
    const date = this.toDateOnly(dto.date);
    const endOfDay = this.endOfDay(dto.date);
    const checkIn = this.combine(dto.date, dto.checkInTime);
    const checkOut = dto.checkOutTime ? this.combine(dto.date, dto.checkOutTime) : null;
    const status: AttendanceStatus = checkOut ? 'COMPLETED' : 'PENDING';
    const createdBy = dto.createdByUserId ?? dto.createdBy ?? 'SUPERVISOR';

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: dto.userId,
        siteId: dto.siteId,
        date: { gte: date, lte: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data: any = {
      userId: dto.userId,
      siteId: dto.siteId,
      clientId: site.clientId,
      date,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      plannedStart: checkIn,
      plannedEnd: checkOut ?? checkIn,
      status,
      manual: true,
      createdBy,
      note: dto.note,
    };

    const record = existing
      ? await this.prisma.attendance.update({ where: { id: existing.id }, data })
      : await this.prisma.attendance.create({ data });

    await this.updateInterventionStatus(dto.userId, dto.siteId, date, status);
    this.auditService.record({
      actorId: createdBy,
      action: 'CREATE_MANUAL_ATTENDANCE',
      entityType: 'attendance',
      entityId: record.id,
      details: `${dto.userId} ${dto.date}`,
    });
    return this.toView(this.toEntity(record));
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    const current = this.toEntity(await this.getRecord(id));
    const data: Prisma.AttendanceUpdateInput = {};
    if (dto.checkInTime) {
      const base = current.checkIn ?? current.plannedStart ?? current.createdAt;
      data.checkInTime = this.combine(this.formatDate(base), dto.checkInTime);
    }
    if (dto.checkOutTime) {
      const base = current.checkOut ?? current.checkIn ?? current.plannedEnd ?? current.createdAt;
      data.checkOutTime = this.combine(this.formatDate(base), dto.checkOutTime);
    }
    if (dto.note !== undefined) {
      data.note = dto.note;
    }
    if (dto.status) {
      data.status = dto.status;
    }

    const record = await this.prisma.attendance.update({
      where: { id },
      data,
    });
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_ATTENDANCE',
      entityType: 'attendance',
      entityId: id,
      details: 'Modification horaires',
    });
    return this.toView(this.toEntity(record));
  }

  async cancel(id: string, dto: CancelAttendanceDto) {
    const current = this.toEntity(await this.getRecord(id));
    const note = dto.reason
      ? current.note
        ? `${current.note}\nAnnulation: ${dto.reason}`
        : `Annulation: ${dto.reason}`
      : current.note;
    const record = await this.prisma.attendance.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        note,
      },
    });
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'CANCEL_ATTENDANCE',
      entityType: 'attendance',
      entityId: id,
      details: dto.reason,
    });
    return this.toView(this.toEntity(record));
  }

  async checkIn(dto: CheckInDto) {
    const site = this.sitesService.findOne(dto.siteId);
    const now = new Date();
    const intervention = await this.ensureWithinInterventionWindow(dto.userId, dto.siteId, now, {
      allowBeforeStart: true,
    });
    if (site.latitude == null || site.longitude == null) {
      throw new BadRequestException("Les coordonnées du site sont manquantes.");
    }
    const distance = this.computeDistance(
      { latitude: dto.latitude, longitude: dto.longitude },
      { ...site, latitude: site.latitude, longitude: site.longitude },
    );
    if (distance != null && distance > this.MAX_DISTANCE_METERS) {
      throw new BadRequestException("Vous êtes trop loin du site pour démarrer l'intervention.");
    }
    if (intervention) {
      await this.prisma.intervention.update({
        where: { id: intervention.id },
        data: { status: 'IN_PROGRESS' },
      });
    }
    const record = await this.prisma.attendance.create({
      data: {
        userId: dto.userId,
        siteId: dto.siteId,
        clientId: site.clientId,
        date: this.toDateOnly(now.toISOString().slice(0, 10)),
        checkInTime: now,
        checkInLatitude: dto.latitude,
        checkInLongitude: dto.longitude,
        status: 'PENDING',
        manual: false,
        createdBy: 'AGENT',
      },
    });
    const view = this.toView(this.toEntity(record));
    this.realtime.broadcast('attendance.checkin', {
      attendanceId: view.id,
      userId: dto.userId,
      siteId: dto.siteId,
      status: view.status,
      checkInTime: view.checkInTime,
      date: view.date,
    });
    return view;
  }

  async checkOut(dto: CheckOutDto) {
    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: dto.userId,
        checkOutTime: null,
        status: { in: ['PENDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!existing) {
      throw new NotFoundException('Aucun check-in en cours');
    }
    const record = await this.prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: new Date(),
        status: 'COMPLETED',
      },
    });
    await this.updateInterventionStatus(existing.userId, existing.siteId, existing.date, 'COMPLETED');
    const view = this.toView(this.toEntity(record));
    this.realtime.broadcast('attendance.checkout', {
      attendanceId: view.id,
      userId: existing.userId,
      siteId: existing.siteId,
      status: view.status,
      checkOutTime: view.checkOutTime,
      date: view.date,
    });
    return view;
  }

  async markArrival(dto: MarkArrivalDto) {
    const site = this.sitesService.findOne(dto.siteId);
    const now = new Date();
    const intervention = await this.ensureWithinInterventionWindow(dto.userId, dto.siteId, now, {
      allowBeforeStart: true,
    });
    if (site.latitude == null || site.longitude == null) {
      throw new BadRequestException("Les coordonnées du site sont manquantes.");
    }
    const distance = this.computeDistance(
      { latitude: dto.latitude, longitude: dto.longitude },
      { ...site, latitude: site.latitude, longitude: site.longitude },
    );
    if (distance != null && distance > this.MAX_DISTANCE_METERS) {
      throw new BadRequestException("Vous êtes trop loin du site pour enregistrer votre présence.");
    }

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: dto.userId,
        siteId: dto.siteId,
        date: {
          gte: this.toDateOnly(now.toISOString().slice(0, 10)),
          lte: this.endOfDay(now.toISOString().slice(0, 10)),
        },
      },
    });

    const record = existing
      ? await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            arrivalTime: now,
            arrivalLatitude: dto.latitude,
            arrivalLongitude: dto.longitude,
          } as any,
        })
      : await this.prisma.attendance.create({
          data: {
            userId: dto.userId,
            siteId: dto.siteId,
            clientId: site.clientId,
            date: this.toDateOnly(now.toISOString().slice(0, 10)),
            arrivalTime: now,
            arrivalLatitude: dto.latitude,
            arrivalLongitude: dto.longitude,
            status: 'PENDING',
            manual: false,
            createdBy: 'AGENT',
          } as any,
        });

    if (intervention) {
      await this.prisma.intervention.update({
        where: { id: intervention.id },
        data: {
          observation: intervention.observation ?? 'Arrivée enregistrée',
          status: 'IN_PROGRESS',
        },
      });
    }

    const view = this.toView(this.toEntity(record));
    this.realtime.broadcast('attendance.arrival', {
      attendanceId: view.id,
      userId: dto.userId,
      siteId: dto.siteId,
      arrivalTime: view.plannedStart ?? view.checkInTime ?? view.date,
      status: view.status,
    });
    return view;
  }

  async heartbeat(dto: HeartbeatDto) {
    const site = this.sitesService.findOne(dto.siteId);
    if (!site) {
      throw new BadRequestException('Site introuvable');
    }
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let record: any = await this.prisma.attendance.findFirst({
      where: {
        userId: dto.userId,
        siteId: dto.siteId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING'] },
      },
    });

    if (!record) {
      record = await this.prisma.attendance.create({
        data: {
          userId: dto.userId,
          siteId: dto.siteId,
          clientId: site.clientId,
          date: startOfDay,
          status: 'PENDING',
          manual: false,
          createdBy: 'AGENT',
          lastSeenAt: new Date(),
          lastSeenLatitude: dto.latitude,
          lastSeenLongitude: dto.longitude,
        } as any,
      });
    } else {
      const distance = this.computeDistance(
        { latitude: dto.latitude, longitude: dto.longitude },
        { ...site, latitude: site.latitude!, longitude: site.longitude! },
      );
      const outside = distance != null && distance > this.MAX_DISTANCE_METERS;
      const outsideSince = outside ? record.outsideSince ?? new Date() : null;

      if (outside && !record.outsideSince) {
        this.notifications.send({
          audience: 'AGENT',
          targetId: dto.userId,
          title: 'Position hors site',
          message: "Vous n'êtes plus sur le site. L'intervention sera marquée terminée dans 5 minutes.",
        } as any);
      }

      record = (await this.prisma.attendance.update({
        where: { id: record.id },
        data: {
          lastSeenAt: new Date(),
          lastSeenLatitude: dto.latitude,
          lastSeenLongitude: dto.longitude,
          outsideSince,
        } as any,
      })) as any;
    }

    return this.toView(this.toEntity(record));
  }

  private async checkOutsideAgents() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.OUTSIDE_GRACE_MS);
    const drifted = (await this.prisma.attendance.findMany({
      where: {
        status: 'PENDING',
      },
    })) as any[];

    await Promise.all(
      drifted.map(async (att) => {
        if (!att.outsideSince || att.outsideSince > cutoff) {
          return;
        }
        await this.prisma.attendance.update({
          where: { id: att.id },
          data: {
            checkOutTime: now,
            status: 'COMPLETED',
            outsideSince: null,
          } as any,
        });
        await this.updateInterventionStatus(att.userId, att.siteId, att.date, 'COMPLETED');
        this.notifications.send({
          audience: 'AGENT',
          targetId: att.userId,
          title: 'Intervention clôturée',
          message: "Vous avez quitté le site, l'intervention a été clôturée automatiquement.",
        } as any);
      }),
    );
  }

  private async updateInterventionStatus(userId: string, siteId: string, date: Date, status: AttendanceStatus) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const intervention = await this.prisma.intervention.findFirst({
      where: {
        siteId,
        date: { gte: startOfDay, lte: endOfDay },
        assignments: { some: { userId } },
        status: { notIn: ['CANCELLED'] },
      },
      include: { assignments: true },
    });
    if (!intervention) return;

    if (status === 'COMPLETED') {
      const assignedUserIds = intervention.assignments.map((a) => a.userId);
      if (assignedUserIds.length === 0) {
        await this.prisma.intervention.update({
          where: { id: intervention.id },
          data: { status: 'COMPLETED' },
        });
        return;
      }
      const pending = await this.prisma.attendance.findMany({
        where: {
          siteId,
          userId: { in: assignedUserIds },
          date: { gte: startOfDay, lte: endOfDay },
          checkOutTime: null,
          status: { in: ['PENDING'] },
        },
      });
      const allDone = pending.length === 0;
      await this.prisma.intervention.update({
        where: { id: intervention.id },
        data: { status: allDone ? 'COMPLETED' : 'IN_PROGRESS' },
      });
      return;
    }

    await this.prisma.intervention.update({
      where: { id: intervention.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  private async ensureWithinInterventionWindow(
    userId: string,
    siteId: string,
    now: Date,
    options: { allowBeforeStart?: boolean } = {},
  ) {
    // Utilise l'heure locale (France) pour éviter les décalages UTC
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const interventions = await this.prisma.intervention.findMany({
      where: {
        siteId,
        date: { gte: startOfDay, lte: endOfDay },
        assignments: { some: { userId } },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { startTime: 'asc' },
    });

    if (!interventions.length) {
      this.logger.warn(
        `ensureWithinInterventionWindow: aucune intervention (site=${siteId}, user=${userId}, date=${now.toISOString().slice(0,10)})`,
      );
    }

    if (!interventions.length) {
      throw new BadRequestException("Aucune intervention planifiée pour ce site aujourd'hui.");
    }

    // Cherche l'intervention dont le créneau (avec tolérance) encadre l'heure courante
    type WindowedIntervention = {
      intervention: (typeof interventions)[number];
      windowStart: Date;
      windowEnd: Date;
      plannedStart: Date;
      plannedEnd: Date;
    };

    const withWindows: WindowedIntervention[] = interventions.map((intervention) => {
      const dateStr =
        intervention.date instanceof Date
          ? intervention.date.toISOString().slice(0, 10)
          : new Date(intervention.date as any).toISOString().slice(0, 10);
      const plannedStart = this.combineFromParts(dateStr, intervention.startTime, this.TZ_OFFSET_MINUTES);
      const plannedEnd = this.combineFromParts(dateStr, intervention.endTime, this.TZ_OFFSET_MINUTES);
      const windowStart = new Date(
        plannedStart.getTime() - (options.allowBeforeStart ? 30 * 60 * 1000 : 0),
      );
      const windowEnd = new Date(plannedEnd.getTime() + 60 * 60 * 1000); // 1h de grâce après la fin
      return { intervention, windowStart, windowEnd, plannedStart, plannedEnd };
    });

    const selected = withWindows.find((item) => now >= item.windowStart && now <= item.windowEnd);

    if (selected) {
      return selected.intervention;
    }

    const earliest = withWindows[0];
    const latest = withWindows[withWindows.length - 1];

    if (now < earliest.windowStart) {
      throw new BadRequestException(
        "L'intervention n'a pas encore commencé (en dehors du créneau).",
      );
    }
    if (now > latest.windowEnd) {
      throw new BadRequestException("Le créneau de l'intervention est dépassé.");
    }

    throw new BadRequestException("Aucune intervention en cours pour ce créneau.");
  }

  private combineFromParts(dateStr: string, time: string, offsetMinutes = 0) {
    const [hours, minutes] = time.split(':').map((v) => parseInt(v, 10) || 0);
    const localDate = new Date(
      `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
    );
    // If schedules are expressed in a local timezone (e.g., Europe/Paris), shift them back to UTC for comparisons
    return new Date(localDate.getTime() - offsetMinutes * 60 * 1000);
  }

  private combine(date: string, time: string) {
    return new Date(`${date}T${time}`);
  }

  private formatDate(date?: Date) {
    if (!date) return '';
    return date.toISOString().slice(0, 10);
  }

  private formatTime(date?: Date) {
    if (!date) return undefined;
    return date.toISOString().slice(11, 16);
  }

  private computeDistance(coords: { latitude: number; longitude: number }, site: ReturnType<SitesService['findOne']>) {
    if (!site.latitude || !site.longitude) return undefined;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(coords.latitude - site.latitude);
    const dLon = toRad(coords.longitude - site.longitude);
    const lat1 = toRad(site.latitude);
    const lat2 = toRad(coords.latitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
