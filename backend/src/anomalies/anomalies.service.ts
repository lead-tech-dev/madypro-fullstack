import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAnomalyDto } from './dto/create-anomaly.dto';
import { UpdateAnomalyStatusDto } from './dto/update-anomaly-status.dto';

@Injectable()
export class AnomaliesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByIntervention(interventionId: string) {
    return this.prisma.anomaly.findMany({
      where: { interventionId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async create(dto: CreateAnomalyDto, userId: string) {
    const intervention = await this.prisma.intervention.findUnique({ where: { id: dto.interventionId } });
    if (!intervention) {
      throw new NotFoundException("Intervention introuvable");
    }
    const record = await this.prisma.anomaly.create({
      data: {
        interventionId: dto.interventionId,
        userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        photos: dto.photos ?? [],
        status: 'NEW',
      },
      include: { user: true },
    });
    return record;
  }

  async updateStatus(id: string, dto: UpdateAnomalyStatusDto) {
    const existing = await this.prisma.anomaly.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Anomalie introuvable');
    }
    const record = await this.prisma.anomaly.update({
      where: { id },
      data: { status: dto.status },
      include: { user: true },
    });
    return record;
  }
}
