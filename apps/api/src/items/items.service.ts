import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.item.findMany({
      where: { isDeleted: false },
      include: {
        category: true,
        posCategory: true,
        exemptTaxes: true,
        compositeOf: { include: { ingredient: true } },
        ingredientIn: { include: { compositeItem: true } }
      },
    });
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
      return await this.prisma.item.create({
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
      return await this.prisma.item.update({
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

    return this.prisma.item.update({
      where: { id },
      data: { 
        isDeleted: true, 
        isActive: false,
        name: `${item.name}_deleted_${Date.now()}`
      },
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({ where: { isActive: true } });
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
    
    return this.prisma.$transaction(
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
  }
}
