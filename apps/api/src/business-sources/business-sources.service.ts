import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessSourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.businessSource.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const source = await this.prisma.businessSource.findUnique({
      where: { id },
    });
    if (!source || source.isDeleted) {
      throw new NotFoundException('Business Source not found');
    }
    return source;
  }

  async create(data: any) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Business Source name is required');
    }
    try {
      return await this.prisma.businessSource.create({
        data: {
          name: data.name.trim(),
          commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A Business Source with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    const source = await this.prisma.businessSource.findUnique({ where: { id } });
    if (!source || source.isDeleted) {
      throw new NotFoundException('Business Source not found');
    }

    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.commissionRate !== undefined) updateData.commissionRate = parseFloat(data.commissionRate);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      return await this.prisma.businessSource.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A Business Source with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const source = await this.prisma.businessSource.findUnique({ where: { id } });
    if (!source) return;
    
    // Soft delete
    return this.prisma.businessSource.update({
      where: { id },
      data: { 
        isActive: false,
        isDeleted: true,
        name: `${source.name}_deleted_${Date.now()}`
      },
    });
  }
}
