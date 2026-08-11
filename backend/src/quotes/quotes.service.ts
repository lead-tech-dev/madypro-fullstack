import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(siteId?: string) {
    return this.prisma.quote.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { issuedAt: 'desc' },
      include: { site: { select: { name: true } } },
    });
  }

  create(dto: CreateQuoteDto) {
    return this.prisma.quote.create({
      data: {
        siteId: dto.siteId,
        interventionId: dto.interventionId,
        label: dto.label,
        amount: dto.amount,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        documentUrl: dto.documentUrl,
      },
    });
  }

  async setStatus(id: string, status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED') {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Devis introuvable');
    }
    return this.prisma.quote.update({ where: { id }, data: { status } });
  }

  async remove(id: string) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Devis introuvable');
    }
    await this.prisma.quote.delete({ where: { id } });
    return { deleted: true };
  }
}
