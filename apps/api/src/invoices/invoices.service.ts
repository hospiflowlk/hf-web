import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const round2 = (val: any) => Number((parseFloat(val) || 0).toFixed(2));

// Shared inventory deduction logic to avoid code duplication
async function deductInventoryForItems(
  prisma: any,
  invoiceRef: string,
  saleItems: Array<{ itemId?: string | null; quantity: number }>,
  dbItemMap: Map<string, any>,
  action: 'create' | 'update',
) {
  for (const item of saleItems) {
    if (!item.itemId || !dbItemMap.has(item.itemId)) continue;
    const dbItem = dbItemMap.get(item.itemId)!;
    const qty = parseFloat(String(item.quantity)) || 1;
    const suffix = action === 'update' ? ' (Updated)' : '';

    if (dbItem.itemType === 'composite' && dbItem.compositeOf?.length > 0) {
      for (const ing of dbItem.compositeOf) {
        if (ing.ingredient?.trackStock) {
          const deductionQty = ing.quantity * qty;
          await prisma.item.update({
            where: { id: ing.ingredientItemId },
            data: { stockQuantity: { decrement: deductionQty } },
          });
          await prisma.inventoryTransaction.create({
            data: {
              itemId: ing.ingredientItemId,
              type: 'OUT',
              quantity: deductionQty,
              reference: `Invoice ${invoiceRef}${suffix}`,
              remarks: `Used in ${dbItem.name} (Invoice ${action})`,
            },
          });
        }
      }
    } else if (dbItem.trackStock) {
      await prisma.item.update({
        where: { id: item.itemId },
        data: { stockQuantity: { decrement: qty } },
      });
      await prisma.inventoryTransaction.create({
        data: {
          itemId: item.itemId,
          type: 'OUT',
          quantity: qty,
          reference: `Invoice ${invoiceRef}${suffix}`,
          remarks: `Invoice ${action}`,
        },
      });
    }
  }
}

