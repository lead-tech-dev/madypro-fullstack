import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { AwardBadgeDto } from './dto/award-badge.dto';

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findBadges() {
    return this.prisma.badge.findMany({ orderBy: { label: 'asc' } });
  }

  createBadge(dto: CreateBadgeDto) {
    return this.prisma.badge.create({ data: dto });
  }

  findAwards(userId?: string) {
    return this.prisma.userBadge.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { awardedAt: 'desc' },
      include: { badge: true },
    });
  }

  async award(awardedBy: string, dto: AwardBadgeDto) {
    const badge = await this.prisma.badge.findUnique({ where: { id: dto.badgeId } });
    if (!badge) {
      throw new NotFoundException('Badge introuvable');
    }
    const award = await this.prisma.userBadge.create({
      data: { userId: dto.userId, badgeId: dto.badgeId, period: dto.period, note: dto.note, awardedBy },
      include: { badge: true },
    });
    await this.notifications.send({
      title: 'Nouveau badge reçu 🏅',
      message: `Vous avez reçu le badge « ${badge.label} »`,
      audience: 'AGENT',
      targetId: dto.userId,
    });
    return award;
  }

  async revoke(id: string) {
    const award = await this.prisma.userBadge.findUnique({ where: { id } });
    if (!award) {
      throw new NotFoundException('Attribution introuvable');
    }
    await this.prisma.userBadge.delete({ where: { id } });
    return { deleted: true };
  }
}
