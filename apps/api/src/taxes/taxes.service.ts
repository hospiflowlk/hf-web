import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Simple in-process TTL cache
interface CacheEntry<T> { data: T; expiresAt: number }
function createCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;
  return {
    get(): T | null {
      if (entry && Date.now() < entry.expiresAt) return entry.data;
      return null;
    },
    set(data: T) { entry = { data, expiresAt: Date.now() + ttlMs }; },
    invalidate() { entry = null; },
  };
}

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  // 60-second cache — taxes change very rarely (admin-only setting)
  private taxListCache = createCache<any[]>(60_000);

  async findAll() {
    const cached = this.taxListCache.get();
    if (cached) return cached;

    const taxes = await this.prisma.tax.findMany({
      orderBy: { calculationOrder: 'asc' }
    });
    this.taxListCache.set(taxes);
    return taxes;
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) throw new NotFoundException('Tax not found');
    return tax;
  }

  async create(data: any) {
    if (data.rate) data.rate = parseFloat(data.rate);
    if (data.calculationOrder) data.calculationOrder = parseInt(data.calculationOrder, 10);
    
    try {
      const tax = await this.prisma.tax.create({ data });
      this.taxListCache.invalidate();
      return tax;
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
      const tax = await this.prisma.tax.update({ where: { id }, data });
      this.taxListCache.invalidate();
      return tax;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A tax with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const tax = await this.prisma.tax.update({
      where: { id },
      data: { isActive: false },
    });
    this.taxListCache.invalidate();
    return tax;
  }

  async bulkRemove(ids: string[]) {
    const records = await this.prisma.tax.findMany({
      where: { id: { in: ids } },
    });

    if (records.length === 0) return;

    const result = await this.prisma.$transaction(
      records.map((record) =>
        this.prisma.tax.update({
          where: { id: record.id },
          data: { isActive: false }
        })
      )
    );
    this.taxListCache.invalidate();
    return result;
  }
}
