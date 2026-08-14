import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.interventionCategory.findMany({ orderBy: { label: 'asc' } });
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.interventionCategory.create({
      data: { label: dto.label, active: dto.active ?? true },
    });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.interventionCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.interventionCategory.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const [siteCategoryCount, interventionCount, templateStopCount] = await Promise.all([
      this.prisma.siteCategory.count({ where: { categoryId: id } }),
      this.prisma.intervention.count({ where: { categoryId: id } }),
      this.prisma.templateStop.count({ where: { categoryId: id } }),
    ]);
    if (siteCategoryCount || interventionCount || templateStopCount) {
      throw new BadRequestException(
        'Cette catégorie est utilisée (site, intervention ou gabarit) et ne peut pas être supprimée — désactivez-la à la place.',
      );
    }
    await this.prisma.interventionCategory.delete({ where: { id } });
    return { deleted: true };
  }
}
