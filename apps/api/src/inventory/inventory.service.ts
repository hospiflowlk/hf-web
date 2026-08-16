import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const items = await this.prisma.item.findMany({
      where: { trackStock: true, isActive: true, isDeleted: false }
    });

    const totalTrackedItems = items.length;
    const lowStockItems = items.filter(i => i.stockQuantity <= i.reorderLevel).length;
    
    const totalValue = items.reduce((sum, item) => {
      // Only count positive stock for valuation
      return sum + (item.stockQuantity > 0 ? item.stockQuantity * item.costPrice : 0);
    }, 0);

    return {
      totalTrackedItems,
      lowStockItems,
      totalValue
    };
  }

  async getTrackedItems() {
    return this.prisma.item.findMany({
      where: { trackStock: true, isActive: true, isDeleted: false },
      include: {
        category: true,
        posCategory: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getTransactions(itemId?: string, limit: number = 100) {
    const where = itemId ? { itemId } : {};
    return this.prisma.inventoryTransaction.findMany({
      where,
      include: { item: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async adjustStock(data: { itemId: string; quantity: number; reason: string }) {
    if (data.quantity === 0) throw new BadRequestException('Adjustment quantity cannot be 0');

    return this.prisma.$transaction(async (prisma) => {
      const item = await prisma.item.findUnique({ where: { id: data.itemId } });
      if (!item) throw new NotFoundException('Item not found');
      if (!item.trackStock) throw new BadRequestException('This item does not track stock');

      // Add to inventory ledger
      const tx = await prisma.inventoryTransaction.create({
        data: {
          itemId: data.itemId,
          type: 'ADJUST',
          quantity: data.quantity,
          reference: 'Manual Adjustment',
          remarks: data.reason
        }
      });

      // Update item stock
      await prisma.item.update({
        where: { id: data.itemId },
        data: {
          stockQuantity: { increment: data.quantity }
        }
      });

      return tx;
    });
  }
}
