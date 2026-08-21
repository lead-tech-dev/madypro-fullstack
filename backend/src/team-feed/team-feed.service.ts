import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTeamPostDto } from './dto/create-team-post.dto';

@Injectable()
export class TeamFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(page = 1, pageSize = 20) {
    return this.prisma.teamPost.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  async create(authorId: string, dto: CreateTeamPostDto) {
    const post = await this.prisma.teamPost.create({
      data: { authorId, message: dto.message, photos: dto.photos ?? [] },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    await this.notifications.send({
      audience: 'ALL_AGENTS',
      title: `${post.author.firstName} ${post.author.lastName} — fil d'actualité`,
      message: dto.message,
    });
    return post;
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const post = await this.prisma.teamPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Publication introuvable');
    }
    if (post.authorId !== requesterId && requesterRole !== 'ADMIN') {
      throw new ForbiddenException("Vous ne pouvez pas supprimer cette publication");
    }
    await this.prisma.teamPost.delete({ where: { id } });
    return { deleted: true };
  }
}
