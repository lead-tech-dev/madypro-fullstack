import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';

@Injectable()
export class ShiftSwapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  listColleagues(userId: string, search?: string) {
    // Sans terme de recherche, on ne renvoie qu'un aperçu court : avec des centaines d'agents,
    // renvoyer la liste complète serait à la fois inutilisable côté mobile et coûteux côté serveur.
    const { items } = this.usersService.findAll({
      role: 'AGENT',
      status: 'active',
      search: search?.trim() || undefined,
      pageSize: 20,
    });
    return items
      .filter((u) => u.id !== userId)
      .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }));
  }

  findAll(userId?: string) {
    return this.prisma.shiftSwapRequest.findMany({
      where: userId
        ? {
            OR: [
              { requesterId: userId },
              { targetUserId: userId },
              // demandes ouvertes (sans destinataire précis) : visibles par tout agent, pour qu'il
              // puisse potentiellement les accepter — sinon accept() n'est jamais atteignable.
              { targetUserId: null, status: 'PENDING' },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        intervention: { select: { id: true, date: true, startTime: true, endTime: true, siteId: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async create(requesterId: string, dto: CreateShiftSwapDto) {
    if (dto.targetUserId && dto.targetUserId === requesterId) {
      throw new BadRequestException('Vous ne pouvez pas vous proposer un échange à vous-même');
    }
    const assignment = await this.prisma.interventionAssignment.findUnique({
      where: { interventionId_userId: { interventionId: dto.interventionId, userId: requesterId } },
    });
    if (!assignment) {
      throw new BadRequestException("Vous n'êtes pas affecté à cette intervention");
    }
    const intervention = await this.prisma.intervention.findUnique({ where: { id: dto.interventionId } });
    if (!intervention || intervention.status !== 'PLANNED') {
      throw new BadRequestException(
        "Cette mission n'est plus proposable à l'échange (déjà démarrée, terminée ou annulée)",
      );
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
        data: { path: 'AgentShiftSwaps' },
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

  private combine(dateStr: string, time: string) {
    return new Date(`${dateStr}T${time}:00`);
  }

  async accept(id: string, userId: string) {
    const request = await this.ensureRequest(id);
    if (request.targetUserId && request.targetUserId !== userId) {
      throw new ForbiddenException("Cette demande ne vous est pas destinée");
    }
    if (request.requesterId === userId) {
      throw new BadRequestException('Vous ne pouvez pas accepter votre propre demande');
    }

    const intervention = await this.prisma.intervention.findUnique({ where: { id: request.interventionId } });
    if (!intervention) {
      throw new NotFoundException('Intervention introuvable');
    }
    // La mission a pu démarrer, être terminée ou annulée entre la création de la demande et son
    // acceptation : on ne réaffecte jamais une mission qui n'est plus au statut PLANNED.
    if (intervention.status !== 'PLANNED') {
      throw new BadRequestException(
        "Cette mission n'est plus disponible pour un échange (déjà démarrée, terminée ou annulée)",
      );
    }

    const dateStr = intervention.date.toISOString().slice(0, 10);
    const newStart = this.combine(dateStr, intervention.startTime);
    const newEnd = this.combine(dateStr, intervention.endTime);
    const sameDayInterventions = await this.prisma.intervention.findMany({
      where: {
        date: intervention.date,
        id: { not: intervention.id },
        status: { notIn: ['CANCELLED'] },
        assignments: { some: { userId } },
      },
    });
    for (const other of sameDayInterventions) {
      const otherStart = this.combine(dateStr, other.startTime);
      const otherEnd = this.combine(dateStr, other.endTime);
      const overlaps = newStart < otherEnd && otherStart < newEnd;
      if (overlaps) {
        throw new BadRequestException(
          `Vous êtes déjà planifié sur une autre mission le ${dateStr} de ${other.startTime} à ${other.endTime}`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.interventionAssignment.deleteMany({
        where: { interventionId: request.interventionId, userId: request.requesterId },
      }),
      // Le demandeur n'est plus responsable de cette mission : son éventuel pointage (arrivée...)
      // devient obsolète et ne doit pas rester orphelin en base.
      this.prisma.attendance.deleteMany({
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
      data: { path: 'AgentShiftSwaps' },
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
      data: { path: 'AgentShiftSwaps' },
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
