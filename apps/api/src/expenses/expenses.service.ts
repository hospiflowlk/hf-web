import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const round2 = (val: any) => Number((parseFloat(val) || 0).toFixed(2));

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(cursor?: string, limit: number = 50) {
    const data = await this.prisma.expense.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [
        { expenseDate: 'desc' },
        { id: 'desc' }
      ],
      include: {
        items: true,
        supplier: true
      }
    });

    const nextCursor = data.length === limit ? data[data.length - 1].id : null;
    return { data, nextCursor };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { items: true, supplier: true, settlements: { include: { account: true } } },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async create(data: any) {
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    return this.prisma.$transaction(async (prisma) => {
      const expense = await prisma.expense.create({
        data: {
          supplierId: data.supplierId,
          reference: data.reference,
          currency: data.currency || 'LKR',
          status: data.status || 'Unpaid',
          roundOff: round2(data.roundOff),
          totalAmount: round2(data.totalAmount),
          description: data.description,
          note: data.note,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          
          items: {
            create: data.items.map((item: any) => ({
              itemId: item.itemId,
              categoryId: item.categoryId,
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: round2(item.unitPrice),
              vatAmount: round2(item.vatAmount),
              amount: round2(item.amount),
              lineTotal: round2(item.lineTotal),
              note: item.note
            }))
          }
        },
        include: { items: true }
      });

      // Update inventory stock for items
      const itemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
      if (itemIds.length > 0) {
        const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds }, trackStock: true } });
        const trackedItemIds = new Set(dbItems.map(i => i.id));
        
        for (const item of data.items) {
          if (item.itemId && trackedItemIds.has(item.itemId)) {
            const qty = parseFloat(item.quantity) || 1;
            await prisma.item.update({
              where: { id: item.itemId },
              data: { stockQuantity: { increment: qty } }
            });
            await prisma.inventoryTransaction.create({
              data: {
                itemId: item.itemId,
                type: 'IN',
                quantity: qty,
                reference: `Expense ${expense.id}`,
                remarks: `Purchase from ${expense.supplierId}`
              }
            });
          }
        }
      }

      return expense;
    });
  }

  async update(id: string, data: any) {
    return this.prisma.$transaction(async (prisma) => {
      // Revert old stock quantities
      const oldItems = await prisma.expenseItem.findMany({ where: { expenseId: id } });
      const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);
      
      if (oldItemIds.length > 0) {
        const dbItems = await prisma.item.findMany({ where: { id: { in: oldItemIds }, trackStock: true } });
        const trackedOldItemIds = new Set(dbItems.map(i => i.id));
        
        for (const oldItem of oldItems) {
          if (oldItem.itemId && trackedOldItemIds.has(oldItem.itemId)) {
            await prisma.item.update({
              where: { id: oldItem.itemId },
              data: { stockQuantity: { decrement: oldItem.quantity } }
            });
            await prisma.inventoryTransaction.create({
              data: {
                itemId: oldItem.itemId,
                type: 'ADJUST', // We use adjust to revert
                quantity: -oldItem.quantity,
                reference: `Expense ${id} Update (Revert)`,
                remarks: `Reverting previous purchase quantity`
              }
            });
          }
        }
      }

      await prisma.expenseItem.deleteMany({ where: { expenseId: id } });

      const expense = await prisma.expense.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          reference: data.reference,
          currency: data.currency || 'LKR',
          status: data.status || 'Unpaid',
          roundOff: round2(data.roundOff),
          totalAmount: round2(data.totalAmount),
          description: data.description,
          note: data.note,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          
          items: {
            create: data.items.map((item: any) => ({
              itemId: item.itemId,
              categoryId: item.categoryId,
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: round2(item.unitPrice),
              vatAmount: round2(item.vatAmount),
              amount: round2(item.amount),
              lineTotal: round2(item.lineTotal),
              note: item.note
            }))
          }
        },
        include: { items: true }
      });

      // Update inventory stock for new items
      const itemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
      if (itemIds.length > 0) {
        const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds }, trackStock: true } });
        const trackedItemIds = new Set(dbItems.map(i => i.id));
        
        for (const item of data.items) {
          if (item.itemId && trackedItemIds.has(item.itemId)) {
            const qty = parseFloat(item.quantity) || 1;
            await prisma.item.update({
              where: { id: item.itemId },
              data: { stockQuantity: { increment: qty } }
            });
            await prisma.inventoryTransaction.create({
              data: {
                itemId: item.itemId,
                type: 'IN',
                quantity: qty,
                reference: `Expense ${expense.id} (Updated)`,
                remarks: `Purchase from ${expense.supplierId}`
              }
            });
          }
        }
      }

      return expense;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (prisma) => {
      const settlements = await prisma.expenseSettlement.findMany({ where: { expenseId: id } });
      for (const settlement of settlements) {
        await prisma.account.update({
          where: { id: settlement.accountId },
          data: { balance: { increment: settlement.amountPaid } } // Revert the decrement
        });
      }
      // Revert stock quantities
      const oldItems = await prisma.expenseItem.findMany({ where: { expenseId: id } });
      const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);
      
      if (oldItemIds.length > 0) {
        const dbItems = await prisma.item.findMany({ where: { id: { in: oldItemIds }, trackStock: true } });
        const trackedOldItemIds = new Set(dbItems.map(i => i.id));
        
        for (const oldItem of oldItems) {
          if (oldItem.itemId && trackedOldItemIds.has(oldItem.itemId)) {
            await prisma.item.update({
              where: { id: oldItem.itemId },
              data: { stockQuantity: { decrement: oldItem.quantity } }
            });
            await prisma.inventoryTransaction.create({
              data: {
                itemId: oldItem.itemId,
                type: 'ADJUST',
                quantity: -oldItem.quantity,
                reference: `Expense ${id} (Deleted)`,
                remarks: `Reverting purchase quantity due to deletion`
              }
            });
          }
        }
      }

      return prisma.expense.delete({ where: { id } });
    });
  }

  async getSettlements(expenseId: string) {
    return this.prisma.expenseSettlement.findMany({
      where: { expenseId },
      include: { account: true },
      orderBy: { paidDate: 'desc' }
    });
  }

  async recordSettlement(expenseId: string, data: any) {
    return this.prisma.$transaction(async (prisma) => {
      const amount = round2(data.amount);
      const amountPaid = round2(data.amountPaid);

      const settlement = await prisma.expenseSettlement.create({
        data: {
          expenseId,
          accountId: data.accountId,
          amount,
          amountPaid,
          reference: data.reference,
          batchId: data.batchId,
          paidDate: data.paidDate ? new Date(data.paidDate) : new Date(),
        }
      });

      // Expenses deduct from the account balance
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: amountPaid } }
      });

      const allSettlements = await prisma.expenseSettlement.findMany({ where: { expenseId } });
      const totalPaid = allSettlements.reduce((sum, s) => sum + s.amount, 0);
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      
      let newStatus = 'Unpaid';
      if (expense) {
        if (totalPaid >= expense.totalAmount - 0.01) {
          newStatus = 'Paid';
        } else if (totalPaid > 0) {
          newStatus = 'Partial';
        }
        await prisma.expense.update({
          where: { id: expenseId },
          data: { status: newStatus }
        });
      }
      
      return settlement;
    });
  }

  async deleteSettlement(settlementId: string) {
    return this.prisma.$transaction(async (prisma) => {
      const settlement = await prisma.expenseSettlement.findUnique({ where: { id: settlementId } });
      if (!settlement) throw new NotFoundException('Settlement not found');

      // Revert the account deduction
      await prisma.account.update({
        where: { id: settlement.accountId },
        data: { balance: { increment: settlement.amountPaid } }
      });

      await prisma.expenseSettlement.delete({ where: { id: settlementId } });

      const allSettlements = await prisma.expenseSettlement.findMany({ where: { expenseId: settlement.expenseId } });
      const totalPaid = allSettlements.reduce((sum, s) => sum + s.amount, 0);
      const expense = await prisma.expense.findUnique({ where: { id: settlement.expenseId } });
      
      if (expense) {
        let newStatus = 'Unpaid';
        if (totalPaid >= expense.totalAmount - 0.01) {
          newStatus = 'Paid';
        } else if (totalPaid > 0) {
          newStatus = 'Partial';
        }
        await prisma.expense.update({
          where: { id: expense.id },
          data: { status: newStatus }
        });
      }

      return { success: true };
    });
  }

  async resetStatus(expenseId: string) {
    const allSettlements = await this.prisma.expenseSettlement.findMany({ where: { expenseId } });
    const totalPaid = allSettlements.reduce((sum, s) => sum + s.amount, 0);
    const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
    
    if (expense) {
      let newStatus = 'Unpaid';
      if (totalPaid >= expense.totalAmount - 0.01) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      }
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: { status: newStatus }
      });
      return { success: true, status: newStatus };
    }
    throw new NotFoundException('Expense not found');
  }
}
