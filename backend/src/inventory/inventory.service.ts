import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(siteId?: string) {
    return this.prisma.inventoryItem.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findLowStock() {
    const items = await this.prisma.inventoryItem.findMany({
      include: { site: { select: { id: true, name: true } } },
      orderBy: { quantity: 'asc' },
    });
    return items.filter((item) => item.quantity <= item.minThreshold);
  }

  async findByBarcode(barcode: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { barcode } });
    if (!item) {
      throw new NotFoundException('Article introuvable pour ce code-barres');
    }
    return item;
  }

  create(dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        siteId: dto.siteId,
        name: dto.name,
        barcode: dto.barcode,
        unit: dto.unit ?? 'unité',
        quantity: dto.quantity ?? 0,
        minThreshold: dto.minThreshold ?? 0,
      },
    });
  }

  async adjustQuantity(id: string, delta: number) {
    // Compare-and-swap sur la quantité observée : deux ajustements concurrents (deux agents qui
    // scannent le même article) ne doivent jamais s'écraser l'un l'autre (lecture-puis-écriture
    // naïve perdrait silencieusement un décrément).
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Article introuvable');
      }
      const nextQuantity = Math.max(0, existing.quantity + delta);
      const result = await this.prisma.inventoryItem.updateMany({
        where: { id, quantity: existing.quantity },
        data: { quantity: nextQuantity },
      });
      if (result.count > 0) {
        return this.prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
      }
    }
    throw new BadRequestException('Ajustement impossible (article modifié en parallèle), réessayez.');
  }

  async remove(id: string) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Article introuvable');
    }
    await this.prisma.inventoryItem.delete({ where: { id } });
    return { deleted: true };
  }
}