// Shared inventory revert logic
async function revertInventoryForItems(
  prisma: any,
  invoiceRef: string,
  oldItems: Array<{ itemId?: string | null; quantity: number }>,
  dbItemMap: Map<string, any>,
  action: 'update' | 'delete',
) {
  for (const oldItem of oldItems) {
    if (!oldItem.itemId || !dbItemMap.has(oldItem.itemId)) continue;
    const dbItem = dbItemMap.get(oldItem.itemId)!;
    const suffix = action === 'update' ? ' Update (Revert)' : ' (Deleted)';

    if (dbItem.itemType === 'composite' && dbItem.compositeOf?.length > 0) {
      for (const ing of dbItem.compositeOf) {
        if (ing.ingredient?.trackStock) {
          const revertQty = ing.quantity * oldItem.quantity;
          await prisma.item.update({
            where: { id: ing.ingredientItemId },
            data: { stockQuantity: { increment: revertQty } },
          });
          await prisma.inventoryTransaction.create({
            data: {
              itemId: ing.ingredientItemId,
              type: 'ADJUST',
              quantity: revertQty,
              reference: `Invoice ${invoiceRef}${suffix}`,
              remarks: `Reverting previous sale quantity for ${dbItem.name}`,
            },
          });
        }
      }
    } else if (dbItem.trackStock) {
      await prisma.item.update({
        where: { id: oldItem.itemId },
        data: { stockQuantity: { increment: oldItem.quantity } },
      });
      await prisma.inventoryTransaction.create({
        data: {
          itemId: oldItem.itemId,
          type: 'ADJUST',
          quantity: oldItem.quantity,
          reference: `Invoice ${invoiceRef}${suffix}`,
          remarks: action === 'update'
            ? 'Reverting previous sale quantity'
            : 'Reverting sale quantity due to deletion',
        },
      });
    }
  }
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(cursor?: string, limit: number = 50, search?: string) {
    // Build server-side search filter so the DB does the work, not the client
    const where: Prisma.InvoiceWhereInput = search
      ? {
          OR: [
            { invoiceNum: { contains: search, mode: 'insensitive' } },
            { guestName:  { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const data = await this.prisma.invoice.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy: [
        { invoiceDate: 'desc' },
        { id: 'desc' }
      ],
      include: {
        items: true
      }
    });

    const nextCursor = data.length === limit ? data[data.length - 1].id : null;
    return { data, nextCursor };
  }

  async getSummary() {
    // Single aggregated query for the dashboard — no full record fetching
    const [unpaid, partial, paid] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { status: 'Unpaid' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'Partial' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'Paid' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      unpaid:  { count: unpaid._count.id,  total: round2(unpaid._sum.totalAmount  || 0) },
      partial: { count: partial._count.id, total: round2(partial._sum.totalAmount || 0) },
      paid:    { count: paid._count.id,    total: round2(paid._sum.totalAmount    || 0) },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async create(data: any) {
    if (!data.invoiceNum) {
      throw new BadRequestException('Invoice number is required');
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNum: data.invoiceNum,
            guestName: data.guestName,
            guestPhone: data.guestPhone,
            guestEmail: data.guestEmail,
            guestAddress: data.guestAddress,
            guestTinVat: data.guestTinVat,
            notes: data.notes,
            status: data.status || (data.isDraft ? 'Unpaid' : 'Paid'),
            currency: data.currency || 'USD',
            roundOff: round2(data.roundOff),
            globalDiscount: round2(data.globalDiscount),
            totalAmount: round2(data.totalAmount),
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
            isDraft: data.isDraft || false,
            businessSource: data.businessSource,
            items: {
              create: data.items.map((item: any) => ({
                itemId: item.itemId,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 1,
                unitPrice: round2(item.unitPrice),
                discountType: item.discountType,
                discountValue: item.discountValue ? round2(item.discountValue) : null,
                taxIds: item.taxIds,
                netAmount: item.netAmount ? round2(item.netAmount) : null,
                scAmount: item.scAmount ? round2(item.scAmount) : null,
                vatAmount: item.vatAmount ? round2(item.vatAmount) : null,
                otherTaxAmount: item.otherTaxAmount ? round2(item.otherTaxAmount) : null,
                total: round2(item.total)
              }))
            }
          },
          include: { items: true }
        });

        // --- FIX: Single batch query for all item inventory data ---
        const itemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
        if (itemIds.length > 0) {
          const dbItems = await prisma.item.findMany({
            where: { id: { in: itemIds } },
            include: { compositeOf: { include: { ingredient: true } } },
          });
          const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
          await deductInventoryForItems(prisma, invoice.invoiceNum, data.items, dbItemMap, 'create');
        }

        return invoice;
      });

      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Invoice number ${data.invoiceNum} already exists.`);
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // --- FIX: Batch-fetch OLD and NEW item data in parallel ---
        const oldItems = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
        const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);
        const newItemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
        const allItemIds = [...new Set([...oldItemIds, ...newItemIds])];

        // One query covers both old revert and new deduction lookups
        const dbItems = allItemIds.length > 0
          ? await prisma.item.findMany({
              where: { id: { in: allItemIds } },
              include: { compositeOf: { include: { ingredient: true } } },
            })
          : [];
        const dbItemMap = new Map(dbItems.map(i => [i.id, i]));

        // Revert old stock
        if (oldItemIds.length > 0) {
          await revertInventoryForItems(prisma, id, oldItems, dbItemMap, 'update');
        }

        // Delete existing items
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

        // Update invoice and recreate items
        const invoice = await prisma.invoice.update({
          where: { id },
          data: {
            invoiceNum: data.invoiceNum,
            guestName: data.guestName,
            guestPhone: data.guestPhone,
            guestEmail: data.guestEmail,
            guestAddress: data.guestAddress,
            guestTinVat: data.guestTinVat,
            notes: data.notes,
            status: data.status || (data.isDraft ? 'Unpaid' : 'Paid'),
            currency: data.currency || 'USD',
            roundOff: round2(data.roundOff),
            globalDiscount: round2(data.globalDiscount),
            totalAmount: round2(data.totalAmount),
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
            isDraft: data.isDraft || false,
            businessSource: data.businessSource,
            items: {
              create: data.items.map((item: any) => ({
                itemId: item.itemId,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 1,
                unitPrice: round2(item.unitPrice),
                discountType: item.discountType,
                discountValue: item.discountValue ? round2(item.discountValue) : null,
                taxIds: item.taxIds,
                netAmount: item.netAmount ? round2(item.netAmount) : null,
                scAmount: item.scAmount ? round2(item.scAmount) : null,
                vatAmount: item.vatAmount ? round2(item.vatAmount) : null,
                otherTaxAmount: item.otherTaxAmount ? round2(item.otherTaxAmount) : null,
                total: round2(item.total)
              }))
            }
          },
          include: { items: true }
        });

        // Deduct new stock (reuse same dbItemMap)
        if (newItemIds.length > 0) {
          await deductInventoryForItems(prisma, invoice.invoiceNum, data.items, dbItemMap, 'update');
        }

        return invoice;
      });

      return result;
    } catch (error: any) {
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Fetch all settlements to reverse their balances
      const settlements = await prisma.invoiceSettlement.findMany({
        where: { invoiceId: id }
      });

      // 2. Reverse each settlement from the respective account balance
      for (const settlement of settlements) {
        const balanceChange = round2((settlement.amount * settlement.exchangeRate) - settlement.cardChargeAmount);
        await prisma.account.update({
          where: { id: settlement.accountId },
          data: { balance: { decrement: balanceChange } }
        });
      }

      // 3. Batch-fetch items for inventory revert
      const oldItems = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
      const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);

      if (oldItemIds.length > 0) {
        const dbItems = await prisma.item.findMany({
          where: { id: { in: oldItemIds } },
          include: { compositeOf: { include: { ingredient: true } } },
        });
        const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
        await revertInventoryForItems(prisma, id, oldItems, dbItemMap, 'delete');
      }

      // 4. Delete the invoice (cascade will handle deleting the settlement rows)
      return prisma.invoice.delete({ where: { id } });
    });
  }

  // --- Settlements ---

  async getSettlements(invoiceId: string) {
    return this.prisma.invoiceSettlement.findMany({
      where: { invoiceId },
      include: { account: true },
      orderBy: { paidDate: 'desc' },
    });
  }

  async recordSettlement(invoiceId: string, data: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { settlements: true }
    });
    
    if (!invoice) throw new NotFoundException('Invoice not found');

    const amount = parseFloat(data.amount);
    const cardChargeAmount = data.cardChargeAmount ? parseFloat(data.cardChargeAmount) : 0.0;
    
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Invalid settlement amount');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Create settlement
      const invoiceAmount = round2(data.amount);
      const cardCharge = round2(data.cardChargeAmount || 0);
      
      const settlement = await prisma.invoiceSettlement.create({
        data: {
          invoiceId,
          accountId: data.accountId,
          amount: invoiceAmount,
          exchangeRate: data.exchangeRate || 1.0,
          cardChargeAmount: cardCharge,
          note: data.note,
          paidDate: data.paidDate ? new Date(data.paidDate) : new Date(),
        }
      });

      // 2. Update Invoice Status
      const allSettlements = await prisma.invoiceSettlement.findMany({
        where: { invoiceId }
      });
      const totalPaid = allSettlements.reduce((sum, s) => sum + s.amount, 0);
      
      let newStatus = invoice.status;
      if (totalPaid >= invoice.totalAmount - 0.01) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      // 3. Update Account Balance
      const balanceChange = round2((data.amount * (data.exchangeRate || 1.0)) - cardCharge);
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceChange } }
      });

      return settlement;
    });
  }

  async deleteSettlement(id: string) {
    const settlement = await this.prisma.invoiceSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    return this.prisma.$transaction(async (prisma) => {
      // 1. Delete settlement
      await prisma.invoiceSettlement.delete({ where: { id } });

      // 2. Re-evaluate Invoice Status
      const invoice = await prisma.invoice.findUnique({ where: { id: settlement.invoiceId } });
      const remainingSettlements = await prisma.invoiceSettlement.findMany({
        where: { invoiceId: settlement.invoiceId }
      });
      const totalPaid = remainingSettlements.reduce((sum, s) => sum + s.amount, 0);

      let newStatus = invoice!.status;
      if (totalPaid <= 0) {
        newStatus = 'Unpaid';
      } else if (totalPaid >= invoice!.totalAmount - 0.01) {
        newStatus = 'Paid';
      } else {
        newStatus = 'Partial';
      }

      await prisma.invoice.update({
        where: { id: settlement.invoiceId },
        data: { status: newStatus }
      });

      // 3. Revert Account Balance
      const balanceChange = round2((settlement.amount * settlement.exchangeRate) - settlement.cardChargeAmount);
      await prisma.account.update({
        where: { id: settlement.accountId },
        data: { balance: { decrement: balanceChange } }
      });

      return { success: true };
    });
  }
}
