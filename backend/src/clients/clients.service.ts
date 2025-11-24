import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Client } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ClientEntity } from './entities/client.entity';

type ClientFilters = {
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ClientsService implements OnModuleInit {
  private clients: ClientEntity[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncFromDatabase();
  }

  private async syncFromDatabase() {
    const records = await this.prisma.client.findMany({ orderBy: { createdAt: 'asc' } });
    this.clients = records.map((record) => this.mapRecord(record));
  }

  private mapRecord(record: Client): ClientEntity {
    return {
      id: record.id,
      name: record.name,
      contact: {
        name: record.contactName ?? '',
        email: record.contactEmail ?? '',
        phone: record.contactPhone ?? '',
      },
      active: record.active,
    };
  }

  private ensureExists(id: string) {
    const client = this.clients.find((item) => item.id === id);
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }
    return client;
  }

  findAll(filters: ClientFilters = { page: 1, pageSize: 20 }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const total = this.clients.length;
    const start = (page - 1) * pageSize;
    const items = this.clients.slice(start, start + pageSize);
    return { items, total, page, pageSize };
  }

  findOne(id: string) {
    return this.ensureExists(id);
  }

  async create(data: Omit<ClientEntity, 'id'>) {
    const record = await this.prisma.client.create({
      data: {
        name: data.name,
        contactName: data.contact.name,
        contactEmail: data.contact.email,
        contactPhone: data.contact.phone,
        active: data.active,
      },
    });
    const client = this.mapRecord(record);
    this.clients.push(client);
    return client;
  }

  async update(id: string, data: Partial<Omit<ClientEntity, 'id'>>) {
    this.ensureExists(id);
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.contact?.name !== undefined) payload.contactName = data.contact.name;
    if (data.contact?.email !== undefined) payload.contactEmail = data.contact.email;
    if (data.contact?.phone !== undefined) payload.contactPhone = data.contact.phone;
    if (typeof data.active === 'boolean') payload.active = data.active;

    const record = await this.prisma.client.update({
      where: { id },
      data: payload,
    });
    const client = this.mapRecord(record);
    const index = this.clients.findIndex((item) => item.id === id);
    this.clients[index] = client;
    return client;
  }

  async remove(id: string) {
    this.ensureExists(id);
    const record = await this.prisma.client.update({
      where: { id },
      data: { active: false },
    });
    const client = this.mapRecord(record);
    const index = this.clients.findIndex((item) => item.id === id);
    this.clients[index] = client;
    return client;
  }
}
