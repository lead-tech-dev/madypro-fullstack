import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  listApiKeys() {
    return this.prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createApiKey(dto: CreateApiKeyDto) {
    return this.prisma.apiKey.create({
      data: { label: dto.label, scopes: dto.scopes ?? [], key: `mpc_${randomBytes(24).toString('hex')}` },
    });
  }

  async revokeApiKey(id: string) {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Clé API introuvable');
    }
    await this.prisma.apiKey.update({ where: { id }, data: { active: false } });
    return { revoked: true };
  }

  async validateApiKey(key?: string): Promise<boolean> {
    if (!key) return false;
    const record = await this.prisma.apiKey.findUnique({ where: { key } });
    if (!record?.active) return false;
    this.prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return true;
  }

  listPortalTokens(siteId?: string) {
    return this.prisma.clientPortalToken.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { site: { select: { name: true } } },
    });
  }

  createPortalToken(siteId: string) {
    return this.prisma.clientPortalToken.create({
      data: { siteId, token: randomBytes(20).toString('hex') },
    });
  }

  async revokePortalToken(id: string) {
    const existing = await this.prisma.clientPortalToken.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Jeton introuvable');
    }
    await this.prisma.clientPortalToken.update({ where: { id }, data: { active: false } });
    return { revoked: true };
  }

  async resolvePortalToken(token: string) {
    const record = await this.prisma.clientPortalToken.findUnique({ where: { token } });
    if (!record?.active) {
      throw new NotFoundException('Jeton invalide ou révoqué');
    }
    return record;
  }
}
