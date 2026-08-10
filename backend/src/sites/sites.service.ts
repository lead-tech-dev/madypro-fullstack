import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Site } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SiteEntity } from './entities/site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

type SiteView = SiteEntity & {
  supervisors: { id: string; name: string }[];
};

type SiteFilters = {
  page?: number;
  pageSize?: number;
};

@Injectable()
export class SitesService implements OnModuleInit {
  private sites: SiteEntity[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.syncFromDatabase();
  }

  private async syncFromDatabase() {
    const records = await this.prisma.site.findMany({
      include: { supervisors: true },
      orderBy: { name: 'asc' },
    });
    this.sites = records.map((record) => this.mapRecord(record));
  }

  private mapRecord(record: Site & { supervisors: { userId: string }[] }): SiteEntity {
    return {
      id: record.id,
      name: record.name,
      address: record.address,
      latitude: record.latitude ?? undefined,
      longitude: record.longitude ?? undefined,
      timeWindow: record.timeWindow ?? undefined,
      active: record.active,
      supervisorIds: record.supervisors.map((item) => item.userId),
      accessInstructions: (record as any).accessInstructions ?? undefined,
      accessCode: (record as any).accessCode ?? undefined,
      contactName: (record as any).contactName ?? undefined,
      contactPhone: (record as any).contactPhone ?? undefined,
      photos: (record as any).photos ?? [],
      gpsDistanceMeters: (record as any).gpsDistanceMeters ?? undefined,
      toleranceMinutes: (record as any).toleranceMinutes ?? undefined,
      minimumDurationMinutes: (record as any).minimumDurationMinutes ?? undefined,
    };
  }

  private ensureExists(id: string) {
    const site = this.sites.find((item) => item.id === id);
    if (!site) {
      throw new NotFoundException('Site introuvable');
    }
    return site;
  }

  private present(site: SiteEntity): SiteView {
    const supervisors = site.supervisorIds
      .map((identifier) => this.usersService.findOne(identifier))
      .filter((user): user is NonNullable<ReturnType<UsersService['findOne']>> => Boolean(user))
      .map((user) => ({ id: user.id, name: user.name }));
    return {
      ...site,
      supervisors,
    };
  }

  findAll(filters: SiteFilters = { page: 1, pageSize: 20 }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const total = this.sites.length;
    const start = (page - 1) * pageSize;
    const items = this.sites.slice(start, start + pageSize).map((site) => this.present(site));
    return { items, total, page, pageSize };
  }

  findOne(id: string): SiteView {
    const site = this.ensureExists(id);
    return this.present(site);
  }

  async create(dto: CreateSiteDto, actorId = 'system'): Promise<SiteView> {
    const record = await this.prisma.site.create({
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        timeWindow: dto.timeWindow ?? null,
        active: dto.active ?? true,
        accessInstructions: dto.accessInstructions ?? null,
        accessCode: dto.accessCode ?? null,
        contactName: dto.contactName ?? null,
        contactPhone: dto.contactPhone ?? null,
        photos: dto.photos ?? [],
        gpsDistanceMeters: dto.gpsDistanceMeters ?? null,
        toleranceMinutes: dto.toleranceMinutes ?? null,
        minimumDurationMinutes: dto.minimumDurationMinutes ?? null,
        supervisors: dto.supervisorIds?.length
          ? {
              create: dto.supervisorIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: { supervisors: true },
    });
    const site = this.mapRecord(record);
    this.sites.push(site);
    this.auditService.record({
      actorId,
      action: 'CREATE_SITE',
      entityType: 'site',
      entityId: site.id,
      details: site.name,
    });
    return this.present(site);
  }

  async update(id: string, dto: UpdateSiteDto, actorId = 'system'): Promise<SiteView> {
    this.ensureExists(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.timeWindow !== undefined) data.timeWindow = dto.timeWindow;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.accessInstructions !== undefined) data.accessInstructions = dto.accessInstructions;
    if (dto.accessCode !== undefined) data.accessCode = dto.accessCode;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.photos !== undefined) data.photos = dto.photos;
    if (dto.gpsDistanceMeters !== undefined) data.gpsDistanceMeters = dto.gpsDistanceMeters;
    if (dto.toleranceMinutes !== undefined) data.toleranceMinutes = dto.toleranceMinutes;
    if (dto.minimumDurationMinutes !== undefined) data.minimumDurationMinutes = dto.minimumDurationMinutes;
    if (dto.supervisorIds !== undefined) {
      data.supervisors = {
        deleteMany: {},
        create: dto.supervisorIds.map((userId) => ({ userId })),
      };
    }

    const record = await this.prisma.site.update({
      where: { id },
      data,
      include: { supervisors: true },
    });
    const site = this.mapRecord(record);
    const index = this.sites.findIndex((item) => item.id === id);
    this.sites[index] = site;
    this.auditService.record({
      actorId,
      action: 'UPDATE_SITE',
      entityType: 'site',
      entityId: site.id,
      details: Object.keys(data).join(', ') || undefined,
    });
    return this.present(site);
  }

  async remove(id: string, actorId = 'system'): Promise<SiteView> {
    this.ensureExists(id);
    const record = await this.prisma.site.update({
      where: { id },
      data: { active: false },
      include: { supervisors: true },
    });
    const site = this.mapRecord(record);
    const index = this.sites.findIndex((item) => item.id === id);
    this.sites[index] = site;
    this.auditService.record({
      actorId,
      action: 'DELETE_SITE',
      entityType: 'site',
      entityId: site.id,
      details: site.name,
    });
    return this.present(site);
  }

  async listChecklist(siteId: string) {
    this.ensureExists(siteId);
    return this.prisma.siteChecklistItem.findMany({
      where: { siteId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createChecklistItem(siteId: string, dto: CreateChecklistItemDto, actorId = 'system') {
    const site = this.ensureExists(siteId);
    const item = await this.prisma.siteChecklistItem.create({
      data: {
        siteId,
        label: dto.label,
        order: dto.order ?? 0,
      },
    });
    this.auditService.record({
      actorId,
      action: 'UPDATE_SITE',
      entityType: 'site',
      entityId: siteId,
      details: `Checklist +${dto.label}`,
    });
    return item;
  }

  async updateChecklistItem(siteId: string, itemId: string, dto: UpdateChecklistItemDto, actorId = 'system') {
    this.ensureExists(siteId);
    const existing = await this.prisma.siteChecklistItem.findFirst({ where: { id: itemId, siteId } });
    if (!existing) {
      throw new NotFoundException('Élément de checklist introuvable');
    }
    const item = await this.prisma.siteChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
    this.auditService.record({
      actorId,
      action: 'UPDATE_SITE',
      entityType: 'site',
      entityId: siteId,
      details: `Checklist modifiée: ${item.label}`,
    });
    return item;
  }

  async removeChecklistItem(siteId: string, itemId: string, actorId = 'system') {
    this.ensureExists(siteId);
    const existing = await this.prisma.siteChecklistItem.findFirst({ where: { id: itemId, siteId } });
    if (!existing) {
      throw new NotFoundException('Élément de checklist introuvable');
    }
    await this.prisma.siteChecklistItem.delete({ where: { id: itemId } });
    this.auditService.record({
      actorId,
      action: 'UPDATE_SITE',
      entityType: 'site',
      entityId: siteId,
      details: `Checklist -${existing.label}`,
    });
    return { success: true };
  }
}
