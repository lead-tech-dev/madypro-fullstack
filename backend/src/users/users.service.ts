import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

type PublicUser = Omit<UserEntity, 'password'> & { name: string };

const generatePassword = () => Math.random().toString(36).slice(-10);

interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private users: UserEntity[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncFromDatabase();
  }

  private async syncFromDatabase() {
    const records = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    this.users = records.map((record) => this.mapRecord(record));
  }

  private mapRecord(record: User): UserEntity {
    return {
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      role: record.role,
      phone: record.phone ?? '',
      password: record.password,
      active: record.active,
    };
  }

  private upsertCache(user: UserEntity) {
    const index = this.users.findIndex((item) => item.id === user.id);
    if (index === -1) {
      this.users.push(user);
    } else {
      this.users[index] = user;
    }
  }

  private normalizeRole(role?: string): Role {
    const fallback: Role = Role.AGENT;
    if (!role) {
      return fallback;
    }
    const formatted = role.toUpperCase() as Role;
    if ((Object.values(Role) as string[]).includes(formatted)) {
      return formatted;
    }
    return fallback;
  }

  private toPublic(user: UserEntity): PublicUser {
    const { password, ...rest } = user;
    return { ...rest, name: `${user.firstName} ${user.lastName}`.trim() };
  }

  findAll(filters: UserFilters = {}): { items: PublicUser[]; total: number; page: number; pageSize: number } {
    const { search, role, status, page = 1, pageSize = 20 } = filters;
    const filtered = this.users
      .filter((user) => {
        if (role && user.role.toLowerCase() !== role.toLowerCase()) return false;
        if (status === 'active' && !user.active) return false;
        if (status === 'inactive' && user.active) return false;
        if (search) {
          const target = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
          if (!target.includes(search.toLowerCase())) return false;
        }
        return true;
      });
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((user) => this.toPublic(user));
    return { items, total, page, pageSize };
  }

  findOne(id: string): PublicUser | undefined {
    const user = this.users.find((item) => item.id === id);
    return user ? this.toPublic(user) : undefined;
  }

  private ensureExists(id: string): UserEntity {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const password = dto.password ?? generatePassword();
    const record = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        role: this.normalizeRole(dto.role),
        phone: dto.phone ?? '',
        password: await bcrypt.hash(password, 10),
      },
    });
    const entity = this.mapRecord(record);
    this.upsertCache(entity);
    return this.toPublic(entity);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = this.ensureExists(id);
    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.email) data.email = dto.email;
    if (dto.role) data.role = this.normalizeRole(dto.role);
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const record = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    const updated = this.mapRecord(record);
    this.upsertCache(updated);
    return this.toPublic(updated);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<PublicUser> {
    this.ensureExists(id);
    const record = await this.prisma.user.update({
      where: { id },
      data: { active: dto.active },
    });
    const updated = this.mapRecord(record);
    this.upsertCache(updated);
    return this.toPublic(updated);
  }

  async resetPassword(id: string, password?: string) {
    this.ensureExists(id);
    const nextPassword = password ?? generatePassword();
    const hashed = await bcrypt.hash(nextPassword, 10);
    const record = await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    const updated = this.mapRecord(record);
    this.upsertCache(updated);
    return { password: nextPassword };
  }

  findByEmail(email: string): UserEntity | undefined {
    return this.users.find((user) => user.email === email);
  }
}
