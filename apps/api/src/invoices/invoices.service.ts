import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const round2 = (val: any) => Number((parseFloat(val) || 0).toFixed(2));

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(cursor?: string, limit: number = 50) {
    const data = await this.prisma.invoice.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
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
      // Use a transaction to ensure both invoice and items are created atomically
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
            
            // Nested create for items
            items: {
              create: data.items.map((item: any) => ({
                itemId: item.itemId,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 1, // Keep quantity float for things like 1.5 kg
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
        
        // Update inventory stock for items
        const itemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
        if (itemIds.length > 0) {
          const dbItems = await prisma.item.findMany({ 
            where: { id: { in: itemIds } },
            include: { compositeOf: { include: { ingredient: true } } } 
          });
          const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
          
          for (const item of data.items) {
            if (item.itemId && dbItemMap.has(item.itemId)) {
              const dbItem = dbItemMap.get(item.itemId)!;
              const qty = parseFloat(item.quantity) || 1;
              
              if (dbItem.itemType === 'composite' && dbItem.compositeOf && dbItem.compositeOf.length > 0) {
                // Deduct ingredients
                for (const ing of dbItem.compositeOf) {
                  if (ing.ingredient?.trackStock) {
                    const deductionQty = ing.quantity * qty;
                    await prisma.item.update({
                      where: { id: ing.ingredientItemId },
                      data: { stockQuantity: { decrement: deductionQty } }
                    });
                    await prisma.inventoryTransaction.create({
                      data: {
                        itemId: ing.ingredientItemId,
                        type: 'OUT',
                        quantity: deductionQty,
                        reference: `Invoice ${invoice.invoiceNum}`,
                        remarks: `Used in ${dbItem.name} (Invoice creation)`
                      }
                    });
                  }
                }
              } else if (dbItem.trackStock) {
                // Deduct item itself
                await prisma.item.update({
                  where: { id: item.itemId },
                  data: { stockQuantity: { decrement: qty } }
                });
                await prisma.inventoryTransaction.create({
                  data: {
                    itemId: item.itemId,
                    type: 'OUT',
                    quantity: qty,
                    reference: `Invoice ${invoice.invoiceNum}`,
                    remarks: `Invoice creation`
                  }
                });
              }
            }
          }
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
        // Revert old stock quantities
        const oldItems = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
        const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);
        
        if (oldItemIds.length > 0) {
          const dbItems = await prisma.item.findMany({ 
            where: { id: { in: oldItemIds } },
            include: { compositeOf: { include: { ingredient: true } } }
          });
          const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
          
          for (const oldItem of oldItems) {
            if (oldItem.itemId && dbItemMap.has(oldItem.itemId)) {
              const dbItem = dbItemMap.get(oldItem.itemId)!;
              
              if (dbItem.itemType === 'composite' && dbItem.compositeOf && dbItem.compositeOf.length > 0) {
                // Revert ingredients
                for (const ing of dbItem.compositeOf) {
                  if (ing.ingredient?.trackStock) {
                    const revertQty = ing.quantity * oldItem.quantity;
                    await prisma.item.update({
                      where: { id: ing.ingredientItemId },
                      data: { stockQuantity: { increment: revertQty } }
                    });
                    await prisma.inventoryTransaction.create({
                      data: {
                        itemId: ing.ingredientItemId,
                        type: 'ADJUST',
                        quantity: revertQty,
                        reference: `Invoice ${id} Update (Revert)`,
                        remarks: `Reverting previous sale quantity for ${dbItem.name}`
                      }
                    });
                  }
                }
              } else if (dbItem.trackStock) {
                // Revert item itself
                await prisma.item.update({
                  where: { id: oldItem.itemId },
                  data: { stockQuantity: { increment: oldItem.quantity } }
                });
                await prisma.inventoryTransaction.create({
                  data: {
                    itemId: oldItem.itemId,
                    type: 'ADJUST',
                    quantity: oldItem.quantity,
                    reference: `Invoice ${id} Update (Revert)`,
                    remarks: `Reverting previous sale quantity`
                  }
                });
              }
            }
          }
        }

        // Delete existing items
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: id }
        });

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
            
            // Nested create for new items
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
        
        // Update inventory stock for new items
        const itemIds = data.items.filter((i: any) => i.itemId).map((i: any) => i.itemId);
        if (itemIds.length > 0) {
          const dbItems = await prisma.item.findMany({ 
            where: { id: { in: itemIds } },
            include: { compositeOf: { include: { ingredient: true } } }
          });
          const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
          
          for (const item of data.items) {
            if (item.itemId && dbItemMap.has(item.itemId)) {
              const dbItem = dbItemMap.get(item.itemId)!;
              const qty = parseFloat(item.quantity) || 1;
              
              if (dbItem.itemType === 'composite' && dbItem.compositeOf && dbItem.compositeOf.length > 0) {
                // Deduct ingredients
                for (const ing of dbItem.compositeOf) {
                  if (ing.ingredient?.trackStock) {
                    const deductionQty = ing.quantity * qty;
                    await prisma.item.update({
                      where: { id: ing.ingredientItemId },
                      data: { stockQuantity: { decrement: deductionQty } }
                    });
                    await prisma.inventoryTransaction.create({
                      data: {
                        itemId: ing.ingredientItemId,
                        type: 'OUT',
                        quantity: deductionQty,
                        reference: `Invoice ${invoice.invoiceNum} (Updated)`,
                        remarks: `Used in ${dbItem.name} (Invoice update)`
                      }
                    });
                  }
                }
              } else if (dbItem.trackStock) {
                // Deduct item itself
                await prisma.item.update({
                  where: { id: item.itemId },
                  data: { stockQuantity: { decrement: qty } }
                });
                await prisma.inventoryTransaction.create({
                  data: {
                    itemId: item.itemId,
                    type: 'OUT',
                    quantity: qty,
                    reference: `Invoice ${invoice.invoiceNum} (Updated)`,
                    remarks: `Invoice update`
                  }
                });
              }
            }
          }
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

      // Revert stock quantities
      const oldItems = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
      const oldItemIds = oldItems.filter(i => i.itemId).map(i => i.itemId as string);
      
      if (oldItemIds.length > 0) {
        const dbItems = await prisma.item.findMany({ 
          where: { id: { in: oldItemIds } },
          include: { compositeOf: { include: { ingredient: true } } }
        });
        const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
        
        for (const oldItem of oldItems) {
          if (oldItem.itemId && dbItemMap.has(oldItem.itemId)) {
            const dbItem = dbItemMap.get(oldItem.itemId)!;
            
            if (dbItem.itemType === 'composite' && dbItem.compositeOf && dbItem.compositeOf.length > 0) {
              // Revert ingredients
              for (const ing of dbItem.compositeOf) {
                if (ing.ingredient?.trackStock) {
                  const revertQty = ing.quantity * oldItem.quantity;
                  await prisma.item.update({
                    where: { id: ing.ingredientItemId },
                    data: { stockQuantity: { increment: revertQty } }
                  });
                  await prisma.inventoryTransaction.create({
                    data: {
                      itemId: ing.ingredientItemId,
                      type: 'ADJUST',
                      quantity: revertQty,
                      reference: `Invoice ${id} (Deleted)`,
                      remarks: `Reverting sale quantity for ${dbItem.name}`
                    }
                  });
                }
              }
            } else if (dbItem.trackStock) {
              // Revert item itself
              await prisma.item.update({
                where: { id: oldItem.itemId },
                data: { stockQuantity: { increment: oldItem.quantity } }
              });
              await prisma.inventoryTransaction.create({
                data: {
                  itemId: oldItem.itemId,
                  type: 'ADJUST',
                  quantity: oldItem.quantity,
                  reference: `Invoice ${id} (Deleted)`,
                  remarks: `Reverting sale quantity due to deletion`
                }
              });
            }
          }
        }
      }

      // 3. Delete the invoice (cascade will handle deleting the settlement rows)
      return prisma.invoice.delete({
        where: { id }
      });
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
    const exchangeRate = data.exchangeRate ? parseFloat(data.exchangeRate) : 1.0;
    const cardChargeAmount = data.cardChargeAmount ? parseFloat(data.cardChargeAmount) : 0.0;
    
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Invalid settlement amount');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Create settlement
      const invoiceAmount = round2(data.amount);
      const cardChargeAmount = round2(data.cardChargeAmount || 0);
      
      const settlement = await prisma.invoiceSettlement.create({
        data: {
          invoiceId,
          accountId: data.accountId,
          amount: invoiceAmount,
          exchangeRate: data.exchangeRate || 1.0,
          cardChargeAmount: cardChargeAmount,
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
      // Round to 2 decimals to avoid floating point issues
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
      // The account receives (amount * exchangeRate) - cardChargeAmount
      const balanceChange = round2((data.amount * (data.exchangeRate || 1.0)) - cardChargeAmount);
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
        newStatus = 'Unpaid'; // Or stay Draft if it was draft, but let's assume Unpaid
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
