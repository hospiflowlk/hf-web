import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier || supplier.isDeleted) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async create(data: any) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Supplier name is required');
    }
    try {
      return await this.prisma.supplier.create({
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A supplier with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A supplier with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return;

    // Soft delete to preserve records referenced by invoices/inventory later
    return this.prisma.supplier.update({
      where: { id },
      data: { 
        isActive: false,
        isDeleted: true,
        name: `${supplier.name}_deleted_${Date.now()}`
      },
    });
  }

  async bulkRemove(ids: string[]) {
    const records = await this.prisma.supplier.findMany({
      where: { id: { in: ids } },
    });

    if (records.length === 0) return;

    const timestamp = Date.now();
    
    return this.prisma.$transaction(
      records.map((record, index) => 
        this.prisma.supplier.update({
          where: { id: record.id },
          data: {
            isActive: false,
        isDeleted: true,
        name: `${supplier.name
          }
        })
      )
    );
  }
}
