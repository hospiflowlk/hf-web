import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tax.findMany({
      orderBy: { calculationOrder: 'asc' }
    });
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({
      where: { id },
    });
    if (!tax) throw new NotFoundException('Tax not found');
    return tax;
  }

  async create(data: any) {
    if (data.rate) data.rate = parseFloat(data.rate);
    if (data.calculationOrder) data.calculationOrder = parseInt(data.calculationOrder, 10);
    
    try {
      return await this.prisma.tax.create({
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A tax with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    if (data.rate) data.rate = parseFloat(data.rate);
    if (data.calculationOrder) data.calculationOrder = parseInt(data.calculationOrder, 10);

    try {
      return await this.prisma.tax.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A tax with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Soft delete
    return this.prisma.tax.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
