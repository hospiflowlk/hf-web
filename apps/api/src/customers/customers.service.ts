import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customer.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer || customer.isDeleted) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(data: any) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Customer name is required');
    }
    try {
      return await this.prisma.customer.create({
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A customer with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.isDeleted) {
      throw new NotFoundException('Customer not found');
    }

    try {
      return await this.prisma.customer.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A customer with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) return;
    
    // Soft delete to preserve records referenced by invoices/inventory later
    return this.prisma.customer.update({
      where: { id },
      data: { 
        isActive: false,
        isDeleted: true,
        name: `${customer.name}_deleted_${Date.now()}`
      },
    });
  }

  async bulkRemove(ids: string[]) {
    const records = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
    });

    if (records.length === 0) return;

    const timestamp = Date.now();
    
    return this.prisma.$transaction(
      records.map((record, index) => 
        this.prisma.customer.update({
          where: { id: record.id },
          data: {
            isActive: false,
        isDeleted: true,
        name: `${customer.name
          }
        })
      )
    );
  }
}
