import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Site } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SiteEntity } from './entities/site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';

type SiteView = SiteEntity & {
  clientName: string;
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
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
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
      clientId: record.clientId,
      address: record.address,
      latitude: record.latitude ?? undefined,
      longitude: record.longitude ?? undefined,
      timeWindow: record.timeWindow ?? undefined,
      active: record.active,
      supervisorIds: record.supervisors.map((item) => item.userId),
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
    const client = this.clientsService.findOne(site.clientId);
    const supervisors = site.supervisorIds
      .map((identifier) => this.usersService.findOne(identifier))
      .filter((user): user is NonNullable<ReturnType<UsersService['findOne']>> => Boolean(user))
      .map((user) => ({ id: user.id, name: user.name }));
    return {
      ...site,
      clientName: client.name,
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

  async create(dto: CreateSiteDto): Promise<SiteView> {
    this.clientsService.findOne(dto.clientId);
    const record = await this.prisma.site.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        timeWindow: dto.timeWindow ?? null,
        active: dto.active ?? true,
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
    return this.present(site);
  }

  async update(id: string, dto: UpdateSiteDto): Promise<SiteView> {
    this.ensureExists(id);
    const data: any = {};
    if (dto.clientId) {
      this.clientsService.findOne(dto.clientId);
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.timeWindow !== undefined) data.timeWindow = dto.timeWindow;
    if (dto.active !== undefined) data.active = dto.active;
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
    return this.present(site);
  }

  async remove(id: string): Promise<SiteView> {
    this.ensureExists(id);
    const record = await this.prisma.site.update({
      where: { id },
      data: { active: false },
      include: { supervisors: true },
    });
    const site = this.mapRecord(record);
    const index = this.sites.findIndex((item) => item.id === id);
    this.sites[index] = site;
    return this.present(site);
  }
}
