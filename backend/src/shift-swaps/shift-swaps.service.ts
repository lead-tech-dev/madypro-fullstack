import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';

@Injectable()
export class ShiftSwapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(userId?: string) {
    return this.prisma.shiftSwapRequest.findMany({
      where: userId ? { OR: [{ requesterId: userId }, { targetUserId: userId }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        intervention: { select: { id: true, date: true, startTime: true, endTime: true, siteId: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async create(requesterId: string, dto: CreateShiftSwapDto) {
    const assignment = await this.prisma.interventionAssignment.findUnique({
      where: { interventionId_userId: { interventionId: dto.interventionId, userId: requesterId } },
    });
    if (!assignment) {
      throw new BadRequestException("Vous n'êtes pas affecté à cette intervention");
    }
    const request = await this.prisma.shiftSwapRequest.create({
      data: {
        interventionId: dto.interventionId,
        requesterId,
        targetUserId: dto.targetUserId,
        reason: dto.reason,
      },
    });
    if (dto.targetUserId) {
      await this.notifications.send({
        title: 'Échange de shift proposé',
        message: 'Un collègue vous propose un échange de mission.',
        audience: 'AGENT',
        targetId: dto.targetUserId,
      });
    }
    return request;
  }

  private async ensureRequest(id: string) {
    const request = await this.prisma.shiftSwapRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }
    return request;
  }

  async accept(id: string, userId: string) {
    const request = await this.ensureRequest(id);
    if (request.targetUserId && request.targetUserId !== userId) {
      throw new ForbiddenException("Cette demande ne vous est pas destinée");
    }
    if (request.requesterId === userId) {
      throw new BadRequestException('Vous ne pouvez pas accepter votre propre demande');
    }

    await this.prisma.$transaction([
      this.prisma.interventionAssignment.deleteMany({
        where: { interventionId: request.interventionId, userId: request.requesterId },
      }),
      this.prisma.interventionAssignment.upsert({
        where: { interventionId_userId: { interventionId: request.interventionId, userId } },
        update: {},
        create: { interventionId: request.interventionId, userId },
      }),
    ]);

    const updated = await this.prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'ACCEPTED', targetUserId: userId, respondedAt: new Date() },
    });

    await this.notifications.send({
      title: 'Échange de shift accepté',
      message: 'Votre demande d’échange de mission a été acceptée.',
      audience: 'AGENT',
      targetId: request.requesterId,
    });

    return updated;
  }

  async reject(id: string, userId: string) {
    const request = await this.ensureRequest(id);
    if (request.targetUserId && request.targetUserId !== userId) {
      throw new ForbiddenException("Cette demande ne vous est pas destinée");
    }
    const updated = await this.prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
    await this.notifications.send({
      title: 'Échange de shift refusé',
      message: 'Votre demande d’échange de mission a été refusée.',
      audience: 'AGENT',
      targetId: request.requesterId,
    });
    return updated;
  }

  async cancel(id: string, userId: string) {
    const request = await this.ensureRequest(id);
    if (request.requesterId !== userId) {
      throw new ForbiddenException('Seul le demandeur peut annuler cette demande');
    }
    return this.prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });
  }
}
