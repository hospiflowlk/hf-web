import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        return this.prisma.posCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      throw new ConflictException('POS Category with this name already exists');
    }
    return this.prisma.posCategory.create({ data });
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

    return this.prisma.posCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.posCategory.findUnique({ where: { id } });
    if (!category || !category.isActive) {
      throw new NotFoundException('POS Category not found');
    }
    return this.prisma.posCategory.update({
      where: { id },
      data: { isActive: false },
    });
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
    return { success: true };
  }
}
