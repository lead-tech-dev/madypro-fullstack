import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamPostDto } from './dto/create-team-post.dto';

@Injectable()
export class TeamFeedService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page = 1, pageSize = 20) {
    return this.prisma.teamPost.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  create(authorId: string, dto: CreateTeamPostDto) {
    return this.prisma.teamPost.create({
      data: { authorId, message: dto.message, photos: dto.photos ?? [] },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
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
