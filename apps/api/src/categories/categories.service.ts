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
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // 30-second cache for the category list
  private categoryListCache = createCache<any[]>(30_000);

  async findAll() {
    const cached = this.categoryListCache.get();
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
    this.categoryListCache.set(categories);
    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(data: any) {
    try {
      const category = await this.prisma.category.create({ data });
      this.categoryListCache.invalidate();
      return category;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      const category = await this.prisma.category.update({ where: { id }, data });
      this.categoryListCache.invalidate();
      return category;
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

    const result = await this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        name: `${category.name}_deleted_${Date.now()}_${Math.random().toString(36).substring(7)}`
      },
    });
    this.categoryListCache.invalidate();
    return result;
  }

  async bulkRemove(ids: string[]) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: ids } },
    });

    if (categories.length === 0) return;

    const timestamp = Date.now();

    const result = await this.prisma.$transaction(
      categories.map((category, index) =>
        this.prisma.category.update({
          where: { id: category.id },
          data: {
            isActive: false,
            name: `${category.name}_deleted_${timestamp}_${index}`
          }
        })
      )
    );
    this.categoryListCache.invalidate();
    return result;
  }
}
