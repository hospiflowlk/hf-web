import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(data: any) {
    try {
      return await this.prisma.category.create({
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) return;

    return this.prisma.category.update({
      where: { id },
      data: { 
        isActive: false,
        name: `${category.name}_deleted_${Date.now()}`
      },
    });
  }
}
