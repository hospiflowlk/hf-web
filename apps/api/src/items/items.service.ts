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
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  // 30-second cache for the full item list — invalidated on any mutation
  private itemListCache = createCache<any[]>(30_000);
  // 30-second cache for POS master data (items + taxes + posCategories)
  private posMasterCache = createCache<any>(30_000);

  async findAll() {
    const cached = this.itemListCache.get();
    if (cached) return cached;

    const items = await this.prisma.item.findMany({
      where: { isDeleted: false },
      include: {
        category: true,
        posCategory: true,
        exemptTaxes: true,
        compositeOf: { include: { ingredient: true } },
        ingredientIn: { include: { compositeItem: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    this.itemListCache.set(items);
    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id, isDeleted: false },
      include: {
        category: true,
        posCategory: true,
        exemptTaxes: true,
        compositeOf: { include: { ingredient: true } },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async create(data: any) {
    const { categoryId, posCategoryId, exemptTaxes, ingredients, ...rest } = data;
    try {
      const item = await this.prisma.item.create({
        data: {
          ...rest,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(posCategoryId && { posCategory: { connect: { id: posCategoryId } } }),
          ...(exemptTaxes && {
            exemptTaxes: { connect: exemptTaxes.map((t: string) => ({ id: t })) },
          }),
          ...(ingredients && ingredients.length > 0 && {
            compositeOf: {
              create: ingredients.map((ing: any) => ({
                ingredientItemId: ing.ingredientItemId,
                quantity: ing.quantity,
                unit: ing.unit,
              }))
            }
          })
        },
        include: { category: true, posCategory: true, exemptTaxes: true, compositeOf: { include: { ingredient: true } } },
      });
      this.itemListCache.invalidate();
      this.posMasterCache.invalidate();
      return item;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('An item with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    const { categoryId, posCategoryId, exemptTaxes, ingredients, ...rest } = data;
    try {
      const item = await this.prisma.item.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(posCategoryId !== undefined && {
            posCategory: posCategoryId ? { connect: { id: posCategoryId } } : { disconnect: true }
          }),
          ...(exemptTaxes && {
            exemptTaxes: { set: exemptTaxes.map((t: string) => ({ id: t })) },
          }),
          ...(ingredients !== undefined && {
            compositeOf: {
              deleteMany: {},
              create: ingredients.map((ing: any) => ({
                ingredientItemId: ing.ingredientItemId,
                quantity: ing.quantity,
                unit: ing.unit,
              }))
            }
          })
        },
        include: { category: true, posCategory: true, exemptTaxes: true, compositeOf: { include: { ingredient: true } } },
      });
      this.itemListCache.invalidate();
      this.posMasterCache.invalidate();
      return item;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('An item with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) return;

    const result = await this.prisma.item.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        name: `${item.name}_deleted_${Date.now()}`
      },
    });
    this.itemListCache.invalidate();
    this.posMasterCache.invalidate();
    return result;
  }

  async getCategories() {
    return this.prisma.category.findMany({ where: { isActive: true } });
  }

  async getPosMasterData() {
    const cached = this.posMasterCache.get();
    if (cached) return cached;

    const [posCategories, taxes, items] = await Promise.all([
      this.prisma.posCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.tax.findMany({ where: { isActive: true } }),
      this.prisma.item.findMany({
        where: { isDeleted: false, isActive: true, useInPos: true },
        select: {
          id: true,
          name: true,
          trackStock: true,
          stockQuantity: true,
          defaultPrice: true,
          posCategory: { select: { name: true } },
          exemptTaxes: { select: { id: true } }
        },
        orderBy: { createdAt: 'asc' }
      })

    ]);

    const mappedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.posCategory?.name || 'Uncategorized',
      quantity: item.trackStock ? item.stockQuantity : 999,
      unitPrice: item.defaultPrice || 0,
      exemptTaxIds: item.exemptTaxes.map(t => t.id),
      trackStock: item.trackStock
    }));

    const result = { posCategories, taxes, items: mappedItems };
    this.posMasterCache.set(result);
    return result;
  }

  async getTaxes() {
    return this.prisma.tax.findMany({ where: { isActive: true } });
  }

  async bulkRemove(ids: string[]) {
    const records = await this.prisma.item.findMany({
      where: { id: { in: ids } },
    });

    if (records.length === 0) return;

    const timestamp = Date.now();
    
    const result = await this.prisma.$transaction(
      records.map((record, index) =>
        this.prisma.item.update({
          where: { id: record.id },
          data: {
            isDeleted: true,
            isActive: false,
            name: `${record.name}_deleted_${timestamp}_${index}_${Math.random().toString(36).substring(7)}`
          }
        })
      )
    );
    this.itemListCache.invalidate();
    this.posMasterCache.invalidate();
    return result;
  }
}
