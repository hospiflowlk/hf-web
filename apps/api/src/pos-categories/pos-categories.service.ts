import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';

@Injectable()
export class PosCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.posCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: { name: string }) {
    const existing = await this.prisma.posCategory.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      if (!existing.isActive) {
        const cat = await this.prisma.posCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        ItemsService.invalidatePosCache();
        return cat;
      }
      throw new ConflictException('POS Category with this name already exists');
    }
    const cat = await this.prisma.posCategory.create({ data });
    ItemsService.invalidatePosCache();
    return cat;
  }

  async update(id: string, data: { name: string }) {
    const category = await this.prisma.posCategory.findUnique({ where: { id } });
    if (!category || !category.isActive) {
      throw new NotFoundException('POS Category not found');
    }

    if (data.name && data.name !== category.name) {
      const existing = await this.prisma.posCategory.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException('POS Category with this name already exists');
      }
    }

    const cat = await this.prisma.posCategory.update({
      where: { id },
      data,
    });
    ItemsService.invalidatePosCache();
    return cat;
  }

  async remove(id: string) {
    const category = await this.prisma.posCategory.findUnique({ where: { id } });
    if (!category || !category.isActive) {
      throw new NotFoundException('POS Category not found');
    }
    const cat = await this.prisma.posCategory.update({
      where: { id },
      data: { isActive: false },
    });
    ItemsService.invalidatePosCache();
    return cat;
  }

  async reorder(orderedIds: string[]) {
    // Perform updates in a transaction
    const updates = orderedIds.map((id, index) =>
      this.prisma.posCategory.update({
        where: { id },
        data: { sortOrder: index },
      })
    );
    await this.prisma.$transaction(updates);
    ItemsService.invalidatePosCache();
    return { success: true };
  }
}

